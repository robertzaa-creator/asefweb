#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_paths_asef.py — ASEF
------------------------
Corrige de forma conservadora las páginas para que funcionen igual en localhost (/) y en GitHub Pages (/asefweb/).
Además, endurece pequeños detalles de seguridad de los enlaces.

Cambia:
- Elimina <base> duplicados y agrega un snippet con <base> dinámico (una sola vez por archivo).
- Ajusta en runtime rutas root-absolute (empiezan con "/") en link/script/img/source/a → se prefijan con /asefweb en producción.
- Añade rel="noopener noreferrer" a <a target="_blank"> sin rel seguro.
- Crea .bak por cada HTML modificado y permite revertir.

Uso:
  python fix_paths_asef.py --root . --gh-base /asefweb/
  python fix_paths_asef.py --dry-run
  python fix_paths_asef.py --revert
"""

from __future__ import annotations
import argparse, os, re, sys, shutil
from pathlib import Path

MARKER_ID = "asef-base-fix"
MARK_OPEN = "<!-- ASEF_BASE_FIX START -->"
MARK_CLOSE = "<!-- ASEF_BASE_FIX END -->"

EXCLUDE_DIRS = {".git", "node_modules", "dist", ".vite", ".cache", "coverage", ".github"}

SNIPPET = ("""
{MARK_OPEN}
<script id="{MARKER_ID}">
(function() {{
  try {{
    var GH_BASE = "{GH_BASE}".replace(/\/+$/, "/");
    var isLocal = (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.protocol === "file:");
    var baseHref = isLocal ? "/" : GH_BASE;

    // limpia <base> existentes (por si el HTML trae varios)
    try {{
      document.querySelectorAll("base").forEach(function(b) {{ b.parentNode && b.parentNode.removeChild(b); }});
    }} catch (e) {{ /* noop */ }}

    // garantiza <head> y agrega <base> al principio
    var ensureHead = function() {{
      if (!document.head) {{
        var h = document.createElement("head");
        document.documentElement.insertBefore(h, document.body || null);
      }}
      return document.head;
    }};
    var head = ensureHead();
    var base = document.createElement("base");
    base.setAttribute("href", baseHref);
    head.prepend(base);

    var rootPrefix = isLocal ? "" : GH_BASE.replace(/\/$/, "");

    // pequeño polyfill
    if (!String.prototype.startswith) {{
      String.prototype.startswith = function(s) {{ return this.slice(0, s.length) === s; }}
    }}

    function fixAttr(selector, attr) {{
      document.querySelectorAll(selector).forEach(function(el) {{
        var val = el.getAttribute(attr);
        if (!val) return;
        var v = String(val);
        if (/^(https?:)?\/\//i.test(v)) return; // absoluto o protocol-relative
        if (/^(mailto:|tel:|data:|#)/i.test(v)) return;
        if (v[0] === "/") {{ el.setAttribute(attr, rootPrefix + v); }}
      }});
    }}

    fixAttr('link[href]', 'href');
    fixAttr('script[src]', 'src');
    fixAttr('img[src]', 'src');
    fixAttr('source[src]', 'src');
    fixAttr('a[href]', 'href');
  }} catch (err) {{
    console && console.warn && console.warn("ASEF base-fix error:", err);
  }}
}})();
</script>
{MARK_CLOSE}
""").strip().format(MARK_OPEN=MARK_OPEN, MARK_CLOSE=MARK_CLOSE, MARKER_ID=MARKER_ID, GH_BASE="{GH_BASE}")

RE_BASE = re.compile(r"<\s*base\b[^>]*>", re.IGNORECASE)
RE_HEAD_OPEN = re.compile(r"<\s*head\b[^>]*>", re.IGNORECASE)
RE_MARKER = re.compile(r'id\s*=\s*["\']{}["\']'.format(MARKER_ID), re.IGNORECASE)
RE_BLOCK = re.compile(re.escape(MARK_OPEN) + r".*?" + re.escape(MARK_CLOSE), re.IGNORECASE | re.DOTALL)

def iter_html(root: Path):
    for p in root.rglob("*.html"):
        if set(p.parts) & EXCLUDE_DIRS:
            continue
        yield p

def patch_html(path: Path, gh_base: str, dry_run=False):
    raw = path.read_text(encoding="utf-8", errors="ignore")

    # añadir rel seguro a los _blank sin rel
    def fix_blank_rel(txt: str) -> str:
        return re.sub(
            r'(<a\b[^>]*\btarget=["\']?_blank["\']?[^>]*)(>)',
            lambda m: (m.group(1) if re.search(r'\brel\s*=\s*["\'][^"\']*noopener', m.group(0), re.IGNORECASE) else
                       m.group(1).rstrip() + ' rel="noopener noreferrer"') + m.group(2),
            txt,
            flags=re.IGNORECASE
        )

    # evitar duplicados previos del bloque y <base>
    txt = RE_BLOCK.sub("", raw)
    txt = RE_BASE.sub("", txt)

    # insertar snippet
    snippet = SNIPPET.replace("{GH_BASE}", gh_base)
    if RE_HEAD_OPEN.search(txt):
        txt2 = RE_HEAD_OPEN.sub(lambda m: m.group(0) + "\n" + snippet + "\n", txt, count=1)
    else:
        txt2 = "<head>\n" + snippet + "\n</head>\n" + txt

    # seguridad de target=_blank
    txt2 = fix_blank_rel(txt2)

    if dry_run:
        return "would-patch"
    # backup
    bak = path.with_suffix(path.suffix + ".bak")
    if not bak.exists():
        shutil.copy2(str(path), str(bak))
    path.write_text(txt2, encoding="utf-8")
    return "patched"

def revert_html(path: Path, dry_run=False):
    bak = path.with_suffix(path.suffix + ".bak")
    if not bak.exists():
        return "no-backup"
    if dry_run:
        return "would-revert"
    shutil.copy2(str(bak), str(path))
    return "reverted"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="Carpeta raíz (default .)")
    ap.add_argument("--gh-base", default="/asefweb/", help="Base para GitHub Pages")
    ap.add_argument("--dry-run", action="store_true", help="No escribe cambios")
    ap.add_argument("--revert", action="store_true", help="Restaura desde .bak")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    files = list(iter_html(root))
    if not files:
        print("No se encontraron .html en", root)
        return

    summary = {}
    for fp in files:
        res = revert_html(fp, args.dry_run) if args.revert else patch_html(fp, args.gh_base, args.dry_run)
        summary[res] = summary.get(res, 0) + 1

    print("Resumen:", summary)
    if not args.revert:
        print("✔ Listo. Hacé commit & push y probá en GitHub Pages.")

if __name__ == "__main__":
    main()
