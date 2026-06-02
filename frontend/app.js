document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------
    // 1. Toast Notification Manager
    // ----------------------------------------------------------------
    const toastContainer = document.getElementById('toast-container');

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <span class="toast-msg">${message}</span>
            <button class="toast-close">&times;</button>
        `;
        
        toastContainer.appendChild(toast);

        // Close button click handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            removeToast(toast);
        });

        // Auto remove toast
        setTimeout(() => {
            removeToast(toast);
        }, 4000);
    }

    function removeToast(toast) {
        toast.style.animation = 'fadeOut 0.4s forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }

    // ----------------------------------------------------------------
    // 2. Header Scroll Effect
    // ----------------------------------------------------------------
    const header = document.querySelector('.h1');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // ----------------------------------------------------------------
    // 3. Mobile Navigation Toggle
    // ----------------------------------------------------------------
    const navToggle = document.getElementById('nav-toggle');
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.navbar a');

    if (navToggle && navbar) {
        navToggle.addEventListener('click', () => {
            navbar.classList.toggle('active');
            const icon = navToggle.querySelector('i');
            if (navbar.classList.contains('active')) {
                icon.className = 'bx bx-x';
            } else {
                icon.className = 'bx bx-menu';
            }
        });

        // Close menu when clicking a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navbar.classList.remove('active');
                navToggle.querySelector('i').className = 'bx bx-menu';
            });
        });
    }

    // ----------------------------------------------------------------
    // 4. Testimonials Slider
    // ----------------------------------------------------------------
    const slides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('.slider-dots .dot');
    const prevBtn = document.querySelector('.prev-slide');
    const nextBtn = document.querySelector('.next-slide');
    let currentSlide = 0;
    let slideInterval;

    function goToSlide(n) {
        slides[currentSlide].classList.remove('active');
        dots[currentSlide].classList.remove('active');
        currentSlide = (n + slides.length) % slides.length;
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }

    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    function prevSlide() {
        goToSlide(currentSlide - 1);
    }

    function startSlideShow() {
        slideInterval = setInterval(nextSlide, 6000);
    }

    function stopSlideShow() {
        clearInterval(slideInterval);
    }

    if (slides.length > 0) {
        // Next & Prev controls
        if (nextBtn) nextBtn.addEventListener('click', () => {
            nextSlide();
            stopSlideShow();
            startSlideShow();
        });
        if (prevBtn) prevBtn.addEventListener('click', () => {
            prevSlide();
            stopSlideShow();
            startSlideShow();
        });

        // Dot controls
        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                const slideIndex = parseInt(e.target.dataset.slide);
                goToSlide(slideIndex);
                stopSlideShow();
                startSlideShow();
            });
        });

        // Initialize slideshow
        startSlideShow();
    }

    // ----------------------------------------------------------------
    // 5. Booking Price Calculator
    // ----------------------------------------------------------------
    const bookingPackageSelect = document.getElementById('booking-package');
    const bookingGuestsInput = document.getElementById('booking-guests');
    const calculatedPriceDisplay = document.getElementById('calculated-price');
    const packageCardsBtns = document.querySelectorAll('.select-pkg-btn');
    const packagePrices = {
        adventure: 499,
        relaxation: 599,
        culture: 449
    };

    function updateEstimatedPrice() {
        const selectedPackage = bookingPackageSelect.value;
        const guests = parseInt(bookingGuestsInput.value) || 1;
        
        if (selectedPackage && packagePrices[selectedPackage]) {
            const pricePerPerson = packagePrices[selectedPackage];
            const totalPrice = pricePerPerson * guests;
            calculatedPriceDisplay.textContent = `$${totalPrice}`;
            calculatedPriceDisplay.classList.add('pulse');
            setTimeout(() => calculatedPriceDisplay.classList.remove('pulse'), 500);
        } else {
            calculatedPriceDisplay.textContent = '$0';
        }
    }

    if (bookingPackageSelect && bookingGuestsInput) {
        bookingPackageSelect.addEventListener('change', updateEstimatedPrice);
        bookingGuestsInput.addEventListener('input', updateEstimatedPrice);
    }

    // "Select Package" CTA buttons on cards
    packageCardsBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pkgValue = e.target.dataset.packageVal;
            if (bookingPackageSelect) {
                bookingPackageSelect.value = pkgValue;
                updateEstimatedPrice();
                // Scroll smoothly to form
                const bookingForm = document.getElementById('booking-form');
                if (bookingForm) {
                    bookingForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    });

    // ----------------------------------------------------------------
    // 6. Form Submission Handlers (AJAX to Express Server)
    // ----------------------------------------------------------------

    // 6a. Subscribe Newsletter
    const subscribeForm = document.getElementById('subscribe-form');
    if (subscribeForm) {
        subscribeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('subscribe-email');
            const email = emailInput.value.trim();

            if (!email) return;

            try {
                const response = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (response.ok) {
                    showToast(data.message || 'Successfully subscribed!', 'success');
                    subscribeForm.reset();
                } else {
                    showToast(data.error || 'Failed to subscribe.', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Server connection error. Please try again.', 'error');
            }
        });
    }

    // 6b. Tour Booking Form
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('booking-name').value.trim();
            const email = document.getElementById('booking-email').value.trim();
            const packageVal = bookingPackageSelect.value;
            const guests = parseInt(bookingGuestsInput.value) || 1;
            const date = document.getElementById('booking-date').value;

            if (!name || !email || !packageVal || !date) {
                showToast('Please fill out all fields.', 'error');
                return;
            }

            try {
                const response = await fetch('/api/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, package: packageVal, guests, date })
                });

                const data = await response.json();

                if (response.ok) {
                    showToast(data.message || 'Booking request sent successfully!', 'success');
                    bookingForm.reset();
                    if (calculatedPriceDisplay) calculatedPriceDisplay.textContent = '$0';
                } else {
                    showToast(data.error || 'Booking request failed.', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Server connection error. Please try again.', 'error');
            }
        });
    }

    // 6c. Contact Form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('contact-name').value.trim();
            const email = document.getElementById('contact-email').value.trim();
            const message = document.getElementById('contact-message').value.trim();

            if (!name || !email || !message) {
                showToast('Please fill out all fields.', 'error');
                return;
            }

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, message })
                });

                const data = await response.json();

                if (response.ok) {
                    showToast(data.message || 'Message sent successfully!', 'success');
                    contactForm.reset();
                } else {
                    showToast(data.error || 'Failed to send message.', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Server connection error. Please try again.', 'error');
            }
        });
    }

    // ----------------------------------------------------------------
    // 7. Lightbox Modal Gallery
    // ----------------------------------------------------------------
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');
    const triggers = document.querySelectorAll('.lightbox-trigger');

    if (lightboxModal && lightboxImg && lightboxClose) {
        triggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                lightboxModal.style.display = 'flex';
                lightboxImg.src = e.target.src;
                lightboxCaption.textContent = e.target.alt || 'Blink Bali View';
                document.body.style.overflow = 'hidden'; // Lock background scroll
            });
        });

        // Close lightbox function
        const closeLightbox = () => {
            lightboxModal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Unlock background scroll
        };

        lightboxClose.addEventListener('click', closeLightbox);
        
        // Close when clicking outside the content image
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                closeLightbox();
            }
        });

        // Close with Escape key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightboxModal.style.display === 'flex') {
                closeLightbox();
            }
        });
    }
});
