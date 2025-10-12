import re
import os
from pathlib import Path

ROOT = Path(r"C:\asefweb")

# Archivos HTML a procesar
HTML_GLOBS = [
    "*.html",
    "dist/*.html",
    "pages/*.html",
    "pages/**/*.html",
]

# Inserta <base> dinámico solo una vez
DYNAMIC_BASE_SNIPPET = r"""<script id="asef-dynamic-base">
(function () {
  try {
    if (document.getElementById('asef-dynamic-base-installed')) return;
    var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';
    var base = document.createElement('base');
    base.id = 'asef-dynamic-base-installed';
    base.href = isLocal ? '/' : '/asefweb/';
    document.head.prepend(base);
  } catch(e) { /* noop */ }
})();
</script>"""

# Favicon definitivo como archivo
FAVICON_LINK = r"""<link rel="icon" href="favicon.svg" type="image/svg+xml">"""

# Reglas para detectar URLs externas o especiales
EXTERNAL_PREFIXES = ("http://", "https://", "mailto:", "tel:", "whatsapp:", "fax:", "data:", "#")

# Compilados
RE_BASE_TAG = re.compile(r"<base\b[^>]*>", re.IGNORECASE)
RE_HEAD_OPEN = re.compile(r"<head[^>]*>", re.IGNORECASE)

# src/href con comillas simples o dobles
RE_ATTR = re.compile(
    r"""(?P<attr>\b(?:href|src)\s*=\s*)
        (?P<quote>['"])
        (?P<url>.*?)
        (?P=quote)""",
    re.IGNORECASE | re.VERBOSE | re.DOTALL
)

# onclick="location.href='...'"
RE_ONCLICK_LOC = re.compile(
    r"""(?P<prefix>onclick\s*=\s*(['"][^'"]*?\blocation\.href\s*=\s*))
        (?P<quote>['"])
        (?P<url>[^'"]*)
        (?P=quote)""",
    re.IGNORECASE | re.VERBOSE
)

# <link rel="icon" ...> (data-urls, duplicados)
RE_FAVICON = re.compile(r"""<link[^>]+rel\s*=\s*["']icon["'][^>]*>""", re.IGNORECASE)

# <script ... src="*.js"> sin type=module para locales
RE_SCRIPT_TAG = re.compile(
    r"""<script\b(?![^>]*type=)["'\s\w=/-]*\bsrc\s*=\s*(['"])(?P<src>[^'"]+\.js)\1[^>]*>""",
    re.IGNORECASE
)

def is_external(url: str) -> bool:
    return url.startswith(EXTERNAL_PREFIXES)

def normalize_internal(url: str) -> str:
    """
    Reglas:
      - Quita cualquier leading '/' y leading 'asefweb/' (con o sin barra)
      - Convierte './' -> ''
      - Deja rutas internas relativas al base (css/..., js/..., pages/...)
      - Mantiene anclas puras '#...' tal cual
    """
    if not url or url.startswith("#"):
        return url

    u = url.strip()

    # Ya externas? devolver igual
    if is_external(u):
        return u

    # Elimina prefijo inicial slash
    while u.startswith("/"):
        u = u[1:]

    # Elimina duplicado 'asefweb/' al inicio
    if u.lower().startswith("asefweb/"):
        u = u[8:]

    # Quita './'
    if u.startswith("./"):
        u = u[2:]

    return u

def fix_attrs(html: str) -> tuple[str, dict]:
    stats = {
        "href_fixed": 0,
        "src_fixed": 0,
        "onclick_loc_fixed": 0,
        "type_module_added": 0
    }

    # Corrige href/src
    def _attr_repl(m: re.Match) -> str:
        attr, quote, url = m.group("attr"), m.group("quote"), m.group("url").strip()
        low = attr.lower()
        orig = url

        if is_external(url) or url.startswith("#"):
            return m.group(0)

        new = normalize_internal(url)
        if new != orig:
            if "href" in low:
                stats["href_fixed"] += 1
            else:
                stats["src_fixed"] += 1
        return f"{attr}{quote}{new}{quote}"

    html = RE_ATTR.sub(_attr_repl, html)

    # Corrige location.href en onclick
    def _onclick_repl(m: re.Match) -> str:
        prefix, quote, url = m.group("prefix"), m.group("quote"), m.group("url")
        if is_external(url) or url.startswith("#"):
            return m.group(0)
        new = normalize_internal(url)
        if new != url:
            stats["onclick_loc_fixed"] += 1
        return f"{prefix}{quote}{new}{quote}"

    html = RE_ONCLICK_LOC.sub(_onclick_repl, html)

    # Asegura type="module" en scripts locales .js
    def _script_repl(s: re.Match) -> str:
        full = s.group(0)
        src = s.group("src")
        if is_external(src):
            return full
        # Ya tiene type?
        if re.search(r'\btype\s*=\s*["\']module["\']', full, re.IGNORECASE):
            return full
        stats["type_module_added"] += 1
        return full.replace("<script", '<script type="module"', 1)

    html = RE_SCRIPT_TAG.sub(_script_repl, html)

    return html, stats

def ensure_dynamic_base(html: str) -> tuple[str, bool]:
    # Elimina cualquier <base> existente
    before = html
    html = RE_BASE_TAG.sub("", html)
    removed = before != html

    # Inserta nuestro snippet tras <head>
    if "asef-dynamic-base-installed" in html or "asef-dynamic-base" in html:
        return html, removed

    m = RE_HEAD_OPEN.search(html)
    if m:
        pos = m.end()
        html = html[:pos] + "\n" + DYNAMIC_BASE_SNIPPET + "\n" + html[pos:]
    return html, removed

def ensure_favicon(html: str) -> tuple[str, bool]:
    # Borra favicons previos y deja un único link limpio
    before = html
    html = RE_FAVICON.sub("", html)
    # Inserta nuestro favicon justo antes del primer <link rel="stylesheet"> o luego de <meta charset> si no hay CSS
    insert_after = re.search(r'<link[^>]+rel=["\']stylesheet["\']', html, re.IGNORECASE)
    if insert_after:
        start = insert_after.start()
        # Busca el cierre de <head>, por si acaso queremos que quede arriba del todo
        head_match = re.search(r'</head>', html, re.IGNORECASE)
        if head_match:
            # Inserta justo antes del primer stylesheet o al inicio del head si prefieres
            pass
    # Si ya existe nuestro favicon, no lo duplica
    if "favicon.svg" in html and 'rel="icon"' in html:
        return html, before != html

    # Lo ponemos al principio del <head> (tras el base dinámico si existe)
    m = RE_HEAD_OPEN.search(html)
    if m:
        pos = m.end()
        html = html[:pos] + "\n" + FAVICON_LINK + "\n" + html[pos:]
    return html, True

def process_html_file(path: Path) -> dict:
    s = path.read_text(encoding="utf-8", errors="ignore")
    original = s

    # 1) base dinámico
    s, removed_any = ensure_dynamic_base(s)

    # 2) normalizar href/src/onclick
    s, stats = fix_attrs(s)

    # 3) favicon limpio
    s, _ = ensure_favicon(s)

    changed = s != original
    if changed:
        path.write_text(s, encoding="utf-8")

    return {
        "file": str(path.relative_to(ROOT)),
        "changed": changed,
        **stats,
        "base_removed": removed_any
    }

def remove_baks():
    removed = 0
    for p in ROOT.rglob("*.html.bak"):
        try:
            p.unlink()
            removed += 1
        except Exception:
            pass
    return removed

def ensure_favicon_file():
    public = ROOT / "public"
    public.mkdir(exist_ok=True)
    fav = public / "favicon.svg"
    if not fav.exists():
        fav.write_text(
            """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <text y=".9em" font-size="90">🏛️</text>
</svg>""",
            encoding="utf-8",
        )

def main():
    print("🔧 ASEF | Reparación integral de HTML (base dinámico, rutas, favicon, scripts)")
    ensure_favicon_file()
    total = 0
    changed = 0
    href_fixed = src_fixed = onclick_fixed = type_mod = base_removed = 0

    files = []
    for pattern in HTML_GLOBS:
        files.extend(ROOT.glob(pattern))

    # Elimina duplicados
    seen = set()
    files = [f for f in files if f.is_file() and not (f in seen or seen.add(f))]

    for f in files:
        total += 1
        res = process_html_file(f)
        if res["changed"]:
            changed += 1
        href_fixed += res["href_fixed"]
        src_fixed += res["src_fixed"]
        onclick_fixed += res["onclick_loc_fixed"]
        type_mod += res["type_module_added"]
        base_removed += 1 if res["base_removed"] else 0
        print(f"✅ {res['file']}  (href:{res['href_fixed']} src:{res['src_fixed']} onclick:{res['onclick_loc_fixed']} module+:{res['type_module_added']}{' base-removed' if res['base_removed'] else ''})")

    baks = remove_baks()

    print("\n===== RESUMEN ASEF REPAIR =====")
    print(f"Analizados     : {total}")
    print(f"Modificados    : {changed}")
    print(f"href corregidos: {href_fixed}")
    print(f"src corregidos : {src_fixed}")
    print(f"onclick.href   : {onclick_fixed}")
    print(f"type=module +  : {type_mod}")
    print(f"<base> removidos: {base_removed}")
    print(f".bak eliminados: {baks}")
    print("✔ Listo. Las rutas ahora son relativas al <base> dinámico (localhost y GitHub Pages).")

if __name__ == "__main__":
    main()
