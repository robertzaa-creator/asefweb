# -*- coding: utf-8 -*-
"""
asef_validate_paths.py — Validador y reparador de rutas ASEF Web

✅ Escanea todos los .html y .css del proyecto
✅ Verifica que las rutas empiecen con /asefweb/ o sean válidas
✅ Clasifica en Correctas, Incorrectas y Externas
✅ Con --fix corrige automáticamente las incorrectas
✅ Genera report_paths.txt con el resumen
"""

import re
import sys
from pathlib import Path

# --- Configuración ---
BASE_PATH = "/asefweb/"
ROOT = Path(__file__).parent
TARGET_EXT = [".html", ".css"]
REPORT_FILE = ROOT / "report_paths.txt"

# --- Expresiones regulares ---
RE_SRC = re.compile(r'(src|href)=["\']([^"\']+)["\']', re.IGNORECASE)
RE_URL = re.compile(r'url\(["\']?([^)"\']+)["\']?\)', re.IGNORECASE)

# --- Clasificación ---
correct = []
incorrect = []
external = []
fixed = []


def is_external(url: str):
    return url.startswith(("http://", "https://", "mailto:", "tel:", "#", "//"))


def validate_file(path: Path, fix: bool = False):
    global correct, incorrect, external, fixed

    text = path.read_text(encoding="utf-8", errors="ignore")
    modified = False

    # Reemplaza rutas en src/href
    def replacer(m):
        nonlocal modified
        attr, url = m.groups()
        if is_external(url):
            external.append((path, url))
            return m.group(0)
        if url.startswith(BASE_PATH):
            correct.append((path, url))
            return m.group(0)
        if not url.startswith("/"):
            incorrect.append((path, url))
            if fix:
                modified = True
                new_url = f"{BASE_PATH}{url.lstrip('/')}"
                fixed.append((path, f"{url} → {new_url}"))
                return f'{attr}="{new_url}"'
        return m.group(0)

    text2 = RE_SRC.sub(replacer, text)

    # Corrige url(...) en CSS
    def css_replacer(m):
        nonlocal modified
        url = m.group(1)
        if is_external(url):
            external.append((path, url))
            return m.group(0)
        if url.startswith(BASE_PATH):
            correct.append((path, url))
            return m.group(0)
        incorrect.append((path, url))
        if fix:
            modified = True
            new_url = f"{BASE_PATH}{url.lstrip('/')}"
            fixed.append((path, f"{url} → {new_url}"))
            return f'url("{new_url}")'
        return m.group(0)

    text3 = RE_URL.sub(css_replacer, text2)

    if fix and modified:
        path.write_text(text3, encoding="utf-8")


def main():
    fix = "--fix" in sys.argv
    print("🔍 Validando rutas en HTML y CSS...\n")

    for path in ROOT.rglob("*"):
        if path.suffix.lower() in TARGET_EXT and not path.name.endswith(".bak"):
            validate_file(path, fix=fix)

    # --- Generar reporte ---
    report = []
    report.append("===== RESUMEN ASEF VALIDACIÓN =====\n")
    report.append(f"Correct   : {len(correct)}")
    report.append(f"Incorrect : {len(incorrect)}")
    report.append(f"External  : {len(external)}")
    if fix:
        report.append(f"Fixed     : {len(fixed)}")
    report.append(f"Total analizado: {len(correct)+len(incorrect)+len(external)}\n")

    if incorrect:
        report.append("Archivos con rutas incorrectas:")
        seen = set()
        for f, _ in incorrect:
            if f not in seen:
                report.append(f"  - {f.name}")
                seen.add(f)
        report.append("")

    REPORT_FILE.write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))
    print(f"Reporte completo guardado en: {REPORT_FILE}\n")
    print("✔ Finalizado.")


if __name__ == "__main__":
    main()
