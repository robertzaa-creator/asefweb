#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
asef_validate_paths.py — ASEF Validator + Fixer
-----------------------------------------------
Valida y opcionalmente corrige rutas en HTML y CSS del proyecto ASEF.

Funciones:
✅ Analiza todos los href, src y url(...)
✅ Clasifica rutas como Correctas (/asefweb/...), Externas o Incorrectas
✅ Muestra resumen en consola y genera report_paths.txt
✅ Con --fix corrige rutas incorrectas a /asefweb/...
"""

import re, shutil, argparse
from pathlib import Path

BASE = "/asefweb/"
TARGET_DIRS = ("css", "js", "img", "dist", "assets")
EXCLUDE_DIRS = {".git", "node_modules", ".vite", "dist", ".cache", "coverage", ".github"}

# Regex HTML y CSS
RE_HTML = re.compile(r'\b(?:src|href)\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
RE_CSS = re.compile(r'url\((["\']?)([^)"\']+)\1\)', re.IGNORECASE)

# Detectores
def is_external(path: str) -> bool:
    return path.startswith(("http://", "https://", "mailto:", "tel:", "#"))

def is_correct(path: str) -> bool:
    return path.startswith(BASE)

def looks_local(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in ("./", "../", "/")) or any(path.startswith(td + "/") for td in TARGET_DIRS)

def fix_path(path: str) -> str:
    """Convierte ruta a /asefweb/... si apunta a carpeta conocida."""
    for td in TARGET_DIRS:
        m = re.search(r'(?:\.{0,2}/)*(' + td + r'/.*)', path)
        if m:
            return BASE + m.group(1).lstrip("/")
    return path  # deja igual si no aplica

def process_file(path: Path, fix=False):
    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines()
    corrected = 0
    incorrects = []

    def handle_match(m, line_no):
        url = m.group(1 if path.suffix.lower() == ".css" else 1)
        if is_external(url):
            return "external", url
        if is_correct(url):
            return "correct", url
        if looks_local(url):
            incorrects.append((line_no, url))
            if fix:
                new = fix_path(url)
                return "fixed", new
            return "incorrect", url
        return "external", url

    results = {"correct": 0, "incorrect": 0, "external": 0, "fixed": 0}
    new_lines = []

    for i, line in enumerate(lines, start=1):
        new_line = line
        pattern = RE_CSS if path.suffix.lower() == ".css" else RE_HTML
        for match in pattern.finditer(line):
            status, new_url = handle_match(match, i)
            results[status] = results.get(status, 0) + 1
            if fix and status == "fixed":
                new_line = new_line.replace(match.group(0), match.group(0).replace(match.group(1), new_url))
                corrected += 1
        new_lines.append(new_line)

    if fix and corrected:
        bak = path.with_suffix(path.suffix + ".bak")
        if not bak.exists():
            shutil.copy2(path, bak)
        path.write_text("\n".join(new_lines), encoding="utf-8")

    return results, incorrects

def iter_files(root: Path):
    for p in root.rglob("*"):
        if p.suffix.lower() not in (".html", ".css"):
            continue
        if set(p.parts) & EXCLUDE_DIRS:
            continue
        yield p

def main():
    ap = argparse.ArgumentParser(description="Valida rutas en HTML/CSS y corrige si se usa --fix.")
    ap.add_argument("--root", default=".", help="Carpeta raíz del proyecto")
    ap.add_argument("--fix", action="store_true", help="Corrige rutas incorrectas a /asefweb/...")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    files = list(iter_files(root))
    if not files:
        print("No se encontraron archivos HTML o CSS en", root)
        return

    global_summary = {"correct":0,"incorrect":0,"external":0,"fixed":0}
    report_lines = []
    bad_files = []

    for f in files:
        res, bad = process_file(f, fix=args.fix)
        for k,v in res.items():
            global_summary[k] = global_summary.get(k,0)+v
        if bad:
            bad_files.append(f.name)
            report_lines.append(f"\n⚠ Archivo: {f}\n")
            for line_no,url in bad:
                report_lines.append(f"  Línea {line_no}: {url}")

    report_text = "\n".join(report_lines) if report_lines else "✅ No se encontraron rutas incorrectas."

    (root / "report_paths.txt").write_text(report_text, encoding="utf-8")

    print("\n===== RESUMEN ASEF VALIDACIÓN =====")
    total = sum(global_summary.values())
    for k,v in global_summary.items():
        print(f"{k.capitalize():<10}: {v}")
    print(f"Total analizado: {total}")
    if bad_files:
        print("\nArchivos con rutas incorrectas:")
        for name in bad_files:
            print(f"  - {name}")
    print("\nReporte completo guardado en: report_paths.txt")
    print("✔ Finalizado.")

if __name__ == "__main__":
    main()
