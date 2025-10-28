/*=============== DOM READY ===============*/
document.addEventListener("DOMContentLoaded", () => {
  /*=============== NAV MENU TOGGLE ===============*/
  const navMenu = document.getElementById("nav-menu"),
        navToggle = document.getElementById("nav-toggle"),
        navClose = document.getElementById("nav-close");

  // Show Menu
  if (navToggle) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.add("show-menu");
    });
  }

  // Hide Menu
  if (navClose) {
    navClose.addEventListener("click", () => {
      navMenu.classList.remove("show-menu");
    });
  }

  // Close menu on link click
  const navLinks = document.querySelectorAll(".nav__link");
  navLinks.forEach(link =>
    link.addEventListener("click", () => navMenu.classList.remove("show-menu"))
  );

  /*=============== CHANGE BACKGROUND HEADER ===============*/
  const header = document.getElementById("header");
  const logoTxt = document.getElementById("logo-txt");

  const bgHeader = () => {
    if (window.scrollY >= 50) {
      header.classList.add("bg-header");
      logoTxt.classList.add("logo__colored");
    } else {
      header.classList.remove("bg-header");
      logoTxt.classList.remove("logo__colored");
    }
  };
  window.addEventListener("scroll", bgHeader);

  /*=============== SCROLL UP BUTTON ===============*/
  const scrollUpBtn = document.getElementById("scroll-up");
  const showScrollUp = () => {
    if (window.scrollY >= 350) {
      scrollUpBtn.classList.add("show-scroll");
    } else {
      scrollUpBtn.classList.remove("show-scroll");
    }
  };
  window.addEventListener("scroll", showScrollUp);

  /*=============== ACTIVE NAV LINK ON SCROLL ===============*/
  const sections = document.querySelectorAll("section[id]");

  const scrollActive = () => {
    const scrollY = window.scrollY;
    const headerHeight = header.offsetHeight; // Get actual header height

    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - headerHeight - 10; // Adjust for spacing
      const sectionId = current.getAttribute("id");
      const sectionLink = document.querySelector(`.nav__menu a[href*=${sectionId}]`);

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        sectionLink?.classList.add("active-link");
      } else {
        sectionLink?.classList.remove("active-link");
      }
    });
  };
  window.addEventListener("scroll", scrollActive);

  /*=============== SWIPER SERVICES ===============*/
  if (typeof Swiper !== "undefined") {
    new Swiper(".services__swiper", {
      loop: true,
      grabCursor: true,
      spaceBetween: 24,
      slidesPerView: "auto",
      centeredSlides: true,
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
    });
  }

  /*=============== SCROLL REVEAL ANIMATION ===============*/
  if (typeof ScrollReveal !== "undefined") {
    const sr = ScrollReveal({
      origin: "top",
      distance: "100px",
      duration: 2500,
      delay: 400,
      reset: true,
    });

    sr.reveal(".home__content, .services__data, .services__swiper, .footer__container");
    sr.reveal(".home__images", { origin: "bottom", delay: 1200 });
    sr.reveal(".about__images, .contact__img", { origin: "left" });
    sr.reveal(".about__data, .contact__data", { origin: "right" });
    sr.reveal(".projects__card", { interval: 100 });
  }

  /*=============== FORM SUBMISSION ===============*/
  const form = document.getElementById("enrollForm");
  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();

      const fullName = form.name.value.trim();
      const email = form.email.value.trim();
      const course = form.course.value;

      try {
        const res = await fetch("http://localhost:3000/api/enroll-sqlite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, email, course }),
        });

        if (res.ok) {
          alert("✅ Registered successfully!");
          form.reset();
        } else {
          alert("❌ Failed to register. Please try again.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        alert("⚠️ Server not reachable. Please check your backend.");
      }
    });
  }
});
