import os
import re
import argparse

# ============================================================
# ASEF · Validador y Corrector de Rutas en HTML/CSS
# Compatible con localhost y GitHub Pages
# ------------------------------------------------------------
# - Ignora rutas data: (favicons inline)
# - Corrige href/src relativos agregando /asefweb/
# - Genera reporte detallado report_paths.txt
# ============================================================

ROOT = "C:/asefweb"
VALID_PREFIX = "/asefweb/"
REPORT_FILE = os.path.join(ROOT, "report_paths.txt")

# Expresiones regulares
HTML_LINK_RE = re.compile(r'(?:href|src)\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
CSS_URL_RE = re.compile(r'url\(["\']?([^"\')]+)["\']?\)', re.IGNORECASE)


def is_external(url: str) -> bool:
    """Determina si una URL es externa o especial."""
    return url.startswith(("http://", "https://", "mailto:", "tel:", "#", "data:"))


def fix_path(path: str) -> str:
    """Corrige una ruta local agregando /asefweb/ si es necesario."""
    if not path or is_external(path):
        return path

    # Evitar duplicados o paths absolutos ya correctos
    if path.startswith(VALID_PREFIX):
        return path

    # Evita tocar rutas absolutas del sistema o de root
    if path.startswith(("/", "./", "../")):
        clean = path.lstrip("/.")
        return f"{VALID_PREFIX}{clean}"

    return f"{VALID_PREFIX}{path}"


def process_file(path: str):
    """Analiza y corrige rutas dentro de un archivo."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"❌ No se pudo leer {path}: {e}")
        return 0, 0, 0, 0

    links = HTML_LINK_RE.findall(content) + CSS_URL_RE.findall(content)
    if not links:
        return 0, 0, 0, 0

    correct = incorrect = external = fixed = 0

    for link in links:
        if is_external(link):
            external += 1
            continue

        if link.startswith(VALID_PREFIX):
            correct += 1
        else:
            incorrect += 1
            fixed_link = fix_path(link)
            if fixed_link != link:
                # 🔒 No corregir data:image ni anclas internas
                if not link.startswith("data:") and not link.startswith("#"):
                    content = content.replace(link, fixed_link)
                    fixed += 1

    if fixed > 0:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ Corregido: {os.path.relpath(path, ROOT)}")

    return correct, incorrect, external, fixed


def scan_directory(root_dir: str):
    """Escanea y valida rutas en todos los HTML y CSS."""
    total_correct = total_incorrect = total_external = total_fixed = 0
    files_with_errors = []

    for subdir, _, files in os.walk(root_dir):
        for file in files:
            if file.endswith((".html", ".css")):
                path = os.path.join(subdir, file)
                correct, incorrect, external, fixed = process_file(path)
                total_correct += correct
                total_incorrect += incorrect
                total_external += external
                total_fixed += fixed
                if incorrect > 0:
                    files_with_errors.append(os.path.relpath(path, ROOT))

    # --- Reporte resumen ---
    with open(REPORT_FILE, "w", encoding="utf-8") as rpt:
        rpt.write("===== RESUMEN ASEF VALIDACIÓN =====\n\n")
        rpt.write(f"Correct   : {total_correct}\n")
        rpt.write(f"Incorrect : {total_incorrect}\n")
        rpt.write(f"External  : {total_external}\n")
        rpt.write(f"Fixed     : {total_fixed}\n")
        rpt.write(f"Total analizado: {total_correct + total_incorrect + total_external}\n\n")
        if files_with_errors:
            rpt.write("Archivos con rutas incorrectas:\n")
            for f in files_with_errors:
                rpt.write(f"  - {f}\n")

    print("\n===== RESUMEN ASEF VALIDACIÓN =====\n")
    print(f"Correct   : {total_correct}")
    print(f"Incorrect : {total_incorrect}")
    print(f"External  : {total_external}")
    print(f"Fixed     : {total_fixed}")
    print(f"Total analizado: {total_correct + total_incorrect + total_external}\n")

    if files_with_errors:
        print("Archivos con rutas incorrectas:")
        for f in files_with_errors:
            print(f"  - {f}")

    print(f"\nReporte completo guardado en: {REPORT_FILE}")
    print("\n✔ Finalizado.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Valida y corrige rutas HTML/CSS del proyecto ASEF.")
    parser.add_argument("--fix", action="store_true", help="Corrige rutas incorrectas automáticamente.")
    args = parser.parse_args()

    print("🔍 Validando rutas en HTML y CSS...\n")
    scan_directory(ROOT)
