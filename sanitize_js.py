import os
import re

# Carpeta base del proyecto (puede cambiar según tu estructura)
BASE_DIR = os.getcwd()

# Expresiones regulares
PATTERN_OPTIONAL = re.compile(r"\?\s+\.", re.UNICODE)  # corrige "? ."
INVISIBLES = r"[\u00A0\u200B\u200C\u200D\uFEFF]"  # espacios invisibles y BOM

def clean_file(path):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        original = content
        # 🔹 Corrige "? ." → "?."
        content = PATTERN_OPTIONAL.sub("?.", content)

        # 🔹 Elimina caracteres invisibles
        content = re.sub(INVISIBLES, "", content)

        # 🔹 Limpia BOM, tabs sobrantes, y espacios antes de saltos
        content = content.replace("\ufeff", "")
        content = re.sub(r"[ \t]+(\r?\n)", r"\1", content)

        if content != original:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"✅ Corregido: {path}")
        else:
            print(f"✔ Sin cambios: {path}")

    except Exception as e:
        print(f"⚠️ Error procesando {path}: {e}")


def run_sanitizer():
    print("🔍 Escaneando proyecto para limpiar caracteres invisibles y '? .' incorrectos...\n")
    count = 0
    for root, _, files in os.walk(BASE_DIR):
        for file in files:
            if file.endswith(".js") or file.endswith(".html"):
                count += 1
                clean_file(os.path.join(root, file))
    print(f"\n✨ Limpieza completa. {count} archivos verificados en {BASE_DIR}\n")


if __name__ == "__main__":
    run_sanitizer()
