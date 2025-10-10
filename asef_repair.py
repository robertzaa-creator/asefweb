#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
asef_repair.py — ASEF Web Fixer
--------------------------------
Combina los dos scripts anteriores:
  • Corrige rutas estáticas absolutas (/css/, /js/, /img/, etc.) → ./css/, ./js/, ./img/
  • Inserta <base> dinámico (local vs GitHub Pages /asefweb/)
  • Asegura rel="noopener noreferrer" en <a target="_blank">
  • Crea backups .bak y permite revertir.

Uso:
  python asef_repair.py
  python asef_repair.py --dry-run
  python asef_repair.py --revert
"""

import re, shutil, argparse
from pathlib import Path

# --- CONFIGURACIÓN ---
GH_BASE = "/asefweb/"
TARGET_DIRS = ("css", "js", "img", "dist", "assets")
EXCLUDE_DIRS = {".git", "node_modules", "dist", ".vite", ".cache", "coverage", ".github"}

MARKER_ID = "asef-base-fix"
MARK_OPEN = "<!-- ASEF_BASE_FIX START -->"
MARK_CLOSE = "<!-- ASEF_BASE_FIX END -->"

# --- SNIPPET DE BASE DINÁMICO ---
SNIPPET = ("""
{MARK_OPEN}
<script id="{MARKER_ID}">
(function() {{
  try {{
    var GH_BASE = "{GH_BASE}".replace(/\/+$/, "/");
    var isLocal = (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.protocol === "file:");
    var baseHref = isLocal ? "/" : GH_BASE;

    document.querySelectorAll("base").forEach(function(b){{b.remove();}});

    if(!document.head){{document.documentElement.insertBefore(document.createElement("head"), document.body);}}
    var head=document.head;
    var base=document.createElement("base");
    base.setAttribute("href", baseHref);
    head.prepend(base);

    var rootPrefix = isLocal ? "" : GH_BASE.replace(/\/$/, "");
    if(!String.prototype.startswith){{String.prototype.startswith=function(s){{return this.slice(0,s.length)===s;}};}}

    function fixAttr(sel,attr){{
      document.querySelectorAll(sel).forEach(function(el){{
        var v=el.getAttribute(attr);if(!v)return;
        if(/^(https?:|mailto:|tel:|data:|#)/i.test(v))return;
        if(v[0]==="/")el.setAttribute(attr,rootPrefix+v);
      }});
    }}
    fixAttr('link[href]','href');
    fixAttr('script[src]','src');
    fixAttr('img[src]','src');
    fixAttr('source[src]','src');
    fixAttr('a[href]','href');
  }}catch(e){{console.warn("ASEF base-fix error:",e);}}
}})();
</script>
{MARK_CLOSE}
""").strip().format(MARK_OPEN=MARK_OPEN, MARK_CLOSE=MARK_CLOSE, MARKER_ID=MARKER_ID, GH_BASE=GH_BASE)

# --- REGEX ---
RE_ABS_PATH = re.compile(r'(?P<attr>\b(?:src|href)\s*=\s*["\'])(?P<path>\/(?:' + "|".join(TARGET_DIRS) + r')\/[^"\']+)["\']', re.IGNORECASE)
RE_BASE = re.compile(r"<\s*base\b[^>]*>", re.IGNORECASE)
RE_HEAD_OPEN = re.compile(r"<\s*head\b[^>]*>", re.IGNORECASE)
RE_MARKER = re.compile(r'id\s*=\s*["\']{}["\']'.format(MARKER_ID), re.IGNORECASE)
RE_BLOCK = re.compile(re.escape(MARK_OPEN) + r".*?" + re.escape(MARK_CLOSE), re.IGNORECASE | re.DOTALL)

# --- FUNCIONES ---
def fix_blank_rel(txt: str) -> str:
    """Agrega rel seguro a enlaces con target=_blank."""
    return re.sub(
        r'(<a\b[^>]*\btarget=["\']?_blank["\']?[^>]*)(>)',
        lambda m: (m.group(1) if re.search(r'\brel\s*=\s*["\'][^"\']*noopener', m.group(0), re.IGNORECASE)
                   else m.group(1).rstrip() + ' rel="noopener noreferrer"') + m.group(2),
        txt, flags=re.IGNORECASE
    )

def fix_static_paths(txt: str) -> str:
    """Convierte rutas absolutas /css/, /js/, /img/ → ./css/, etc."""
    return RE_ABS_PATH.sub(lambda m: f'{m.group("attr")}./{m.group("path").lstrip("/")}"', txt)

def patch_html(path: Path, dry_run=False):
    raw = path.read_text(encoding="utf-8", errors="ignore")

    # Paso 1: limpiar bloques antiguos y bases duplicadas
    txt = RE_BLOCK.sub("", raw)
    txt = RE_BASE.sub("", txt)

    # Paso 2: arreglar rutas estáticas
    txt2 = fix_static_paths(txt)

    # Paso 3: agregar snippet de base dinámico
    snippet = SNIPPET
    if RE_HEAD_OPEN.search(txt2):
        txt2 = RE_HEAD_OPEN.sub(lambda m: m.group(0) + "\n" + snippet + "\n", txt2, count=1)
    else:
        txt2 = "<head>\n" + snippet + "\n</head>\n" + txt2

    # Paso 4: asegurar rel seguro
    txt2 = fix_blank_rel(txt2)

    if txt2 == raw:
        return "no-change"
    if dry_run:
        return "would-patch"

    bak = path.with_suffix(path.suffix + ".bak")
    if not bak.exists():
        shutil.copy2(path, bak)
    path.write_text(txt2, encoding="utf-8")
    return "patched"

def revert_html(path: Path, dry_run=False):
    bak = path.with_suffix(path.suffix + ".bak")
    if not bak.exists():
        return "no-backup"
    if dry_run:
        return "would-revert"
    shutil.copy2(bak, path)
    return "reverted"

def iter_html(root: Path):
    for p in root.rglob("*.html"):
        if set(p.parts) & EXCLUDE_DIRS:
            continue
        yield p

def main():
    ap = argparse.ArgumentParser(description="Repara rutas, base dinámico y seguridad de links para ASEF (GitHub Pages).")
    ap.add_argument("--root", default=".", help="Carpeta raíz del proyecto")
    ap.add_argument("--dry-run", action="store_true", help="Simula sin escribir")
    ap.add_argument("--revert", action="store_true", help="Revierte cambios desde backups .bak")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    files = list(iter_html(root))
    if not files:
        print("No se encontraron .html en", root)
        return

    summary = {}
    for fp in files:
        res = revert_html(fp, args.dry_run) if args.revert else patch_html(fp, args.dry_run)
        summary[res] = summary.get(res, 0) + 1

    print("Resumen:", summary)
    print("✔ ASEF Repair finalizado. Hacé commit & push y probá en GitHub Pages.")

if __name__ == "__main__":
    main()
