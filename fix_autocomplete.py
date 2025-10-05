import os
import re

BASE_DIR = os.getcwd()

# =========================
# Patrones base de inputs
# =========================
PASSWORD_PATTERN = re.compile(r'(<input[^>]*type=["\']password["\'][^>]*>)', re.IGNORECASE)
EMAIL_PATTERN = re.compile(r'(<input[^>]*type=["\']email["\'][^>]*>)', re.IGNORECASE)
NAME_PATTERN = re.compile(r'(<input[^>]*(name|id)=["\'](name|username)["\'][^>]*>)', re.IGNORECASE)


def add_autocomplete(tag, field_type):
    """Agrega el atributo autocomplete si no está presente"""
    if 'autocomplete=' in tag.lower():
        return tag  # ya tiene el atributo

    if field_type == 'password':
        # Detectar si es para registro o login
        if re.search(r'(reg|new)', tag, re.IGNORECASE):
            return tag.replace('>', ' autocomplete="new-password">')
        else:
            return tag.replace('>', ' autocomplete="current-password">')

    elif field_type == 'email':
        return tag.replace('>', ' autocomplete="email">')

    elif field_type == 'name':
        return tag.replace('>', ' autocomplete="name">')

    return tag


def fix_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            html = f.read()

        original = html

        html = PASSWORD_PATTERN.sub(lambda m: add_autocomplete(m.group(1), 'password'), html)
        html = EMAIL_PATTERN.sub(lambda m: add_autocomplete(m.group(1), 'email'), html)
        html = NAME_PATTERN.sub(lambda m: add_autocomplete(m.group(1), 'name'), html)

        if html != original:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"✅ Corregido: {path}")
        else:
            print(f"✔ Sin cambios: {path}")

    except Exception as e:
        print(f"⚠️ Error procesando {path}: {e}")


def main():
    print("🔍 Buscando archivos .html en el proyecto ASEF...\n")
    count = 0
    for root, _, files in os.walk(BASE_DIR):
        for file in files:
            if file.endswith('.html'):
                fix_file(os.path.join(root, file))
                count += 1
    print(f"\n✨ Limpieza completada. {count} archivos procesados.\n")


if __name__ == '__main__':
    main()
