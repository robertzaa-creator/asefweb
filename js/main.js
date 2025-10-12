// =======================================================
// Main Application Logic - ASEF
// =======================================================
class ASEFApp {
    constructor() {
        this.init();
    }

    init() {
        console.log('ASEF Website initialized');
        this.setupContactForm();
        this.setupSearchFunctionality();
        this.setupNewsletterForm();
        this.loadDynamicContent();
        this.setupAccessibilityFeatures();
    }

    // 📨 Contacto
    setupContactForm() {
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleContactSubmission(e.target);
            });
        }
    }

    async handleContactSubmission(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<span class="loading"></span> Enviando...';
        submitBtn.disabled = true;

        try {
            await this.simulateAPICall(2000);

            if (window.firebaseDb) {
                await window.firebaseDb.collection('contactMessages').add({
                    ...data,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'new'
                });
            }

            if (window.authManager) {
                window.authManager.showNotification('Mensaje enviado correctamente. Nos pondremos en contacto pronto.', 'success');
            }

            form.reset();

        } catch (error) {
            console.error('Error sending message:', error);
            if (window.authManager) {
                window.authManager.showNotification('Error al enviar el mensaje. Intente nuevamente.', 'error');
            }
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    // 🔍 Búsqueda
    setupSearchFunctionality() {
        const searchInputs = document.querySelectorAll('.search-input');
        searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.handleSearch(e.target.value, e.target.dataset.searchType);
            });
        });
    }

    handleSearch(query, type) {
        const resultsContainer = document.querySelector(`[data-search-results="${type}"]`);
        if (!resultsContainer) return;

        const items = resultsContainer.querySelectorAll('.searchable-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            const matches = text.includes(query.toLowerCase());
            item.style.display = matches ? 'block' : 'none';
            if (matches && query.length > 2) this.highlightSearchTerm(item, query);
        });
    }

    highlightSearchTerm(element, term) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) textNodes.push(node);

        textNodes.forEach(textNode => {
            const parent = textNode.parentNode;
            if (parent.tagName === 'MARK') return;
            const text = textNode.textContent;
            const regex = new RegExp(`(${term})`, 'gi');
            if (regex.test(text)) {
                const highlightedText = text.replace(regex, '<mark>$1</mark>');
                const wrapper = document.createElement('span');
                wrapper.innerHTML = highlightedText;
                parent.replaceChild(wrapper, textNode);
            }
        });
    }

    // 📰 Newsletter
    setupNewsletterForm() {
        const newsletterForm = document.getElementById('newsletterForm');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleNewsletterSubscription(e.target);
            });
        }
    }

    async handleNewsletterSubscription(form) {
        const email = form.querySelector('input[type="email"]').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<span class="loading"></span> Suscribiendo...';
        submitBtn.disabled = true;

        try {
            if (window.firebaseDb) {
                await window.firebaseDb.collection('newsletterSubscriptions').add({
                    email: email,
                    subscribedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'active'
                });
            }

            if (window.authManager) {
                window.authManager.showNotification('¡Suscripción exitosa! Recibirá nuestro newsletter.', 'success');
            }

            form.reset();

        } catch (error) {
            console.error('Error subscribing to newsletter:', error);
            if (window.authManager) {
                window.authManager.showNotification('Error en la suscripción. Intente nuevamente.', 'error');
            }
        } finally {
            submitBtn.textContent = 'Suscribirse';
            submitBtn.disabled = false;
        }
    }

    // 📦 Carga de contenido dinámico
    async loadDynamicContent() {
        await this.loadNews();
        await this.loadFuneralHomes();
        await this.loadEvents();
    }

    async loadNews() {
        try {
            const newsContainer = document.querySelector('.news-container');
            if (!newsContainer) return;

            const news = [
                { title: 'Nueva Normativa para Servicios Funerarios', excerpt: 'Se establecen nuevos protocolos...', date: '2024-12-15', image: 'https://images.pexels.com/photos/4173624/pexels-photo-4173624.jpeg?auto=compress&cs=tinysrgb&w=400' },
                { title: 'Capacitación en Atención al Cliente', excerpt: 'Próximo curso sobre excelencia...', date: '2024-12-10', image: 'https://images.pexels.com/photos/5699456/pexels-photo-5699456.jpeg?auto=compress&cs=tinysrgb&w=400' }
            ];

            this.renderNews(news, newsContainer);
        } catch (error) {
            console.error('Error loading news:', error);
        }
    }

    renderNews(news, container) {
        container.innerHTML = news.map(article => `
            <article class="news-card searchable-item">
                <img src="${article.image}" alt="${article.title}">
                <div class="news-content">
                    <span class="news-date">${this.formatDate(article.date)}</span>
                    <h3>${article.title}</h3>
                    <p>${article.excerpt}</p>
                    <a href="pages/prensa.html" class="news-link">Leer más</a>
                </div>
            </article>
        `).join('');
    }

    // ⚰️ Funerarias
    async loadFuneralHomes() {
        const funeralHomes = [
            { name: 'Funeraria San José', location: 'La Plata', phone: '(0221) 423-1234', services: ['Velatorio', 'Crematorio', 'Traslados'] },
            { name: 'Servicios Funerarios Norte', location: 'San Isidro', phone: '(011) 4747-5678', services: ['Velatorio', 'Sepelio', 'Flores'] }
        ];
        const container = document.querySelector('.funeral-homes-container');
        if (container) this.renderFuneralHomes(funeralHomes, container);
    }

    renderFuneralHomes(homes, container) {
        container.innerHTML = homes.map(home => `
            <div class="funeral-home-card searchable-item">
                <h3>${home.name}</h3>
                <p><i class="fas fa-map-marker-alt"></i> ${home.location}</p>
                <p><i class="fas fa-phone"></i> ${home.phone}</p>
                <div class="services">
                    ${home.services.map(service => `<span class="service-tag">${service}</span>`).join('')}
                </div>
            </div>
        `).join('');
    }

    // 📅 Eventos
    async loadEvents() {
        const events = [
            { title: 'Curso de Tanatopraxia', date: '2024-12-20', location: 'Sede ASEF', type: 'Capacitación' },
            { title: 'Asamblea General Ordinaria', date: '2024-12-25', location: 'Salón Principal', type: 'Institucional' }
        ];
        const container = document.querySelector('.events-container');
        if (container) this.renderEvents(events, container);
    }

    renderEvents(events, container) {
        container.innerHTML = events.map(event => `
            <div class="event-card">
                <div class="event-date">
                    <span class="day">${new Date(event.date).getDate()}</span>
                    <span class="month">${this.getMonthName(new Date(event.date).getMonth())}</span>
                </div>
                <div class="event-info">
                    <h4>${event.title}</h4>
                    <p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
                    <span class="event-type">${event.type}</span>
                </div>
            </div>
        `).join('');
    }

    // ♿ Accesibilidad
    setupAccessibilityFeatures() {
        this.setupKeyboardNavigation();
        this.createSkipLink();
        this.manageFocus();
    }

    setupKeyboardNavigation() {
        document.querySelectorAll('.card, .service-card, .news-card').forEach(element => {
            element.setAttribute('tabindex', '0');
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const link = element.querySelector('a');
                    if (link) link.click();
                }
            });
        });
    }

    createSkipLink() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Saltar al contenido principal';
        skipLink.style.cssText = `
            position: absolute; top: -40px; left: 6px;
            background: var(--primary-color); color: white;
            padding: 8px; text-decoration: none;
            border-radius: 4px; z-index: 1000;
            transition: top 0.3s;
        `;
        skipLink.addEventListener('focus', () => skipLink.style.top = '6px');
        skipLink.addEventListener('blur', () => skipLink.style.top = '-40px');
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    manageFocus() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        if (modal.style.display === 'block') {
                            const firstInput = modal.querySelector('input');
                            if (firstInput) setTimeout(() => firstInput.focus(), 100);
                        }
                    }
                });
            });
            observer.observe(modal, { attributes: true });
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    getMonthName(i) {
        const m = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return m[i];
    }

    simulateAPICall(delay) {
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    static showLoading(el) { el.innerHTML = '<span class="loading"></span> Cargando...'; el.disabled = true; }
    static hideLoading(el, txt) { el.textContent = txt; el.disabled = false; }
}

// -------------------------------------------------------
// Modal Acceso
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  const loginModal = document.getElementById('loginModal');
  const closeModal = document.getElementById('closeModal');

  if (!loginBtn || !loginModal) return;

  const showModal = () => {
    loginModal.classList.remove('hidden', 'is-hidden');
    loginModal.classList.add('open', 'is-open', 'show');
    loginModal.style.display = 'block';
  };

  const hideModal = () => {
    loginModal.classList.add('hidden', 'is-hidden');
    loginModal.classList.remove('open', 'is-open', 'show');
    loginModal.style.display = 'none';
  };

  loginBtn.addEventListener('click', (e) => {
    if (loginBtn.textContent.trim().toLowerCase() === 'acceder') {
      e.preventDefault();
      showModal();
    }
  });

  closeModal?.addEventListener('click', hideModal);
  loginModal.addEventListener('click', (e) => { if (e.target === loginModal) hideModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideModal(); });
});

// -------------------------------------------------------
// Firebase: carga solo en páginas específicas o al acceder
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');

  async function loadFirebaseModules() {
    if (window.firebaseApp) {
      console.log('[Firebase] Ya inicializado.');
      return;
    }

    console.log('[Firebase] Cargando SDKs...');
    const scripts = [
      'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
      'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
      'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js',
      'https://www.gstatic.com/firebasejs/8.10.1/firebase-storage.js'
    ];

    for (const src of scripts) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    console.log('[Firebase] SDKs cargados. Inicializando...');
    const scriptInit = document.createElement('script');
    scriptInit.src = 'js/firebase-init.js';
    scriptInit.onload = () => {
      const scriptAuth = document.createElement('script');
      scriptAuth.src = 'js/auth.js';
      document.head.appendChild(scriptAuth);
    };
    document.head.appendChild(scriptInit);
  }

  // 🔸 Detecta si la página necesita Firebase
  const path = window.location.pathname;
  const pagesRequiringFirebase = [
    './pages/contacto.html',
    './pages/socios.html',
    './pages/admin.html'
  ];
  const needsFirebase = pagesRequiringFirebase.some(page => path.endsWith(page) || path.includes(page));

  if (needsFirebase) {
    console.log('[Firebase] Página con Firebase detectada → cargando módulos...');
    loadFirebaseModules();
  }

  // 🔸 También al hacer clic en “Acceder”
  if (loginBtn) {
    loginBtn.addEventListener('click', loadFirebaseModules);
  }
});
