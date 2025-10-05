import os
import re

# Directorio raíz del proyecto (ajustá según tu entorno)
ROOT = "C:/asefweb"

def fix_admin_users_js():
    path = os.path.join(ROOT, "js", "admin-users.js")
    if not os.path.exists(path):
        print("⚠️ No se encontró admin-users.js")
        return

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    fixed = re.sub(r"\?\s+\.", "?.", content)
    if fixed != content:
        backup = path + ".bak"
        with open(backup, "w", encoding="utf-8") as f:
            f.write(content)
        with open(path, "w", encoding="utf-8") as f:
            f.write(fixed)
        print("✅ Corregido optional chaining en admin-users.js (backup creado).")
    else:
        print("✔ admin-users.js no requiere cambios.")


def fix_firebase_init_js():
    path = os.path.join(ROOT, "js", "firebase-init.js")
    if not os.path.exists(path):
        print("⚠️ No se encontró firebase-init.js")
        return

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if "window.firebaseStorage" not in content:
        if "firebase.initializeApp" in content:
            insert_line = "\nwindow.firebaseStorage = firebase.storage();"
            fixed = re.sub(r"(firebase\.initializeApp\(.*?\);)", r"\1" + insert_line, content)
            backup = path + ".bak"
            with open(backup, "w", encoding="utf-8") as f:
                f.write(content)
            with open(path, "w", encoding="utf-8") as f:
                f.write(fixed)
            print("✅ Agregado window.firebaseStorage en firebase-init.js (backup creado).")
        else:
            print("⚠️ firebase.initializeApp no encontrado, no se hizo modificación.")
    else:
        print("✔ firebase-init.js ya define firebaseStorage.")


def ensure_storage_sdk_in_html():
    """Busca todos los .html del proyecto y asegura que tengan firebase-storage.js"""
    storage_script = '<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-storage.js"></script>'
    count = 0

    for root, _, files in os.walk(ROOT):
        for file in files:
            if file.endswith(".html"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()

                if "firebase-storage.js" not in content and "firebase-app.js" in content:
                    backup = path + ".bak"
                    with open(backup, "w", encoding="utf-8") as f:
                        f.write(content)

                    fixed = content.replace(
                        '<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"></script>',
                        '<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"></script>\n' +
                        storage_script
                    )

                    with open(path, "w", encoding="utf-8") as f:
                        f.write(fixed)

                    count += 1
                    print(f"✅ Añadido firebase-storage.js en {file}")

    if count == 0:
        print("✔ Todos los HTML ya contienen firebase-storage.js.")


def main():
    print("🔧 Corrigiendo estructura ASEF...")
    fix_admin_users_js()
    fix_firebase_init_js()
    ensure_storage_sdk_in_html()
    print("\n✅ Correcciones completadas sin afectar módulos funcionales.")


if __name__ == "__main__":
    main()
