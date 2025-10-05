// Main Application Logic
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

    setupContactForm() {
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', async(e) => {
                e.preventDefault();
                await this.handleContactSubmission(e.target);
            });
        }
    }

    async handleContactSubmission(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<span class="loading"></span> Enviando...';
        submitBtn.disabled = true;

        try {
            // Simulate API call - replace with actual endpoint
            await this.simulateAPICall(2000);

            // Save to Firebase (if needed)
            if (window.firebaseDb) {
                await window.firebaseDb.collection('contactMessages').add({
                    ...data,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'new'
                });
            }

            // Success feedback
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

            // Add highlight effect
            if (matches && query.length > 2) {
                this.highlightSearchTerm(item, query);
            }
        });
    }

    highlightSearchTerm(element, term) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;

        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            const parent = textNode.parentNode;
            if (parent.tagName === 'MARK') return; // Skip already highlighted

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

    setupNewsletterForm() {
        const newsletterForm = document.getElementById('newsletterForm');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', async(e) => {
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
            // Save subscription to Firebase
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

    async loadDynamicContent() {
        // Load news articles
        await this.loadNews();

        // Load funeral homes
        await this.loadFuneralHomes();

        // Load events
        await this.loadEvents();
    }

    async loadNews() {
        try {
            // In a real app, this would fetch from API or Firebase
            const newsContainer = document.querySelector('.news-container');
            if (!newsContainer) return;

            // Sample news data
            const news = [{
                    title: 'Nueva Normativa para Servicios Funerarios',
                    excerpt: 'Se establecen nuevos protocolos de calidad para empresas del sector...',
                    date: '2024-12-15',
                    image: 'https://images.pexels.com/photos/4173624/pexels-photo-4173624.jpeg?auto=compress&cs=tinysrgb&w=400'
                },
                {
                    title: 'Capacitación en Atención al Cliente',
                    excerpt: 'Próximo curso sobre excelencia en atención durante procesos de duelo...',
                    date: '2024-12-10',
                    image: 'https://images.pexels.com/photos/5699456/pexels-photo-5699456.jpeg?auto=compress&cs=tinysrgb&w=400'
                }
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

    async loadFuneralHomes() {
        // Sample data - in production this would come from database
        const funeralHomes = [{
                name: 'Funeraria San José',
                location: 'La Plata',
                phone: '(0221) 423-1234',
                services: ['Velatorio', 'Crematorio', 'Traslados']
            },
            {
                name: 'Servicios Funerarios Norte',
                location: 'San Isidro',
                phone: '(011) 4747-5678',
                services: ['Velatorio', 'Sepelio', 'Flores']
            }
        ];

        const container = document.querySelector('.funeral-homes-container');
        if (container) {
            this.renderFuneralHomes(funeralHomes, container);
        }
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

    async loadEvents() {
        const events = [
            {
                title: 'Curso de Tanatopraxia',
                date: '2024-12-20',
                location: 'Sede ASEF',
                type: 'Capacitación'
            },
            {
                title: 'Asamblea General Ordinaria',
                date: '2024-12-25',
                location: 'Salón Principal',
                type: 'Institucional'
            }
        ];

        const container = document.querySelector('.events-container');
        if (container) {
            this.renderEvents(events, container);
        }
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

    setupAccessibilityFeatures() {
        // Keyboard navigation improvements
        this.setupKeyboardNavigation();

        // Skip to content link
        this.createSkipLink();

        // Focus management
        this.manageFocus();
    }

    setupKeyboardNavigation() {
        // Add keyboard support for interactive elements
        document.querySelectorAll('.card, .service-card, .news-card').forEach(element => {
            element.setAttribute('tabindex', '0');

            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const link = element.querySelector('a');
                    if (link) {
                        link.click();
                    }
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
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--primary-color);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 1000;
            transition: top 0.3s;
        `;

        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });

        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });

        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    manageFocus() {
        // Ensure focus is properly managed when modals open/close
        const modal = document.getElementById('loginModal');
        if (modal) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        if (modal.style.display === 'block') {
                            // Focus first input when modal opens
                            const firstInput = modal.querySelector('input');
                            if (firstInput) {
                                setTimeout(() => firstInput.focus(), 100);
                            }
                        }
                    }
                });
            });

            observer.observe(modal, { attributes: true });
        }
    }

    // Utility functions
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getMonthName(monthIndex) {
        const months = [
            'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
        ];
        return months[monthIndex];
    }

    simulateAPICall(delay) {
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    // Public methods for external use
    static showLoading(element) {
        element.innerHTML = '<span class="loading"></span> Cargando...';
        element.disabled = true;
    }

    static hideLoading(element, originalText) {
        element.textContent = originalText;
        element.disabled = false;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn   = document.getElementById('loginBtn');
  const loginModal = document.getElementById('loginModal');
  const closeModal = document.getElementById('closeModal');

  if (!loginBtn || !loginModal) {
    console.info('[main.js] Sin loginBtn o loginModal en esta página (OK).');
    return;
  }

  const showModal = () => {
    // Quita clases de oculto que puedas tener
    loginModal.classList.remove('hidden', 'is-hidden');
    // Agrega clases de visible que puedas usar
    loginModal.classList.add('open', 'is-open', 'show');
    // Fallback inline (por si el CSS depende de display)
    loginModal.style.display = 'block';
    loginModal.removeAttribute('aria-hidden');
  };

  const hideModal = () => {
    loginModal.classList.add('hidden', 'is-hidden');
    loginModal.classList.remove('open', 'is-open', 'show');
    loginModal.style.display = 'none';
    loginModal.setAttribute('aria-hidden', 'true');
  };

  // Abrir modal solo si el botón sigue diciendo “Acceder”
  loginBtn.addEventListener('click', (e) => {
    const label = loginBtn.textContent.trim().toLowerCase();
    if (label === 'acceder') {
      e.preventDefault();
      showModal();
    }
  });

  // Cerrar
  closeModal?.addEventListener('click', hideModal);
  loginModal.addEventListener('click', (e) => { if (e.target === loginModal) hideModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideModal(); });

  console.log('ASEF Website initialized');
});