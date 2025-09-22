// js/navigation.js
// =======================================================
//  Normalizador de enlaces para GH Pages (/asefweb/) y local (/)
// =======================================================

(function () {
  if (window.__NAV_FIX__) return;
  window.__NAV_FIX__ = true;

  const ROOT = location.pathname.includes('/asefweb/') ? '/asefweb/' : '/';

  // Devuelve true si el href es externo o especial
  const isExternal = (href) =>
    /^https?:\/\//i.test(href) ||           // http/https
    /^mailto:/i.test(href)   ||             // mailto
    /^tel:/i.test(href)      ||             // tel
    /^#/i.test(href);                        // ancla

  function fixHref(a) {
    const raw = a.getAttribute('href');
    if (!raw) return;
    const href = raw.trim();

    // ignorar externos y anclas
    if (isExternal(href)) return;

    // ya viene correcto con /asefweb/ ó empieza por ROOT → dejar
    if (href.startsWith('/asefweb/') || href.startsWith(ROOT)) return;

    // Si comienza con "/", convertirlo a ROOT + ruta sin barras iniciales
    if (href.startsWith('/')) {
      a.setAttribute('href', ROOT + href.replace(/^\/+/, ''));
      return;
    }

    // Para rutas relativas (pages/..., index.html, etc.)
    // Prefijar con ROOT para evitar /pages/pages/... cuando estamos dentro de /pages/
    if (
      href.endsWith('.html') ||
      href.startsWith('pages/') ||
      href.startsWith('assets/') ||
      href.startsWith('img/') ||
      href.startsWith('./')
    ) {
      const cleaned = href.replace(/^\.\//, ''); // quita "./" inicial
      a.setAttribute('href', ROOT + cleaned);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href]').forEach(fixHref);
  });
})();
