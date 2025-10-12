// Carousel Management
class CarouselManager {
    constructor() {
        this.currentSlide = 0;
        this.slides = document.querySelectorAll('.carousel-slide');
        this.indicators = document.querySelectorAll('.indicator');
        this.totalSlides = this.slides.length;
        this.autoPlayInterval = null;
        this.autoPlayDelay = 5000;
        this.resumeTimeout = null;
        this.init();
    }

    init() {
        if (this.totalSlides === 0) return;

        this.showSlide(0);
        this.startAutoPlay();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const carousel = document.querySelector('.carousel-container');
        if (!carousel) return;

        // 🖱️ Hover (desktop)
        carousel.addEventListener('mouseenter', () => this.pauseAutoPlay());
        carousel.addEventListener('mouseleave', () => this.startAutoPlay());

        // 📱 Swipe (mobile)
        let startX = 0, endX = 0;

        carousel.addEventListener(
            'touchstart',
            (e) => {
                startX = e.touches[0].clientX;
                this.pauseAutoPlay();
            },
            { passive: true }
        );

        carousel.addEventListener(
            'touchmove',
            (e) => {
                endX = e.touches[0].clientX;
            },
            { passive: true }
        );

        carousel.addEventListener(
            'touchend',
            (e) => {
                endX = e.changedTouches[0].clientX;
                this.handleSwipe(startX, endX);
                this.resumeAutoPlay();
            },
            { passive: true }
        );

        // 🎯 Indicadores (manual navigation)
        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                this.pauseAutoPlay();
                this.goToSlide(index);
                this.resumeAutoPlay();
            });
        });

        // ⌨️ Keyboard (desktop)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prevSlide();
            if (e.key === 'ArrowRight') this.nextSlide();
        });
    }

    handleSwipe(startX, endX) {
        const threshold = 50;
        const diff = startX - endX;

        if (Math.abs(diff) > threshold) {
            diff > 0 ? this.nextSlide() : this.prevSlide();
        }
    }

    showSlide(index) {
        this.slides.forEach((slide) => slide.classList.remove('active'));
        this.indicators.forEach((ind) => ind.classList.remove('active'));

        if (this.slides[index]) this.slides[index].classList.add('active');
        if (this.indicators[index]) this.indicators[index].classList.add('active');

        this.currentSlide = index;
    }

    nextSlide() {
        const nextIndex = (this.currentSlide + 1) % this.totalSlides;
        this.showSlide(nextIndex);
    }

    prevSlide() {
        const prevIndex = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
        this.showSlide(prevIndex);
    }

    goToSlide(index) {
        this.showSlide(index);
    }

    startAutoPlay() {
        this.pauseAutoPlay();
        this.autoPlayInterval = setInterval(() => this.nextSlide(), this.autoPlayDelay);
    }

    pauseAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
        if (this.resumeTimeout) {
            clearTimeout(this.resumeTimeout);
            this.resumeTimeout = null;
        }
    }

    resumeAutoPlay(delay = 7000) {
        this.pauseAutoPlay();
        this.resumeTimeout = setTimeout(() => this.startAutoPlay(), delay);
    }
}

// 🌍 Global controls
window.nextSlide = () => window.carousel?.nextSlide();
window.prevSlide = () => window.carousel?.prevSlide();
window.currentSlide = (index) => window.carousel?.goToSlide(index - 1);

// 🚀 Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.carousel = new CarouselManager();
});
