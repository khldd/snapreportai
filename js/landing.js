(() => {
  "use strict";

  const header = document.querySelector("#siteHeader");
  const progress = document.querySelector("#pageProgress");
  const menuToggle = document.querySelector("#menuToggle");
  const siteNav = document.querySelector("#siteNav");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const closeMenu = () => {
    if (!menuToggle || !siteNav) return;
    menuToggle.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("is-open");
    header?.classList.remove("menu-visible");
    document.body.classList.remove("menu-open");
  };

  const updateScrollUI = () => {
    const top = window.scrollY;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    header?.classList.toggle("is-scrolled", top > 24);
    if (progress) progress.style.transform = `scaleX(${scrollable > 0 ? Math.min(top / scrollable, 1) : 0})`;
  };

  let scrollTicking = false;
  window.addEventListener("scroll", () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(() => {
      updateScrollUI();
      scrollTicking = false;
    });
  }, { passive: true });
  updateScrollUI();

  menuToggle?.addEventListener("click", () => {
    const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(willOpen));
    siteNav?.classList.toggle("is-open", willOpen);
    header?.classList.toggle("menu-visible", willOpen);
    document.body.classList.toggle("menu-open", willOpen);
  });

  siteNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMenu();
  });

  const revealItems = document.querySelectorAll("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6%" });

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const screenNotes = {
    "myqa-audits-live.png": "Audit portfolios stay visible across standards, progress, and outcomes.",
    "myqa-captureiq-live.png": "Audio sessions become transcripts and structured observations.",
    "myqa-snapinspect-live.png": "Templates, inspections, scores, schedules, and locations share one operational view.",
    "myqa-corrective-live.png": "AI-assisted analysis connects immediate correction to corrective action.",
    "myqa-label-validator-live.png": "Packaging evidence is checked against selected regulatory requirements.",
    "myqa-action-plan-live.png": "Post-audit actions expose ownership, deadlines, status, and effectiveness.",
    "myqa-training-live.png": "Course delivery and team learning remain available from the shared quality workspace.",
    "laern-library-live.png": "The standalone workspace keeps creation, delivery, and learning progress together.",
    "laern-create-live.png": "A source document starts a guided course-building workflow.",
    "laern-storyboard-live.png": "Slides, visuals, and voice-over scripts remain editable before delivery.",
    "laern-preview-live.png": "Generated training videos and quizzes can be reviewed in one course view."
  };

  document.querySelectorAll("[data-gallery]").forEach((gallery) => {
    const buttons = Array.from(gallery.querySelectorAll('[role="tab"]'));
    const image = gallery.querySelector("figure img");
    const captionTitle = gallery.querySelector("figcaption span:first-child");
    const captionNote = gallery.querySelector("figcaption span:last-child");
    const productName = gallery.dataset.gallery === "myqa" ? "myQA.team" : "LÆRN";

    buttons.forEach((button) => {
      button.tabIndex = button.classList.contains("is-active") ? 0 : -1;
      const preloaded = new Image();
      preloaded.src = `assets/products/${button.dataset.screen}`;

      button.addEventListener("click", () => {
        if (button.classList.contains("is-active") || !image) return;

        buttons.forEach((candidate) => {
          const active = candidate === button;
          candidate.classList.toggle("is-active", active);
          candidate.setAttribute("aria-selected", String(active));
          candidate.tabIndex = active ? 0 : -1;
        });

        const swap = () => {
          image.src = `assets/products/${button.dataset.screen}`;
          image.alt = button.dataset.alt || "";
          if (captionTitle) captionTitle.textContent = `${productName} / ${button.textContent.trim()}`;
          if (captionNote) captionNote.textContent = screenNotes[button.dataset.screen] || "";
          gallery.classList.remove("is-changing");
        };

        if (reduceMotion) {
          swap();
        } else {
          gallery.classList.add("is-changing");
          window.setTimeout(swap, 130);
        }
      });

      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const index = buttons.indexOf(button);
        const next = buttons[(index + direction + buttons.length) % buttons.length];
        next.focus();
        next.click();
      });
    });
  });

  const contactForm = document.querySelector("#contactForm");
  const contactStatus = contactForm?.querySelector(".contact-form__status");

  contactForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;

    const fields = new FormData(contactForm);
    const name = fields.get("name")?.trim();
    const email = fields.get("email")?.trim();
    const company = fields.get("company")?.trim() || "Not provided";
    const message = fields.get("message")?.trim();
    const subject = `SnapReport enquiry from ${name}`;
    const body = `Name: ${name}\nEmail: ${email}\nCompany: ${company}\n\nWhat they are working on:\n${message}`;

    if (contactStatus) contactStatus.textContent = "Opening your email app with the message ready to send.";
    window.location.href = `mailto:snapreportai99@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();
