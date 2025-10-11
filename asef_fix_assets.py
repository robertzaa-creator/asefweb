import os
import re

ROOT = "C:\\asefweb"
TARGET_EXT = (".html",)

def fix_links(content):
    # Corrige rutas CSS/JS absolutas
    content = re.sub(r'href="/css/', 'href="css/', content)
    content = re.sub(r'src="/js/', 'src="js/', content)
    # Corrige rutas absolutas con /asefweb/ solo si están duplicadas
    content = re.sub(r'href="/asefweb/css/', 'href="css/', content)
    content = re.sub(r'src="/asefweb/js/', 'src="js/', content)
    return content

def process_html(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    new_content = fix_links(content)
    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"✅ Corrigido: {os.path.relpath(filepath, ROOT)}")
        return 1
    return 0

def main():
    print("🔧 Corrigiendo rutas de assets (CSS/JS)...")
    count = 0
    for root, _, files in os.walk(ROOT):
        for file in files:
            if file.endswith(TARGET_EXT):
                path = os.path.join(root, file)
                count += process_html(path)
    print(f"\n✔ Proceso completado. Archivos corregidos: {count}")

if __name__ == "__main__":
    main()
