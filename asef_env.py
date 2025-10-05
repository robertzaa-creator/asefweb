import os
import re
from pathlib import Path
import shutil

# === CONFIGURACIÓN GENERAL ===
ROOT = Path(__file__).parent
PAGES = ROOT / "pages"
SOCIOS = PAGES / "socios"
CSS_DIR = ROOT / "css"
JS_DIR = ROOT / "js"

# === RUTAS BASE ===
BASE_LOCAL = "/"
BASE_GHPAGES = "/asefweb/"
JS_FILES = ["firebase-init.js", "auth.js", "members.js", "socios.js"]
CSS_FILES = ["main.css", "members.css", "navigation.css", "responsive.css"]

# === BLOQUE <base> CORRECTO ===
BASE_BLOCK = """<script>
(function() {
  const isLocal = location.hostname === 'localhost' ||
                  location.hostname === '127.0.0.1' ||
                  location.protocol === 'file:';
  const base = document.createElement('base');
  base.href = isLocal ? '/pages/socios/' : '/asefweb/pages/socios/';
  document.head.prepend(base);
})();
</script>
"""

# === Corrige el bloque <base> dinámico ===
def fix_html_base(file_path: Path):
    content = file_path.read_text(encoding="utf-8")

    # Elimina cualquier bloque <script> previo con base.href o location.hostname
    content = re.sub(
        r"<script>.*?(base\.href|location\.hostname).*?</script>",
        "",
        content,
        flags=re.S
    )

    # Inserta el bloque base limpio después de <head>
    content = re.sub(r"(<head[^>]*>)", r"\1\n" + BASE_BLOCK, content, count=1)

    file_path.write_text(content, encoding="utf-8")
    print(f"✅ Base corregida → {file_path.name}")

# === Corrige rutas CSS ===
def fix_html_css(file_path: Path):
    content = file_path.read_text(encoding="utf-8")
    for css_name in CSS_FILES:
        # Si aparece href="css/archivo.css", reemplaza con ../../css/
        content = re.sub(
            rf'href=["\']css/{css_name}["\']',
            f'href="../../css/{css_name}"',
            content
        )
    file_path.write_text(content, encoding="utf-8")
    print(f"🎨 CSS corregido → {file_path.name}")

# === Corrige rutas JS ===
def fix_html_scripts(file_path: Path):
    content = file_path.read_text(encoding="utf-8")
    for js_name in JS_FILES:
        content = re.sub(
            rf'src=["\']js/{js_name}["\']',
            f'src="../../js/{js_name}"',
            content
        )
    file_path.write_text(content, encoding="utf-8")
    print(f"🧩 JS corregido → {file_path.name}")

# === Procesa todos los HTML de /pages/socios/ ===
def process_socios_html():
    if not SOCIOS.exists():
        print("⚠️ No existe la carpeta /pages/socios/")
        return
    for file in SOCIOS.glob("*.html"):
        fix_html_base(file)
        fix_html_css(file)
        fix_html_scripts(file)

# === Procesa todos los HTML del proyecto (para CSS/JS globales) ===
def process_all_html():
    for file in ROOT.rglob("*.html"):
        if "node_modules" in str(file) or "dist" in str(file):
            continue
        fix_html_css(file)
        fix_html_scripts(file)

# === Reescribe vite.config.js correcto ===
def ensure_vite_config():
    vite_file = ROOT / "vite.config.js"
    vite_content = """import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/asefweb/' : '/',
  build: { outDir: 'dist' },
  server: { port: 5173 }
});
"""
    vite_file.write_text(vite_content, encoding="utf-8")
    print("🧱 vite.config.js regenerado correctamente.")

# === Limpia caché .vite ===
def cleanup_vite_cache():
    vite_cache = ROOT / "node_modules" / ".vite"
    if vite_cache.exists():
        try:
            shutil.rmtree(vite_cache)
            print("🧹 Cache .vite eliminada (será regenerada por Vite).")
        except Exception as e:
            print(f"⚠️ No se pudo eliminar la cache .vite: {e}")

# === MAIN ===
if __name__ == "__main__":
    print("🔧 Corrigiendo estructura ASEF...")
    process_socios_html()
    process_all_html()
    ensure_vite_config()
    cleanup_vite_cache()
    print("✅ Proyecto alineado correctamente para localhost y GitHub Pages.")
