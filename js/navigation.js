// Navigation Management
class NavigationManager {
    constructor() {
        this.hamburger = document.querySelector('.hamburger');
        this.navMenu = document.querySelector('.nav-menu');
        this.header = document.querySelector('.header');
        this.scrollIndicator = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createScrollIndicator();
        this.handleScroll();
        this.setActiveNavLink();
    }

    setupEventListeners() {
        // Mobile menu toggle
        if (this.hamburger && this.navMenu) {
            this.hamburger.addEventListener('click', () => {
                this.toggleMobileMenu();
            });

            // Close menu when clicking on nav links
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    if (this.navMenu.classList.contains('active')) {
                        this.toggleMobileMenu();
                    }
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.nav-container') && this.navMenu.classList.contains('active')) {
                    this.toggleMobileMenu();
                }
            });
        }

        // Scroll events
        window.addEventListener('scroll', () => {
            this.handleScroll();
            this.updateScrollIndicator();
        });

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    this.smoothScrollTo(target);
                }
            });
        });

        // Dropdown menu interactions
        this.setupDropdowns();
    }

    toggleMobileMenu() {
        this.hamburger.classList.toggle('active');
        this.navMenu.classList.toggle('active');
        document.body.style.overflow = this.navMenu.classList.contains('active') ? 'hidden' : 'auto';
    }

    handleScroll() {
        if (window.scrollY > 100) {
            this.header.classList.add('scrolled');
        } else {
            this.header.classList.remove('scrolled');
        }
    }

    createScrollIndicator() {
        this.scrollIndicator = document.createElement('div');
        this.scrollIndicator.className = 'scroll-indicator';
        document.body.appendChild(this.scrollIndicator);
    }

    updateScrollIndicator() {
        const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        this.scrollIndicator.style.width = `${scrolled}%`;
    }

    smoothScrollTo(target) {
        const headerHeight = this.header.offsetHeight;
        const targetPosition = target.offsetTop - headerHeight - 20;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }

    setActiveNavLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            
            if (href && (currentPath.endsWith(href) || (currentPath === '/' && href.includes('index')))) {
                link.classList.add('active');
            }
        });
    }

    setupDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown');
        
        dropdowns.forEach(dropdown => {
            const dropdownMenu = dropdown.querySelector('.dropdown-menu');
            let timeoutId;

            // Mouse events for desktop
            dropdown.addEventListener('mouseenter', () => {
                clearTimeout(timeoutId);
                dropdownMenu.style.display = 'block';
                setTimeout(() => {
                    dropdownMenu.style.opacity = '1';
                    dropdownMenu.style.visibility = 'visible';
                    dropdownMenu.style.transform = 'translateY(0)';
                }, 10);
            });

            dropdown.addEventListener('mouseleave', () => {
                dropdownMenu.style.opacity = '0';
                dropdownMenu.style.visibility = 'hidden';
                dropdownMenu.style.transform = 'translateY(-10px)';
                
                timeoutId = setTimeout(() => {
                    dropdownMenu.style.display = 'none';
                }, 300);
            });

            // Click events for mobile
            const dropdownToggle = dropdown.querySelector('.nav-link');
            dropdownToggle.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    
                    // Toggle this dropdown
                    const isOpen = dropdownMenu.style.display === 'block';
                    
                    // Close all dropdowns first
                    document.querySelectorAll('.dropdown-menu').forEach(menu => {
                        menu.style.display = 'none';
                        menu.style.opacity = '0';
                        menu.style.visibility = 'hidden';
                    });

                    // Open this dropdown if it was closed
                    if (!isOpen) {
                        dropdownMenu.style.display = 'block';
                        setTimeout(() => {
                            dropdownMenu.style.opacity = '1';
                            dropdownMenu.style.visibility = 'visible';
                            dropdownMenu.style.transform = 'translateY(0)';
                        }, 10);
                    }
                }
            });
        });
    }

    // Intersection Observer for scroll animations
    observeElements() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-slide-up');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observe elements that should animate on scroll
        document.querySelectorAll('.service-card, .news-card, .about-text, .about-image').forEach(el => {
            observer.observe(el);
        });
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.navigationManager = new NavigationManager();
    
    // Start observing elements after a short delay
    setTimeout(() => {
        window.navigationManager.observeElements();
    }, 500);
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        document.querySelector('.nav-menu')?.classList.remove('active');
        document.querySelector('.hamburger')?.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
});