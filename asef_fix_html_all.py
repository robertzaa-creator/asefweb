import os
import re

ROOT = "C:/asefweb"
TARGETS = [".html"]

def fix_html(content):
    original = content

    # ============================================================
    # 1️⃣ Corrige favicon (sin prefijo /asefweb/, compatible con Vite)
    # ============================================================
    favicon_tag = (
        "<link rel=\"icon\" type=\"image/svg+xml\" "
        "href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' "
        "viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E"
        "%F0%9F%8F%9B%EF%B8%8F%3C/text%3E%3C/svg%3E\">"
    )

    # Elimina versiones corruptas con /asefweb/ o /
    content = re.sub(
        r"<link[^>]*rel=['\"]icon['\"][^>]*>",
        favicon_tag,
        content,
        flags=re.IGNORECASE,
    )
    content = re.sub(
        r'href=["\']/?asefweb/data:image/svg\+xml,',
        'href="data:image/svg+xml,',
        content,
        flags=re.IGNORECASE,
    )

    # ============================================================
    # 2️⃣ Inserta base dinámica si no existe
    # ============================================================
    if "<base " not in content:
        base_script = (
            "<script>(function(){"
            "var isLocal = location.hostname==='localhost'||location.hostname==='127.0.0.1'||location.protocol==='file:';"
            "var base=document.createElement('base');"
            "base.href=isLocal?'/':'/asefweb/';"
            "document.head.prepend(base);})();</script>"
        )
        content = content.replace("<head>", f"<head>\n  {base_script}\n")

    # ============================================================
    # 3️⃣ Asegura type=\"module\" en scripts
    # ============================================================
    content = re.sub(
        r'<script(?![^>]*type=["\']module["\'])((?:(?!src).)*src=["\'][^"\']+\.js["\'])>',
        r'<script type="module"\1>',
        content,
    )

    # ============================================================
    # 4️⃣ Corrige enlaces con /css/pages/ o rutas erróneas
    # ============================================================
    content = re.sub(r'href=["\']/asefweb/css/\.?/?pages/', 'href="/asefweb/pages/', content)
    content = re.sub(r'href=["\']/asefweb/css/', 'href="/asefweb/css/', content)
    content = re.sub(r'src=["\']/asefweb/css/', 'src="/asefweb/css/', content)

    # ============================================================
    # 5️⃣ Limpieza general
    # ============================================================
    content = re.sub(r'\s+>+', '>', content)
    content = re.sub(r"['\"];\s*>", "\">", content)

    return content if content != original else None


def process_html_files(root_dir):
    changed = 0
    for subdir, _, files in os.walk(root_dir):
        for file in files:
            if any(file.endswith(ext) for ext in TARGETS):
                path = os.path.join(subdir, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                    fixed = fix_html(content)
                    if fixed:
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(fixed)
                        changed += 1
                        print(f"✅ Corregido: {os.path.relpath(path, ROOT)}")
                except Exception as e:
                    print(f"❌ Error al procesar {file}: {e}")

    print(f"\n✔ Proceso completado. Archivos corregidos: {changed}")


if __name__ == "__main__":
    process_html_files(ROOT)
