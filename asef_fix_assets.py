import os
import re

# ==========================================================
# ASEFWEB – Asset & Meta Fixer (versión final)
# ----------------------------------------------------------
# Corrige rutas CSS/JS, limpia duplicados de favicon/meta/base,
# corrige favicon dañado y elimina comentarios redundantes.
# Compatible con localhost y GitHub Pages (/asefweb/).
# ==========================================================

ROOT = "C:\\asefweb"
TARGET_EXT = (".html",)

def fix_assets(content):
    # --- 1️⃣ Corrige rutas de CSS/JS ---
    content = re.sub(r'href="/css/', 'href="css/', content)
    content = re.sub(r'src="/js/', 'src="js/', content)
    content = re.sub(r'href="/asefweb/css/', 'href="css/', content)
    content = re.sub(r'src="/asefweb/js/', 'src="js/', content)

    # --- 2️⃣ Elimina duplicados de favicon, meta y base ---
    lines = content.splitlines()
    seen_favicon = seen_base = seen_charset = seen_viewport = False
    cleaned_lines = []

    for line in lines:
        line_strip = line.strip()

        # Favicon
        if re.search(r'rel=["\']icon["\']', line_strip, re.I):
            if seen_favicon:
                continue
            seen_favicon = True

        # <base>
        if re.search(r'<base ', line_strip, re.I):
            if seen_base:
                continue
            seen_base = True

        # Meta charset
        if re.search(r'<meta.*charset', line_strip, re.I):
            if seen_charset:
                continue
            seen_charset = True

        # Meta viewport
        if re.search(r'<meta.*viewport', line_strip, re.I):
            if seen_viewport:
                continue
            seen_viewport = True

        cleaned_lines.append(line)

    content = "\n".join(cleaned_lines)

    # --- 3️⃣ Corrige favicons dañados ---
    content = re.sub(
        r'href="[^"]*data:image/svg\+xml[^"]*"',
        'href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>🏛️</text></svg>"',
        content,
    )

    # --- 4️⃣ Elimina comentarios HTML redundantes ---
    redundant_comments = [
        r'<!--\s*CSS\s*Files\s*-->',
        r'<!--\s*JS\s*Files\s*-->',
        r'<!--\s*Favicon\s*-->',
        r'<!--\s*Canonical\s*URL\s*-->',
        r'<!--\s*Meta\s*Tags\s*-->',
        r'<!--\s*SEO\s*Meta\s*Tags\s*-->',
        r'<!--\s*Open\s*Graph\s*Tags\s*-->',
    ]
    for pattern in redundant_comments:
        content = re.sub(pattern, "", content, flags=re.I)

    # Elimina líneas vacías duplicadas (doble salto de línea)
    content = re.sub(r'\n\s*\n+', '\n', content)

    return content


def process_html(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        original = f.read()

    fixed = fix_assets(original)
    if fixed != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(fixed)
        print(f"✅ Limpieza aplicada: {os.path.relpath(filepath, ROOT)}")
        return 1
    return 0


def main():
    print("🎨 Iniciando limpieza avanzada de HTMLs ASEF...")
    total_fixed = 0
    for root, _, files in os.walk(ROOT):
        for file in files:
            if file.endswith(TARGET_EXT):
                path = os.path.join(root, file)
                total_fixed += process_html(path)
    print(f"\n✔ Finalizado. Archivos actualizados: {total_fixed}")


if __name__ == "__main__":
    main()
