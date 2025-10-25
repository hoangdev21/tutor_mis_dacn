// Landing Page JavaScript

// FAQ Accordion
document.addEventListener('DOMContentLoaded', function() {
    const faqItems = document.querySelectorAll('.faq__item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq__question');
        question.addEventListener('click', () => {
            item.classList.toggle('active');
        });
    });

    // Hero Search Functionality (placeholder)
    const searchButton = document.querySelector('.search__button');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const subject = document.getElementById('subjectSelect').value;
            const grade = document.getElementById('gradeSelect').value;
            const location = document.getElementById('locationSelect').value;

            // Placeholder for search functionality
            alert(`Tìm kiếm: Môn ${subject}, Lớp ${grade}, Khu vực ${location}`);
        });
    }

    // Smooth scrolling for navigation
    const navLinks = document.querySelectorAll('.sidebar__link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for header
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe sections for animation
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        observer.observe(section);
    });
});