/* ============================================
   SMART ATTENDANCE SYSTEM - JAVASCRIPT
   Animations, Navigation, Scroll Effects
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- Navbar scroll effect ---
  const navbar = document.getElementById('navbar');
  const handleNavScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  };
  window.addEventListener('scroll', handleNavScroll);
  handleNavScroll();

  // --- Mobile menu toggle ---
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    navToggle.classList.toggle('active');
  });

  // Close mobile menu on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      navToggle.classList.remove('active');
    });
  });

  // --- Intersection Observer for scroll animations ---
  const animatedElements = document.querySelectorAll(
    '.fade-up, .content-card, .problem-card, .objective-item, ' +
    '.arch-step, .tech-card, .timeline-item, .feature-card, ' +
    '.future-item, .app-card, .split-card, .conclusion-box'
  );

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Stagger delay based on sibling index within its grid
        const parent = entry.target.parentElement;
        const siblings = Array.from(parent.children).filter(
          child => child.classList.contains(entry.target.classList[0])
        );
        const siblingIndex = siblings.indexOf(entry.target);
        const delay = siblingIndex * 80;

        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);

        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  animatedElements.forEach(el => observer.observe(el));

  // --- Active nav link highlighting ---
  const sections = document.querySelectorAll('.section, .hero');
  const navLinksAll = document.querySelectorAll('.nav-links a');

  const highlightNav = () => {
    let currentSection = '';
    sections.forEach(section => {
      const top = section.offsetTop - 120;
      if (window.scrollY >= top) {
        currentSection = section.getAttribute('id');
      }
    });

    navLinksAll.forEach(link => {
      link.classList.remove('active-link');
      if (link.getAttribute('href') === '#' + currentSection) {
        link.classList.add('active-link');
      }
    });
  };

  window.addEventListener('scroll', highlightNav);

  // --- Smooth scroll for all anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offsetTop = target.offsetTop - 80;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }
    });
  });

  // --- Counter animation for hero stats ---
  const animateValue = (element, start, end, duration, suffix = '') => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.floor(eased * (end - start) + start);
      element.textContent = current + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  };

  // Observe hero stats
  const statsSection = document.querySelector('.hero-stats');
  if (statsSection) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const values = entry.target.querySelectorAll('.stat-value');
          values.forEach(val => {
            const text = val.textContent.trim();
            if (text === '99%') {
              animateValue(val, 0, 99, 1500, '%');
            } else if (text === '0') {
              val.textContent = '0';
            }
          });
          statsObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statsObserver.observe(statsSection);
  }

  // --- Typing effect for badge ---
  const badge = document.querySelector('.badge');
  if (badge) {
    const originalText = badge.textContent;
    badge.textContent = '';
    badge.classList.add('visible');
    badge.style.opacity = '1';
    badge.style.transform = 'translateY(0)';

    let charIndex = 0;
    const type = () => {
      if (charIndex < originalText.length) {
        badge.textContent += originalText.charAt(charIndex);
        charIndex++;
        setTimeout(type, 40);
      }
    };
    setTimeout(type, 600);
  }

  // --- Parallax subtle effect on hero orbs ---
  const orbs = document.querySelectorAll('.orb');
  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;

    orbs.forEach((orb, i) => {
      const factor = (i + 1) * 12;
      orb.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
    });
  });

});
