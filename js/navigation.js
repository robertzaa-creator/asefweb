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
      href.startsWith('./pages/') ||
      href.startsWith('pages/') ||
      href.startsWith('assets/') ||
      href.startsWith('img/') ||
      href.startsWith('./')
    ) {
      const cleaned = href.replace(/^\.\//, ''); // quita "./" inicial
      a.setAttribute('href', ROOT + cleaned);
    }
  }

  // =======================================================
  // Aplicar normalización una vez que el DOM está listo
  // =======================================================
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href]').forEach(fixHref);

    // =======================================================
    // 🔹 Control del menú hamburguesa y submenús táctiles
    // =======================================================
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (hamburger && navMenu) {
      // Abrir/cerrar menú principal
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
      });

      // Cerrar menú al hacer clic en cualquier link
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          hamburger.classList.remove('active');
          navMenu.classList.remove('active');
          document.body.classList.remove('no-scroll');
        });
      });
    }

    // Submenús táctiles en móvil con animación
    const dropdowns = document.querySelectorAll('.dropdown > .nav-link');
    dropdowns.forEach(link => {
      link.addEventListener('click', (e) => {
        const parent = link.parentElement;
        const submenu = parent.querySelector('.dropdown-menu');

        if (window.innerWidth < 768 && submenu) {
          e.preventDefault();

          // Cerrar otros dropdowns abiertos
          document.querySelectorAll('.dropdown.open').forEach(d => {
            if (d !== parent) d.classList.remove('open');
          });

          // Alternar este dropdown
          parent.classList.toggle('open');

          // Animación slide suave
          if (parent.classList.contains('open')) {
            submenu.style.maxHeight = submenu.scrollHeight + 'px';
          } else {
            submenu.style.maxHeight = null;
          }
        }
      });
    });

    // =======================================================
    // 🔹 Ajuste visual del botón Acceder (móvil)
    // =======================================================
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      // Asegura clase principal para estilos comunes
      loginBtn.classList.add('btn-primary');
    }
  });

})();
