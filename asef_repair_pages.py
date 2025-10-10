#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
asef_repair_pages.py — ASEF Web Fixer (GitHub Pages absolute paths)
--------------------------------------------------------------------
Corrige rutas de recursos estáticos en subcarpetas para que funcionen
en GitHub Pages usando rutas absolutas con base /asefweb/.

Convierte:
  ./css/... , ../css/... , /css/...  →  /asefweb/css/...
  (lo mismo para js, img, dist, assets)

Crea backups .bak, es reversible y no altera estilos ni estructuras.
"""

import re, shutil, argparse
from pathlib import Path

# Base del sitio en GitHub Pages
BASE = "/asefweb/"
TARGET_DIRS = ("css", "js", "img", "dist", "assets")
EXCLUDE_DIRS = {".git", "node_modules", "dist", ".vite", ".cache", "coverage", ".github"}

# Regex que detecta rutas a reemplazar
RE_PATH = re.compile(
    r'(?P<attr>\b(?:src|href)\s*=\s*["\'])(?:\.{0,2}/)*(?:' + "|".join(TARGET_DIRS) + r')/(?P<rest>[^"\']+)["\']',
    re.IGNORECASE,
)

def fix_paths(txt: str) -> str:
    """Reescribe las rutas a /asefweb/..."""
    return RE_PATH.sub(lambda m: f'{m.group("attr")}{BASE}{m.group("rest")}"', txt)

def patch_html(path: Path, dry_run=False):
    txt = path.read_text(encoding="utf-8", errors="ignore")
    new_txt = fix_paths(txt)
    if new_txt == txt:
        return "no-change"
    bak = path.with_suffix(path.suffix + ".bak")
    if not dry_run:
        if not bak.exists():
            shutil.copy2(path, bak)
        path.write_text(new_txt, encoding="utf-8")
    return "patched"

def revert_html(path: Path, dry_run=False):
    bak = path.with_suffix(path.suffix + ".bak")
    if not bak.exists():
        return "no-backup"
    if not dry_run:
        shutil.copy2(bak, path)
    return "reverted"

def iter_html(root: Path):
    for p in root.rglob("*.html"):
        if set(p.parts) & EXCLUDE_DIRS:
            continue
        yield p

def main():
    ap = argparse.ArgumentParser(description="Corrige rutas rotas en subcarpetas → /asefweb/...")
    ap.add_argument("--root", default=".", help="Carpeta raíz del proyecto (default .)")
    ap.add_argument("--dry-run", action="store_true", help="Simular sin escribir")
    ap.add_argument("--revert", action="store_true", help="Revertir desde .bak")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    html_files = list(iter_html(root))
    if not html_files:
        print("No se encontraron archivos HTML en", root)
        return

    summary = {}
    for fp in html_files:
        res = revert_html(fp, args.dry_run) if args.revert else patch_html(fp, args.dry_run)
        summary[res] = summary.get(res, 0) + 1

    print("Resumen:", summary)
    print("✔ Proceso completado. Hacé commit & push y probá en GitHub Pages.")

if __name__ == "__main__":
    main()
