# ============================================================
# ASEF Web — Fix Base Paths for GitHub Pages & Localhost
# ------------------------------------------------------------
# Inserta <base> dinámico al inicio del <head> en todos los .html
# - Localhost → usa "/"
# - GitHub Pages → usa "/asefweb/"
# ============================================================

import re, os
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
TARGET_EXT = ".html"
BASE_SNIPPET = """<script>
(function() {
  var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';
  var base = document.createElement('base');
  base.href = isLocal ? '/' : '/asefweb/';
  document.head.prepend(base);
})();
</script>"""

def inject_base_tag(file_path):
    html = Path(file_path).read_text(encoding="utf-8")

    # Si ya tiene <base>, lo reemplazamos
    html = re.sub(r"<base[^>]*>", "", html, flags=re.IGNORECASE)

    # Si ya tiene el bloque viejo del script, lo limpiamos
    html = re.sub(r"<script>[\s\S]*?document\.head\.prepend\(base\);[\s\S]*?</script>", "", html, flags=re.IGNORECASE)

    # Insertar justo después de <head>
    new_html = re.sub(r"(<head[^>]*>)", r"\1\n  " + BASE_SNIPPET, html, count=1, flags=re.IGNORECASE)

    if new_html != html:
        backup_path = Path(str(file_path) + ".bak")
        backup_path.write_text(html, encoding="utf-8")
        Path(file_path).write_text(new_html, encoding="utf-8")
        print(f"✅ Base tag insertado: {file_path}")
        return True
    else:
        print(f"⚠️ No se modificó (sin <head>): {file_path}")
        return False

def main():
    print("🔧 Iniciando inserción de base dinámica en HTMLs...")
    count = 0
    for html_file in PROJECT_ROOT.rglob(f"*{TARGET_EXT}"):
        if "node_modules" in str(html_file) or ".bak" in str(html_file):
            continue
        if inject_base_tag(html_file):
            count += 1
    print(f"\n✔ Proceso finalizado. Archivos modificados: {count}")

if __name__ == "__main__":
    main()
