import os
import re

# --- Configuración ---
BASE_DIR = os.path.join(os.getcwd(), "js")  # carpeta donde están tus JS
PATTERN = re.compile(r"\?\s+\.", re.UNICODE)  # detecta '? .' con espacios

def clean_js_file(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        original = f.read()

    # 1️⃣ Corrige '? .' → '?.'
    fixed = PATTERN.sub("?.", original)

    # 2️⃣ Elimina caracteres invisibles de control (como BOM o U+FEFF)
    fixed = fixed.replace("\ufeff", "")
    fixed = re.sub(r"[\u200b\u200c\u200d\u2060]", "", fixed)

    # 3️⃣ Limpieza general de espacios en blanco innecesarios
    fixed = re.sub(r"[ \t]+(\n)", r"\1", fixed)

    if fixed != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(fixed)
        print(f"✅ Corregido: {path}")
    else:
        print(f"✔ Sin cambios: {path}")

def run_cleanup():
    print("🔍 Buscando archivos JS para limpiar...\n")
    count = 0
    for root, _, files in os.walk(BASE_DIR):
        for file in files:
            if file.endswith(".js"):
                count += 1
                clean_js_file(os.path.join(root, file))
    print(f"\n✨ Limpieza completa. {count} archivos escaneados en {BASE_DIR}")

if __name__ == "__main__":
    run_cleanup()
