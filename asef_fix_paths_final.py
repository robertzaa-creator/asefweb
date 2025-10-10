# -*- coding: utf-8 -*-
"""
asef_fix_paths_final.py — Versión definitiva
Corrige rutas locales, ignora y limpia URLs externas, y deja el proyecto listo para build + deploy.
"""

import re
from pathlib import Path

# Carpetas a analizar
TARGET_DIRS = [
    Path("."),
    Path("pages"),
    Path("pages/admin"),
    Path("pages/socios"),
    Path("pages/auth"),
]

# Expresiones regulares
RE_SCRIPT_SRC = re.compile(r'<script\s+([^>]*src=["\'])([^"\']+)["\']([^>]*)>', re.IGNORECASE)
RE_LINK_HREF = re.compile(r'href=["\']([^"\']+)["\']', re.IGNORECASE)

def fix_html(path: Path):
    text = path.read_text(encoding="utf-8")
    original = text

    # Corrige scripts <script src="...">
    def replace_js(match):
        src = match.group(2).strip()
        # Si es externo, quitar prefijos locales rotos
        if src.startswith(("http", "//")):
            src = re.sub(r"^js/+", "", src)
            return f'<script {match.group(1)}{src}"{match.group(3)}>'
        # Si es local, asegurar js/ y type="module"
        if not src.startswith("js/"):
            src = f"js/{src}"
        before, after = match.group(1), match.group(3)
        if "type=" not in before and "type=" not in after:
            before = before.replace("src", 'type="module" defer src')
        return f"<script {before}{src}\"{after}>"

    text = RE_SCRIPT_SRC.sub(replace_js, text)

    # Corrige CSS <link href="...">
    def replace_css(match):
        href = match.group(1).strip()
        # Si es externo, quitar prefijos rotos
        if href.startswith(("http", "//")):
            href = re.sub(r"^css/+", "", href)
            return f'href="{href}"'
        if not href.startswith("css/"):
            href = f"css/{href}"
        return f'href="{href}"'

    text = RE_LINK_HREF.sub(replace_css, text)

    # Limpia duplicaciones
    text = (
        text.replace("js/js/", "js/")
        .replace("css/css/", "css/")
        .replace("js/https://", "https://")
        .replace("css/https://", "https://")
    )

    # Corrige favicon roto
    text = re.sub(
        r'<link\s+[^>]*rel=["\']icon["\'][^>]*>',
        "<link rel='icon' href='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><text y=\".9em\" font-size=\"90\">🏛️</text></svg>'>",
        text,
        flags=re.IGNORECASE
    )

    if text != original:
        path.write_text(text, encoding="utf-8")
        print(f"✅ Corregido: {path}")
        return True
    return False


def main():
    changed = 0
    print("🔧 Reparando rutas ASEF (HTML + CSS + JS)...")
    for d in TARGET_DIRS:
        for html in d.rglob("*.html"):
            if fix_html(html):
                changed += 1
    print(f"\n📄 Archivos modificados: {changed}")
    print("✔ Limpieza completada correctamente.\n")


if __name__ == "__main__":
    main()
