(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector("#siteHeader");
  const progress = document.querySelector("#readingProgress");
  const menuToggle = document.querySelector("#menuToggle");
  const mainNav = document.querySelector("#mainNav");

  const closeMenu = () => {
    if (!menuToggle || !mainNav) return;
    menuToggle.setAttribute("aria-expanded", "false");
    mainNav.classList.remove("is-open");
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
    const open = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(open));
    mainNav?.classList.toggle("is-open", open);
    header?.classList.toggle("menu-visible", open);
    document.body.classList.toggle("menu-open", open);
  });
  mainNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
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
    }, { threshold: 0.1, rootMargin: "0px 0px -7%" });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const navLinks = Array.from(document.querySelectorAll(".main-nav a"));
  const sections = document.querySelectorAll("[data-section]");
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const current = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
      if (!current) return;
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${current.target.id}`;
        if (active) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }, { threshold: [0.15, 0.35, 0.6], rootMargin: "-18% 0px -58%" });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  const traceStage = document.querySelector("#heroTraceStage");
  const stateButtons = Array.from(document.querySelectorAll("[data-state-control]"));
  const stageTitle = traceStage?.querySelector(".stage-toolbar > span:first-child");
  const stageStatus = traceStage?.querySelector(".stage-status");
  const stageMark = traceStage?.querySelector(".trace-mark--hero");
  const stateOrder = ["ready", "listening", "researching", "verified", "alert"];
  const stateCopy = {
    ready: ["Live mark / Ready", "Route open for context"],
    listening: ["Live mark / Listening", "Receiving source context"],
    researching: ["Live mark / Researching", "Tracing 3 evidence points"],
    verified: ["Live mark / Verified", "Evidence route ready"],
    alert: ["Live mark / Alert", "New source detected"]
  };
  let stateTimer;

  const activateState = (state) => {
    if (!traceStage || !stateCopy[state]) return;
    traceStage.dataset.state = state;
    if (stageTitle) stageTitle.textContent = stateCopy[state][0];
    if (stageStatus) stageStatus.innerHTML = `<i></i>${stateCopy[state][1]}`;
    if (stageMark) stageMark.setAttribute("aria-label", `AgroBot Evidence Trace symbol: ${state}`);
    stateButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.stateControl === state)));
  };

  const stopStateCycle = () => window.clearInterval(stateTimer);
  const startStateCycle = () => {
    stopStateCycle();
    if (reduceMotion || !traceStage) return;
    stateTimer = window.setInterval(() => {
      const index = stateOrder.indexOf(traceStage.dataset.state);
      activateState(stateOrder[(index + 1) % stateOrder.length]);
    }, 3400);
  };

  stateButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateState(button.dataset.stateControl);
      startStateCycle();
    });
  });
  traceStage?.addEventListener("pointerenter", stopStateCycle);
  traceStage?.addEventListener("pointerleave", startStateCycle);
  traceStage?.addEventListener("focusin", stopStateCycle);
  traceStage?.addEventListener("focusout", () => window.setTimeout(() => {
    if (!traceStage.contains(document.activeElement)) startStateCycle();
  }, 0));
  startStateCycle();

  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  };

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const label = button.querySelector("i");
      const original = label?.textContent || "Copy";
      try {
        await copyText(button.dataset.copy);
        if (label) label.textContent = "Copied";
      } catch (_error) {
        if (label) label.textContent = "Select hex";
      }
      window.setTimeout(() => {
        if (label) label.textContent = original;
      }, 1400);
    });
  });

  const productDemo = document.querySelector("#productDemo");
  const replayDemo = document.querySelector("#replayDemo");
  const demoStatus = document.querySelector("#demoStatus");
  let demoTimeout;

  const finishDemo = () => {
    productDemo?.classList.remove("is-running");
    if (demoStatus) demoStatus.innerHTML = "<i></i>3 evidence points registered · Illustrative example";
  };

  const runDemo = () => {
    window.clearTimeout(demoTimeout);
    productDemo?.classList.add("is-running");
    if (demoStatus) demoStatus.innerHTML = "<i></i>Following source, requirement, and product context";
    if (reduceMotion) {
      finishDemo();
      return;
    }
    demoTimeout = window.setTimeout(finishDemo, 1900);
  };

  replayDemo?.addEventListener("click", runDemo);
})();