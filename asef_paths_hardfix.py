#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Arreglo definitivo de rutas para ASEF:
- CSS -> href="css/....css"
- JS  -> src="js/....js"
- Pages internas -> href="pages/....html"
- Quita variantes con /asefweb/, /asefweb/css/, nombres sueltos, etc.
- Limpia inyección de <base> por JS (no nos sirve para <link> del head)
- Normaliza favicon a archivo (opcional)
"""

import re
from pathlib import Path

ROOT = Path(__file__).parent
HTMLS = [ROOT/"index.html", ROOT/"dist"/"index.html"]
if (ROOT/"pages").exists():
    HTMLS += list((ROOT/"pages").rglob("*.html"))

CSS_FILES = ("main.css", "navigation.css", "carousel.css", "responsive.css")
JS_FILES  = ("firebase-init.js", "auth.js", "carousel.js", "navigation.js", "main.js")

def fix_file(p: Path) -> bool:
    if not p.exists():
        return False
    s = p.read_text(encoding="utf-8", errors="ignore")

    # 0) normalizo EOL para que los regex funcionen bien
    s = s.replace("\r\n", "\n")

    # 1) eliminar inyección de <base> por JS si quedó
    s = re.sub(
        r"<script>\s*\(function\(\)\s*\{.*?document\.head\.prepend\(base\);\s*\}\)\(\);\s*</script>\s*",
        "",
        s,
        flags=re.S
    )

    # 2) CSS: asegurar "css/ARCHIVO.css"
    css_pat = "|".join(map(re.escape, CSS_FILES))

    # /asefweb/ARCHIVO.css  o  /asefweb/css/ARCHIVO.css  -> css/ARCHIVO.css
    s = re.sub(
        rf'href=["\']/?asefweb/(?:css/)?({css_pat})["\']',
        r'href="css/\1"',
        s, flags=re.I
    )
    # ARCHIVO.css suelto -> css/ARCHIVO.css (evitar duplicar si ya tiene css/)
    s = re.sub(
        rf'href=["\'](?!css/)\b({css_pat})["\']',
        r'href="css/\1"',
        s, flags=re.I
    )

    # 3) JS propios: asegurar "js/ARCHIVO.js"
    js_pat = "|".join(map(re.escape, JS_FILES))
    s = re.sub(
        rf'src=["\']/?asefweb/(?:js/)?({js_pat})["\']',
        r'src="js/\1"',
        s, flags=re.I
    )
    s = re.sub(
        rf'src=["\'](?!js/)\b({js_pat})["\']',
        r'src="js/\1"',
        s, flags=re.I
    )

    # 4) Páginas internas: /asefweb/css/pages/...  o  /asefweb/pages/...  -> pages/...
    s = re.sub(
        r'href=["\']/?asefweb/(?:css/)?pages/([^"\']+)["\']',
        r'href="pages/\1"',
        s, flags=re.I
    )

    # 5) Anclas con prefijos: /asefweb/css/#...  o  /asefweb/#...  -> #...
    s = re.sub(
        r'href=["\']/?asefweb/(?:css/)?#',
        'href="#',
        s, flags=re.I
    )

    # 6) Si quedó algún CSS sin carpeta por reemplazos raros: navigation.css, main.css, etc.
    # (este refuerzo ataca casos que escaparon a 2)
    for name in CSS_FILES:
        s = re.sub(
            rf'href=["\']{re.escape(name)}["\']',
            f'href="css/{name}"', s, flags=re.I
        )

    # 7) Normalizo favicon (opcional): data-URL problemático -> archivo
    s = re.sub(
        r'<link[^>]+rel=["\']icon["\'][^>]*>',
        '<link rel="icon" href="favicon.svg">', s, flags=re.I
    )

    p.write_text(s, encoding="utf-8")
    return True

def ensure_favicon():
    fav = ROOT/"favicon.svg"
    if not fav.exists():
        fav.write_text(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            "<text y='.9em' font-size='90'>🏛️</text></svg>",
            encoding="utf-8"
        )

def main():
    fixed = 0
    for f in HTMLS:
        if fix_file(f):
            print(f"✅ Arreglado: {f.relative_to(ROOT)}")
            fixed += 1
    ensure_favicon()
    print(f"\n✔ Listo. Archivos procesados: {fixed}")

if __name__ == "__main__":
    main()
