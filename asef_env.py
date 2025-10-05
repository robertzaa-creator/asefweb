import re

file_path = r"js/admin.js"   # ajustá la ruta si está en otra carpeta

# lee el archivo crudo
with open(file_path, "rb") as f:
    content = f.read()

# decodifica ignorando caracteres corruptos
text = content.decode("utf-8", errors="ignore")

# 🔹 elimina caracteres invisibles problemáticos
text = text.replace("\ufeff", "")  # BOM
text = re.sub(r"[\u00A0\u200B\u200C\u200D\uFEFF]", "", text)  # non-breaking/invisibles

# 🔹 corrige todas las variantes erróneas de '? .' con o sin espacios
text = re.sub(r"\?\s*\.", "?.", text)

# 🔹 limpia espacios antes de saltos de línea
text = re.sub(r"[ \t]+(\r?\n)", r"\1", text)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("✅ Archivo js/admin.js limpiado correctamente.")
