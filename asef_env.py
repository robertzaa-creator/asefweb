#!/usr/bin/env python3
"""
ASEF Environment Bootstrapper v4.3
-----------------------------------
✔ Detecta entorno (Local / GitHub Pages)
✔ Inserta o actualiza <base href="...">
✔ Corrige rutas de scripts, links, imágenes, etc.
✔ Ignora archivos que ya crean <base> dinámicamente (JS)
✔ Muestra y guarda reporte de cambios (env-report.log)
"""

import os
import re
import json
import socket
from datetime import datetime
from pathlib import Path


# ------------------------------------------------------
# 🔍 Detectar entorno
# ------------------------------------------------------
def detect_env():
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)

    is_local = (
        "localhost" in hostname
        or local_ip.startswith("127.")
        or os.getenv("ASEF_LOCAL", "false").lower() == "true"
    )
    is_github = os.getenv("GITHUB_ACTIONS", "false").lower() == "true"

    if is_local:
        root = "/"
        env_name = "Localhost 🖥️"
    elif is_github:
        root = "/asefweb/"
        env_name = "GitHub Pages 🌐"
    else:
        root = "/asefweb/"
        env_name = "Producción 🌐"

    return {"root": root, "env": env_name}


# ------------------------------------------------------
# 🧩 Actualizar o insertar <base href>
# ------------------------------------------------------
def update_base_tags(root):
    html_files = list(Path(".").rglob("*.html"))
    pattern = re.compile(r"<base\s+href\s*=\s*['\"](.*?)['\"]\s*>", re.IGNORECASE)
    changed = 0
    modified_files = []

    for file in html_files:
        try:
            content = file.read_text(encoding="utf-8")

            # ⚠️ Ignorar archivos que generan <base> dinámico
            if "document.createElement('base')" in content:
                continue

            if "<head" not in content:
                continue

            new_content = content
            if pattern.search(content):
                new_content = pattern.sub(f'<base href="{root}">', content)
            else:
                new_content = re.sub(
                    r"(<head[^>]*>)",
                    f'\\1\n  <base href="{root}">',
                    content,
                    count=1,
                )

            # Limpiar posibles escapes (\")
            new_content = new_content.replace('\\"', '"').replace("\\'", "'")

            if new_content != content:
                file.write_text(new_content, encoding="utf-8", newline="\n")
                changed += 1
                modified_files.append(str(file))

        except Exception as e:
            print(f"⚠️ No se pudo actualizar {file}: {e}")

    return changed, modified_files


# ------------------------------------------------------
# 🔧 Corregir rutas (scripts, links, imágenes, etc.)
# ------------------------------------------------------
def relative_prefix(file: Path) -> str:
    """Devuelve cuántos niveles subir para llegar a la raíz /js"""
    parts = file.parts
    if "pages" not in parts:
        return ""  # raíz
    depth = len(parts) - list(parts).index("pages") - 1
    return "../" * depth


def fix_html_paths():
    html_files = list(Path(".").rglob("*.html"))
    fixed = 0
    modified_files = []

    for file in html_files:
        try:
            content = file.read_text(encoding="utf-8")
            prefix = relative_prefix(file)

            patterns = {
                r'src\s*=\s*["\']/js/': f'src="{prefix}js/',
                r'href\s*=\s*["\']/css/': f'href="{prefix}css/',
                r'src\s*=\s*["\']/images/': f'src="{prefix}images/',
                r'src\s*=\s*["\']/img/': f'src="{prefix}img/',
                r'href\s*=\s*["\']/img/': f'href="{prefix}img/',
                r'href\s*=\s*["\']/favicon': f'href="{prefix}favicon',
            }

            new_content = content
            for pat, repl in patterns.items():
                new_content = re.sub(pat, repl, new_content, flags=re.IGNORECASE)

            if new_content != content:
                file.write_text(new_content, encoding="utf-8", newline="\n")
                fixed += 1
                modified_files.append(str(file))

        except Exception as e:
            print(f"⚠️ No se pudo procesar {file}: {e}")

    return fixed, modified_files


# ------------------------------------------------------
# 🧱 Generar runtime-env.json
# ------------------------------------------------------
def write_runtime_env(root, env_name):
    env_file = Path("js/runtime-env.json")
    env_file.parent.mkdir(parents=True, exist_ok=True)
    with env_file.open("w", encoding="utf-8") as f:
        json.dump({"ROOT": root, "env": env_name}, f, indent=2)
    return env_file


# ------------------------------------------------------
# 🧾 Guardar log
# ------------------------------------------------------
def write_log(env_name, root, base_files, path_files):
    log_file = Path("env-report.log")
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with log_file.open("a", encoding="utf-8") as log:
        log.write(f"\n=== ASEF Environment Bootstrapper Log ===\n")
        log.write(f"Fecha: {now}\n")
        log.write(f"Entorno: {env_name}\n")
        log.write(f"ROOT: {root}\n")

        modified = base_files + path_files
        if modified:
            log.write("Archivos modificados:\n")
            for f in modified:
                log.write(f" - {f}\n")
        else:
            log.write("Sin cambios en archivos HTML.\n")

        log.write("-----------------------------------------\n")

    print(f"🧾 Log guardado en: {log_file.resolve()}")


# ------------------------------------------------------
# 🚀 Principal
# ------------------------------------------------------
def main():
    env = detect_env()
    root = env["root"]
    env_name = env["env"]

    print("=" * 70)
    print("🚀 ASEF Environment Bootstrapper v4.3")
    print(f"Entorno detectado: {env_name}")
    print(f"ROOT aplicado: {root}")
    print("=" * 70)

    env_file = write_runtime_env(root, env_name)
    print(f"✅ runtime-env.json generado → {env_file.resolve()}")

    changed_base, base_files = update_base_tags(root)
    print(f"🧩 Archivos HTML con <base href> actualizado: {changed_base}")

    fixed_paths, path_files = fix_html_paths()
    print(f"🔧 Archivos HTML con rutas corregidas: {fixed_paths}")

    os.environ["ASEF_ROOT"] = root
    print(f"🌍 Variable ASEF_ROOT = {root}")

    # 📋 Mostrar resumen
    modified_all = base_files + path_files
    if modified_all:
        print("\n📁 Archivos modificados:")
        for f in modified_all:
            print("  •", f)
    else:
        print("\n✅ No hubo cambios en los archivos HTML.")

    # 🧾 Guardar log
    write_log(env_name, root, base_files, path_files)

    print("\n💡 Sugerencia:")
    print("   python -m http.server 5173 --bind 127.0.0.1\n")


if __name__ == "__main__":
    main()
