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
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!current) return;
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${current.target.id}`;
        if (active) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }, { threshold: [0.15, 0.35, 0.6], rootMargin: "-18% 0px -58%" });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  const agentStage = document.querySelector("#heroAgentStage");
  const stateButtons = Array.from(document.querySelectorAll("[data-state-control]"));
  const stageTitle = agentStage?.querySelector(".stage-toolbar > span:first-child");
  const stageStatus = agentStage?.querySelector(".stage-status");
  const stageMark = agentStage?.querySelector(".agent-mark--hero");
  const stateOrder = ["ready", "listening", "researching", "verified", "alert"];
  const stateCopy = {
    ready: ["Live mark / Ready", "Ready for a question"],
    listening: ["Live mark / Listening", "Adding your context"],
    researching: ["Live mark / Researching", "Checking sources"],
    verified: ["Live mark / Verified", "Answer ready"],
    alert: ["Live mark / Alert", "New legal alert"]
  };
  let stateTimer;

  /* The mark's motion is driven by CSS custom properties keyed off svg[data-state], so the
     state has to live on the <svg> itself, not only on the stage -- the stage keeps its own
     copy for the source-node and status-dot rules.
     Removing the attribute, forcing layout, then re-applying it restarts the animations from
     zero. Without that, switching state mid-gesture leaves dots stranded wherever the previous
     animation happened to be cut off. */
  const setMarkState = (mark, state) => {
    if (!mark) return;
    mark.removeAttribute("data-state");
    void mark.getBoundingClientRect();
    mark.setAttribute("data-state", state);
  };

  const activateState = (state) => {
    if (!agentStage || !stateCopy[state]) return;
    agentStage.dataset.state = state;
    if (stageTitle) stageTitle.textContent = stateCopy[state][0];
    if (stageStatus) stageStatus.innerHTML = `<i></i>${stateCopy[state][1]}`;
    setMarkState(stageMark, state);
    if (stageMark) stageMark.setAttribute("aria-label", `AgroBot symbol: ${state}`);
    stateButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.stateControl === state)));
  };

  const stopStateCycle = () => window.clearInterval(stateTimer);
  const startStateCycle = () => {
    stopStateCycle();
    if (reduceMotion || !agentStage) return;
    stateTimer = window.setInterval(() => {
      const index = stateOrder.indexOf(agentStage.dataset.state);
      activateState(stateOrder[(index + 1) % stateOrder.length]);
    }, 3200);
  };

  stateButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateState(button.dataset.stateControl);
      startStateCycle();
    });
  });
  agentStage?.addEventListener("pointerenter", stopStateCycle);
  agentStage?.addEventListener("pointerleave", startStateCycle);
  agentStage?.addEventListener("focusin", stopStateCycle);
  agentStage?.addEventListener("focusout", () => window.setTimeout(() => {
    if (!agentStage.contains(document.activeElement)) startStateCycle();
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

  /* Replaces the old background-image swap on .product-demo.is-running: the chat agent's mark
     is the same symbol, so it takes the same data-state the hero does. */
  const chatMark = document.querySelector(".chat-agent .agent-mark");

  const finishDemo = () => {
    productDemo?.classList.remove("is-running");
    setMarkState(chatMark, "verified");
    if (demoStatus) demoStatus.innerHTML = "<i></i>Answer ready · 4 sources checked";
  };

  const runDemo = () => {
    window.clearTimeout(demoTimeout);
    productDemo?.classList.add("is-running");
    setMarkState(chatMark, "researching");
    if (demoStatus) demoStatus.innerHTML = "<i></i>Cross-checking sources and product context";
    if (reduceMotion) {
      finishDemo();
      return;
    }
    demoTimeout = window.setTimeout(finishDemo, 1700);
  };

  replayDemo?.addEventListener("click", runDemo);
})();
