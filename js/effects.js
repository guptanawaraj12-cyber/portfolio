(() => {
  "use strict";

  const CONTACT_ENDPOINT = "https://formspree.io/f/xkjrqoky";

  const EFFECTS = Object.freeze({
    introGate: true,
    heroWords: true,
    logoDotHop: true,
    pointerFill: true,
    arrowSlide: true,
    cursorLabel: true,
    spotlight: true,
    inertiaScroll: true,
    wordClipReveals: true,
    scrollPalette: true,
    sectionRail: true,
    scrollProgress: true,
    projectIndex: true,
    particleMorph: true,
    menuOverlay: true,
    projectRows: true,
    expandablePanels: true,
    aboutMotto: true,
    testimonialsCarousel: true,
    contactChat: true
  });

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  function initIntroGate() {
    const intro = document.querySelector(".loading-intro");
    if (!EFFECTS.introGate || !intro || root.dataset.introGate !== "show") return;

    const count = intro.querySelector(".effects-intro-count");
    const bar = intro.querySelector(".effects-intro-bar");
    let frame = 0;
    const start = performance.now();
    window.__portfolioIntroProgressStartedAt = start;
    const duration = window.__portfolioIntroDuration || 700;
    const tick = (now) => {
      if (window.__portfolioIntroDone || !intro.isConnected) return;
      const progressValue = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progressValue) ** 3;
      count.textContent = `${Math.round(eased * 100)}%`;
      bar.style.transform = `scaleX(${eased})`;
      if (progressValue >= 1) window.__portfolioIntroFinish();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener("portfolio:introfinish", () => cancelAnimationFrame(frame), { once: true });
  }

  function initHeroWords() {
    if (!EFFECTS.heroWords) return;

    let wordIndex = 0;
    document.querySelectorAll(".hero-title .split-text").forEach((line) => {
      const words = line.textContent.trim().split(/\s+/).filter(Boolean);
      const fragment = document.createDocumentFragment();
      words.forEach((word) => {
        const wordElement = document.createElement("span");
        wordElement.className = "hero-word";
        wordElement.style.setProperty("--word-index", String(wordIndex));
        wordElement.textContent = word;
        fragment.append(wordElement);
        wordIndex += 1;
      });
      line.replaceChildren(fragment);
    });

    root.classList.add("effects-phase1-hero");
  }

  function initLogoDotHop() {
    if (EFFECTS.logoDotHop) root.classList.add("effects-logo-hop");
  }

  function initPointerFill() {
    if (!EFFECTS.pointerFill || !finePointer.matches || reducedMotion.matches) return;

    const fillTargets = document.querySelectorAll(
      ".button:not(:disabled), .theme-toggle, .dock a, .text-link, .footer-links a, .back-top"
    );
    fillTargets.forEach((target) => {
      target.classList.add("effects-fill");
      if (target.matches(".button, .theme-toggle")) target.classList.add("effects-button");
      if (EFFECTS.arrowSlide && target.querySelector('[aria-hidden="true"]')) {
        target.querySelectorAll('[aria-hidden="true"]').forEach((arrow) => arrow.classList.add("effects-arrow"));
      }

      const updateFillOrigin = (event) => {
        const rect = target.getBoundingClientRect();
        const size = Math.ceil(Math.hypot(rect.width, rect.height) * 2);
        target.style.setProperty("--effects-fill-x", `${event.clientX - rect.left}px`);
        target.style.setProperty("--effects-fill-y", `${event.clientY - rect.top}px`);
        target.style.setProperty("--effects-fill-size", `${size}px`);
      };

      target.addEventListener("pointerenter", updateFillOrigin, { passive: true });
      target.addEventListener("pointermove", updateFillOrigin, { passive: true });
    });
  }

  function initCursorLabel() {
    if (!EFFECTS.cursorLabel || !finePointer.matches || reducedMotion.matches) return;
    const cursor = document.querySelector(".custom-cursor");
    if (!cursor) return;

    const label = document.createElement("span");
    label.className = "effects-cursor-label-text";
    label.setAttribute("aria-hidden", "true");
    cursor.append(label);
    cursor.classList.add("effects-cursor-label");

    const getInteractive = (node) => node instanceof Element
      ? node.closest("a, button, input, textarea, [role='button']")
      : null;

    const updateLabel = (target) => {
      if (!target) {
        cursor.classList.remove("is-labeled");
        return;
      }
      label.textContent = target.closest(".project-card") ? "View" : "Open";
      cursor.classList.add("is-labeled");
    };

    document.addEventListener("pointerover", (event) => {
      updateLabel(getInteractive(event.target));
    });

    document.addEventListener("pointerout", (event) => {
      const next = event.relatedTarget;
      updateLabel(getInteractive(next));
    });
  }

  function initSpotlight() {
    if (!EFFECTS.spotlight || !finePointer.matches || reducedMotion.matches) return;

    document.querySelectorAll("main section, .project-card").forEach((target) => {
      target.classList.add("effects-spotlight");
      target.addEventListener("pointerenter", () => target.classList.add("is-spotlit"), { passive: true });
      target.addEventListener("pointerleave", () => target.classList.remove("is-spotlit"), { passive: true });

      let frame = 0;
      let x = 0;
      let y = 0;
      target.addEventListener("pointermove", (event) => {
        const rect = target.getBoundingClientRect();
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          target.style.setProperty("--effects-spot-x", `${x}px`);
          target.style.setProperty("--effects-spot-y", `${y}px`);
          frame = 0;
        });
      }, { passive: true });
    });
  }

  function initInertiaScroll() {
    if (!EFFECTS.inertiaScroll || reducedMotion.matches ||
      !finePointer.matches || !("onscrollend" in window || "requestAnimationFrame" in window)) return;

    let velocity = 0;
    let frame = 0;
    let findActive = false;
    const scrollKeys = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"]);

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      velocity = 0;
      root.classList.remove("phase2-inertia-scroll");
    };

    const step = () => {
      frame = 0;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const next = window.scrollY + velocity;
      if (next <= 0 || next >= maxScroll) velocity = 0;
      window.scrollTo(0, Math.max(0, Math.min(maxScroll, next)));
      velocity *= 0.9;
      if (Math.abs(velocity) > 0.65) frame = requestAnimationFrame(step);
      else stop();
    };

    window.addEventListener("wheel", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (root.classList.contains("effects-menu-open")) {
        if (event.cancelable) event.preventDefault();
        stop();
        return;
      }
      if (findActive || !event.cancelable || event.ctrlKey ||
        (target && target.closest("input, textarea, select, [contenteditable='true']")) ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerHeight : 1;
      const delta = event.deltaY * unit;
      if (!delta) return;

      event.preventDefault();
      root.classList.add("phase2-inertia-scroll");
      velocity = Math.max(-48, Math.min(48, velocity + delta * 0.22));
      if (!frame) frame = requestAnimationFrame(step);
    }, { passive: false });

    window.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        findActive = true;
        stop();
      } else if (event.key === "Escape") {
        findActive = false;
      } else if (scrollKeys.has(event.key) || event.code === "Space") {
        stop();
      }
    }, true);

    window.addEventListener("blur", () => {
      findActive = true;
      stop();
    });
    window.addEventListener("focus", () => { findActive = false; });
    window.addEventListener("hashchange", stop);
    window.addEventListener("popstate", stop);
    window.addEventListener("pageshow", stop);
    document.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a[href]")) stop();
    }, true);
    window.addEventListener("scroll", () => {
      if (!frame && root.classList.contains("phase2-inertia-scroll")) stop();
    }, { passive: true });
  }

  function initWordClipReveals() {
    if (!EFFECTS.wordClipReveals) return;

    const headingSelector = "main .reveal h1:not(.hero-title), main .reveal h2, main .reveal h3";
    const wordSelector = `${headingSelector}, main .reveal p:not(.eyebrow)`;
    document.querySelectorAll(headingSelector).forEach((heading) => {
      heading.classList.add("phase2-clip-heading");
    });

    document.querySelectorAll(wordSelector).forEach((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) {
        if (walker.currentNode.textContent.trim()) textNodes.push(walker.currentNode);
      }

      textNodes.forEach((textNode) => {
        const fragment = document.createDocumentFragment();
        const tokens = textNode.textContent.match(/\s+|\S+/g) || [];
        let wordIndex = 0;
        tokens.forEach((token) => {
          if (/^\s+$/.test(token)) {
            fragment.append(document.createTextNode(token));
            return;
          }
          const word = document.createElement("span");
          word.className = "phase2-word";
          word.style.setProperty("--word-index", String(wordIndex));
          word.textContent = token;
          fragment.append(word);
          wordIndex += 1;
        });
        textNode.replaceWith(fragment);
      });
    });

    document.querySelectorAll(
      "main .reveal .project-art, main .reveal[data-particle-portrait], main .reveal.portrait-frame"
    ).forEach((image) => image.classList.add("phase2-clip-image"));
  }

  function initScrollPalette() {
    if (!EFFECTS.scrollPalette || reducedMotion.matches) return;
    const sections = Array.from(document.querySelectorAll("[data-scroll-theme]"));
    if (!sections.length) return;

    let manualOverride = false;
    let hasScrolled = window.scrollY > 0;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (manualOverride || !hasScrolled) return;
      const marker = window.innerHeight * 0.5;
      let active = sections[0];
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= marker) active = section;
      });
      const theme = active.dataset.scrollTheme;
      if (theme === "light" || theme === "dark") {
        if (root.dataset.theme !== theme) {
          root.dataset.theme = theme;
          document.dispatchEvent(new CustomEvent("portfolio:themechange", {
            detail: { theme, source: "scroll" }
          }));
        }
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", () => {
      hasScrolled = true;
      schedule();
    }, { passive: true });
    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(schedule, { rootMargin: "-48% 0px -48% 0px", threshold: 0 })
      : null;
    if (observer) sections.forEach((section) => observer.observe(section));
    window.addEventListener("resize", schedule, { passive: true });

    document.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest(".theme-toggle")) {
        manualOverride = true;
        observer?.disconnect();
      }
    }, true);
    update();
  }

  function initScrollProgress() {
    if (!EFFECTS.scrollProgress) return null;
    const progress = document.createElement("div");
    progress.className = "phase2-scroll-progress";
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "Page scroll progress");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    const fill = document.createElement("span");
    fill.className = "phase2-scroll-progress-fill";
    progress.append(fill);
    document.body.append(progress);

    return () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const value = maxScroll > 0 ? Math.max(0, Math.min(1, window.scrollY / maxScroll)) : 0;
      fill.style.transform = `scaleX(${value})`;
      progress.setAttribute("aria-valuenow", String(Math.round(value * 100)));
    };
  }

  function initSectionRail() {
    if (!EFFECTS.sectionRail) return null;
    const sections = Array.from(document.querySelectorAll("[data-rail-label][id]"));
    if (!sections.length) return null;

    const rail = document.createElement("nav");
    rail.className = "phase2-section-rail";
    rail.setAttribute("aria-label", "Page sections");
    const links = sections.map((section) => {
      const link = document.createElement("a");
      link.className = "phase2-section-rail-link";
      link.href = `#${section.id}`;
      link.setAttribute("aria-label", section.dataset.railLabel);
      const dot = document.createElement("span");
      dot.className = "phase2-section-rail-dot";
      dot.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.className = "phase2-section-rail-label";
      label.textContent = section.dataset.railLabel;
      link.append(dot, label);
      rail.append(link);
      return { section, link };
    });
    document.body.append(rail);

    return () => {
      const marker = window.innerHeight * 0.5;
      let active = links[0].section;
      links.forEach(({ section }) => {
        if (section.getBoundingClientRect().top <= marker) active = section;
      });
      links.forEach(({ section, link }) => {
        if (section === active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };
  }

  function initProjectIndex() {
    if (!EFFECTS.projectIndex) return null;
    const grid = document.querySelector(".project-page-grid");
    const cards = Array.from(grid?.querySelectorAll(".project-card[id]") || []);
    if (!grid || !cards.length) return null;

    const index = document.createElement("nav");
    index.className = "phase2-project-index";
    index.setAttribute("aria-label", "Project index");
    const label = document.createElement("p");
    label.className = "phase2-project-index-label";
    label.textContent = "Projects";
    index.append(label);
    const links = cards.map((card, position) => {
      const link = document.createElement("a");
      link.href = `#${card.id}`;
      link.textContent = `${String(position + 1).padStart(2, "0")} / ${card.querySelector("h2")?.textContent.trim() || card.id}`;
      index.append(link);
      return { card, link };
    });
    grid.parentNode.insertBefore(index, grid);

    return () => {
      const marker = window.innerHeight * 0.55;
      let active = links[0].card;
      links.forEach(({ card }) => {
        if (card.getBoundingClientRect().top <= marker) active = card;
      });
      links.forEach(({ card, link }) => {
        if (card === active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };
  }

  function initParticleMorph() {
    if (!EFFECTS.particleMorph || reducedMotion.matches) return;

    const containers = Array.from(document.querySelectorAll("[data-particle-portrait]"));
    const portraits = window.portfolioParticlePortraits || [];
    const labels = ["portrait", "name", "laptop"];
    containers.forEach((container, index) => {
      const portrait = portraits[index];
      if (!portrait?.enableMorph()) return;

      container.dataset.particleScene = "portrait";
      const button = document.createElement("button");
      button.className = "effects-morph-control";
      button.type = "button";
      button.textContent = "Scene: portrait";
      button.setAttribute("aria-label", "Change particle scene; current scene: portrait");
      container.append(button);

      let scene = 0;
      const updateScene = (event) => {
        scene = event.detail.scene;
        const label = labels[scene];
        button.textContent = `Scene: ${label}`;
        button.setAttribute("aria-label", `Change particle scene; current scene: ${label}`);
      };
      container.addEventListener("portfolio:particlescenechange", updateScene);
      button.addEventListener("click", () => portrait.setScene((scene + 1) % labels.length));
    });
  }

  function initMenuOverlay() {
    if (!EFFECTS.menuOverlay) return;
    const header = document.querySelector(".site-header");
    const dock = document.querySelector(".dock");
    const themeToggle = header?.querySelector(".theme-toggle");
    if (!header || !dock || !themeToggle) return;

    const menuButton = document.createElement("button");
    menuButton.className = "menu-toggle nav-item effects-menu-toggle";
    menuButton.type = "button";
    menuButton.textContent = "Menu";
    menuButton.setAttribute("aria-controls", "effects-site-menu");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation menu");
    menuButton.style.animationDelay = "0.46s";
    themeToggle.style.animationDelay = "0.6s";
    header.insertBefore(menuButton, themeToggle);

    const overlay = document.createElement("div");
    overlay.className = "effects-menu-overlay";
    overlay.id = "effects-site-menu";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "effects-menu-title");

    const closeButton = document.createElement("button");
    closeButton.className = "effects-menu-close";
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.setAttribute("aria-label", "Close navigation menu");

    const content = document.createElement("div");
    content.className = "effects-menu-content";
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Navigation";
    const title = document.createElement("h2");
    title.id = "effects-menu-title";
    title.textContent = "Where to next?";
    const navigation = document.createElement("nav");
    navigation.className = "effects-menu-links";
    navigation.setAttribute("aria-label", "Full-screen navigation");

    Array.from(dock.querySelectorAll("a[href]")).forEach((source, index) => {
      const link = document.createElement("a");
      link.className = "effects-menu-link";
      link.href = source.getAttribute("href");
      link.textContent = source.querySelector("span:last-child")?.textContent.trim() || source.textContent.trim();
      link.style.setProperty("--menu-index", String(index));
      navigation.append(link);
    });

    const marquee = document.createElement("div");
    marquee.className = "effects-menu-marquee";
    marquee.setAttribute("aria-hidden", "true");
    const marqueeTrack = document.createElement("div");
    marqueeTrack.className = "effects-menu-marquee-track";
    for (let index = 0; index < 3; index += 1) {
      const name = document.createElement("span");
      name.textContent = "Nawaraj Gupta · Nawaraj Gupta · ";
      marqueeTrack.append(name);
    }
    marquee.append(marqueeTrack);
    content.append(eyebrow, title, navigation, marquee);
    overlay.append(closeButton, content);
    document.body.append(overlay);
    root.classList.add("effects-menu-ready");

    let isOpen = false;
    let isClosing = false;
    const backgroundStates = Array.from(document.body.children)
      .filter((child) => child !== overlay)
      .map((child) => ({ child, inert: child.inert }));
    const focusableItems = () => Array.from(
      overlay.querySelectorAll("button:not(:disabled), a[href]")
    ).filter((item) => item.getClientRects().length);

    const setBackgroundInert = (inert) => {
      backgroundStates.forEach(({ child, inert: wasInert }) => {
        child.inert = inert ? true : wasInert;
      });
    };

    const closeMenu = () => {
      if (!isOpen || isClosing) return;
      isClosing = true;
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation menu");
      overlay.classList.remove("is-open");

      const finishClose = () => {
        if (!isClosing) return;
        isOpen = false;
        isClosing = false;
        root.classList.remove("effects-menu-open");
        setBackgroundInert(false);
        overlay.hidden = true;
        menuButton.focus();
      };
      if (reducedMotion.matches) {
        finishClose();
        return;
      }
      const onTransitionEnd = (event) => {
        if (event.target === overlay && event.propertyName === "clip-path") {
          overlay.removeEventListener("transitionend", onTransitionEnd);
          finishClose();
        }
      };
      overlay.addEventListener("transitionend", onTransitionEnd);
      window.setTimeout(() => {
        overlay.removeEventListener("transitionend", onTransitionEnd);
        finishClose();
      }, 900);
    };

    const openMenu = () => {
      if (isOpen) return;
      isOpen = true;
      const rect = menuButton.getBoundingClientRect();
      overlay.style.setProperty("--menu-origin-x", `${rect.left + rect.width / 2}px`);
      overlay.style.setProperty("--menu-origin-y", `${rect.top + rect.height / 2}px`);
      overlay.hidden = false;
      setBackgroundInert(true);
      root.classList.add("effects-menu-open");
      menuButton.setAttribute("aria-expanded", "true");
      menuButton.setAttribute("aria-label", "Close navigation menu");
      requestAnimationFrame(() => {
        overlay.classList.add("is-open");
        focusableItems()[1]?.focus();
      });
    };

    menuButton.addEventListener("click", () => {
      if (isOpen) closeMenu();
      else openMenu();
    });
    closeButton.addEventListener("click", closeMenu);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("a[href]")) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (!isOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusableItems();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }, true);
  }

  function initProjectRows() {
    if (!EFFECTS.projectRows) return;
    const cards = document.querySelectorAll(".project-page-grid .project-card-static");
    cards.forEach((card) => {
      const art = card.querySelector(".project-art");
      if (!art) return;
      const content = document.createElement("div");
      content.className = "effects-project-row-content";
      Array.from(card.children).forEach((child) => {
        if (child !== art) content.append(child);
      });

      const description = content.querySelector("p");
      if (description && !description.id) description.id = `${card.id || "project"}-description`;
      const toggle = document.createElement("button");
      toggle.className = "effects-project-details-toggle";
      toggle.type = "button";
      toggle.textContent = "Show details";
      toggle.setAttribute("aria-expanded", "false");
      if (description) toggle.setAttribute("aria-controls", description.id);
      toggle.addEventListener("click", () => {
        const expanded = card.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(expanded));
        toggle.textContent = expanded ? "Hide details" : "Show details";
      });
      content.append(toggle);
      card.replaceChildren(art, content);
      card.classList.add("effects-project-row");
    });
  }

  function initExpandablePanels() {
    if (!EFFECTS.expandablePanels) return;
    const grid = document.querySelector(".project-grid");
    if (!grid) return;
    grid.classList.add("effects-expandable-projects");
    grid.querySelectorAll(".project-card").forEach((card) => {
      card.classList.add("effects-expandable-card");
      const status = card.querySelector(".card-meta span:first-child");
      if (!status || status.querySelector(".effects-panel-pulse")) return;
      const pulse = document.createElement("span");
      pulse.className = "effects-panel-pulse";
      pulse.setAttribute("aria-hidden", "true");
      status.prepend(pulse);
    });
  }

  function initAboutMotto() {
    if (!EFFECTS.aboutMotto) return;
    const motto = document.querySelector("[data-about-motto]");
    if (!motto) return;

    const button = document.createElement("button");
    button.className = "effects-about-motto";
    button.type = "button";
    button.textContent = motto.textContent.trim();
    button.setAttribute("aria-label", "Highlight the motto: the best chapters are yet to come");
    motto.replaceWith(button);

    let resetTimer = 0;
    let nudgeTimer = 0;
    let nudgeInterval = 0;
    let nudgeResetTimer = 0;
    const stopNudges = () => {
      window.clearTimeout(nudgeTimer);
      window.clearInterval(nudgeInterval);
      window.clearTimeout(nudgeResetTimer);
      button.classList.remove("is-nudging");
    };
    const nudge = () => {
      if (reducedMotion.matches) return;
      button.classList.remove("is-nudging");
      requestAnimationFrame(() => button.classList.add("is-nudging"));
      window.clearTimeout(nudgeResetTimer);
      nudgeResetTimer = window.setTimeout(() => button.classList.remove("is-nudging"), 500);
    };
    const startNudges = () => {
      if (reducedMotion.matches || nudgeTimer || nudgeInterval) return;
      nudgeTimer = window.setTimeout(() => {
        nudgeTimer = 0;
        nudge();
        nudgeInterval = window.setInterval(nudge, 3000);
      }, 600);
    };
    const animateMotto = () => {
      button.classList.add("is-activated");
      if (reducedMotion.matches) return;
      button.classList.remove("is-shaking");
      requestAnimationFrame(() => button.classList.add("is-shaking"));
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => button.classList.remove("is-shaking"), 500);
    };
    button.addEventListener("click", animateMotto);
    button.addEventListener("pointerenter", () => {
      if (finePointer.matches) animateMotto();
    });
    reducedMotion.addEventListener?.("change", (event) => {
      if (event.matches) stopNudges();
      else startNudges();
    });
    startNudges();
  }

  function initTestimonialsCarousel() {
    if (!EFFECTS.testimonialsCarousel) return;
    const carousel = document.querySelector("[data-testimonials-carousel]");
    if (!carousel) return;

    const slides = Array.from(carousel.querySelectorAll("[data-testimonial-slide]"));
    const controls = carousel.querySelector("[data-testimonials-controls]");
    const progress = carousel.querySelector("[data-testimonials-progress]");
    const status = carousel.querySelector("[data-testimonials-status]");
    if (slides.length < 2 || !controls || !progress || !status) return;

    controls.hidden = false;
    let activeIndex = 0;
    let timer = 0;
    const pauseReasons = new Set();
    const pause = (reason) => {
      pauseReasons.add(reason);
      window.clearTimeout(timer);
      carousel.classList.add("is-paused");
    };
    const resume = (reason) => {
      pauseReasons.delete(reason);
      if (pauseReasons.size) return;
      carousel.classList.remove("is-paused");
      restartProgress();
      schedule();
    };
    const schedule = () => {
      window.clearTimeout(timer);
      if (reducedMotion.matches || pauseReasons.size) return;
      timer = window.setTimeout(() => show(activeIndex + 1, false), 9000);
    };
    const restartProgress = () => {
      carousel.classList.remove("is-running");
      void progress.offsetWidth;
      carousel.classList.add("is-running");
    };
    const show = (nextIndex, announce) => {
      activeIndex = (nextIndex + slides.length) % slides.length;
      slides.forEach((slide, index) => {
        slide.hidden = index !== activeIndex;
        slide.setAttribute("aria-label", `${index + 1} of ${slides.length}`);
      });
      status.textContent = `Showing placeholder ${activeIndex + 1} of ${slides.length}`;
      status.setAttribute("aria-live", announce ? "polite" : "off");
      restartProgress();
      schedule();
    };

    carousel.querySelector("[data-testimonial-previous]")?.addEventListener("click", () => {
      show(activeIndex - 1, true);
    });
    carousel.querySelector("[data-testimonial-next]")?.addEventListener("click", () => {
      show(activeIndex + 1, true);
    });
    carousel.addEventListener("pointerenter", () => pause("pointer"));
    carousel.addEventListener("pointerleave", () => resume("pointer"));
    carousel.addEventListener("focusin", () => pause("focus"));
    carousel.addEventListener("focusout", (event) => {
      if (!carousel.contains(event.relatedTarget)) resume("focus");
    });
    reducedMotion.addEventListener?.("change", (event) => {
      if (event.matches) window.clearTimeout(timer);
      else schedule();
    });

    carousel.classList.add("is-enhanced");
    show(0, false);
  }

  async function sendContactRequest(formData) {
    const response = await window.fetch(CONTACT_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData
    });
    const responseText = await response.text();
    let responseBody = null;
    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseBody = responseText;
    }

    const errors = Array.isArray(responseBody?.errors) ? responseBody.errors : [];
    const errorText = errors
      .map((error) => typeof error === "string" ? error : error?.message)
      .filter(Boolean)
      .join(" ");
    const ok = response.ok && errors.length === 0;
    return {
      ok,
      status: response.status,
      body: responseBody,
      message: ok ? "" : errorText || `Formspree could not accept this message (HTTP ${response.status}).`
    };
  }

  function setSubmitLabel(button, label) {
    button.replaceChildren(document.createTextNode(label));
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    button.append(arrow);
  }

  function appendEmailLink(container, body) {
    const direct = document.createElement("a");
    const subject = "New message from my portfolio";
    direct.href = `mailto:guptanawaraj12@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    direct.textContent = "email me directly at guptanawaraj12@gmail.com";
    container.append(direct);
  }

  function initContactForm() {
    const form = document.querySelector("[data-contact-form]");
    const feedback = form?.querySelector("[data-form-feedback]");
    const submitButton = form?.querySelector('button[type="submit"]');
    if (!form || !feedback || !submitButton) return;

    const nativeSubmit = () => HTMLFormElement.prototype.submit.call(form);
    const formMailtoBody = () => {
      const data = new FormData(form);
      return `Name: ${data.get("name")}\nEmail: ${data.get("email")}\n\n${data.get("message")}`;
    };
    const showError = (message, allowNativeFallback) => {
      feedback.replaceChildren();
      feedback.dataset.state = "error";
      const notice = document.createElement("p");
      notice.textContent = message;
      const options = document.createElement("p");
      options.append(document.createTextNode("Please try again, or "));
      appendEmailLink(options, formMailtoBody());
      options.append(document.createTextNode("."));
      feedback.append(notice, options);
      if (allowNativeFallback) {
        const fallback = document.createElement("button");
        fallback.className = "form-native-fallback";
        fallback.type = "button";
        fallback.textContent = "Use standard Formspree POST";
        fallback.addEventListener("click", nativeSubmit, { once: true });
        feedback.append(fallback);
      }
      setSubmitLabel(submitButton, "Try again");
    };
    const showSuccess = () => {
      form.reset();
      feedback.replaceChildren();
      feedback.dataset.state = "success";
      const check = document.createElement("span");
      check.className = "form-success-check";
      check.setAttribute("aria-hidden", "true");
      check.textContent = "✓";
      feedback.append(check, document.createTextNode(" Your message was sent. Thank you!"));
      setSubmitLabel(submitButton, "Send another message");
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      feedback.replaceChildren();
      delete feedback.dataset.state;
      if (!form.reportValidity()) {
        feedback.textContent = "Please check the highlighted fields and try again.";
        feedback.dataset.state = "error";
        return;
      }
      if (typeof window.fetch !== "function") {
        nativeSubmit();
        return;
      }

      const originalLabel = submitButton.textContent.trim();
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      setSubmitLabel(submitButton, "Sending...");
      feedback.textContent = "Sending your message...";
      feedback.dataset.state = "sending";

      try {
        const result = await sendContactRequest(new FormData(form));
        if (result.ok) {
          showSuccess();
        } else {
          showError(result.message, false);
        }
      } catch {
        showError("We couldn’t send your message because of a network or browser connection error. Your text is still here.", true);
      } finally {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
        if (feedback.dataset.state === "sending") setSubmitLabel(submitButton, originalLabel);
      }
    });
  }

  function initContactChat() {
    if (!EFFECTS.contactChat) return;
    const form = document.querySelector("[data-contact-form]");
    const chat = document.querySelector("[data-contact-chat]");
    const log = chat?.querySelector("[data-contact-chat-log]");
    const suggestions = chat?.querySelector("[data-chat-suggestions]");
    const entry = chat?.querySelector("[data-chat-entry]");
    const inputLabel = chat?.querySelector("[data-chat-input-label]");
    const input = chat?.querySelector("[data-chat-input]");
    const messageInput = chat?.querySelector("[data-chat-message-input]");
    const nextButton = chat?.querySelector("[data-chat-next]");
    const typing = chat?.querySelector("[data-chat-typing]");
    const summary = chat?.querySelector("[data-chat-summary]");
    const submitButton = chat?.querySelector("[data-chat-submit]");
    if (!form || !chat || !log || !suggestions || !entry || !inputLabel ||
      !input || !messageInput || !nextButton || !typing || !summary || !submitButton) return;

    const answers = { topic: "", name: "", email: "", message: "" };
    const prompts = [
      { key: "name", question: "What name should I use?", label: "Your name", type: "text" },
      { key: "email", question: "What email can I reach you at?", label: "Email address", type: "email" },
      { key: "message", question: "What would you like to tell me?", label: "Your message", type: "message" }
    ];
    let stepIndex = 0;
    let typingTimer = 0;

    const addMessage = (kind, text) => {
      const message = document.createElement("p");
      message.className = `chat-message chat-message-${kind}`;
      message.textContent = text;
      log.append(message);
      log.scrollTop = log.scrollHeight;
      return message;
    };
    const ensureTopicField = () => {
      let topicField = form.elements.namedItem("topic");
      if (!topicField) {
        topicField = document.createElement("input");
        topicField.type = "hidden";
        topicField.name = "topic";
        form.append(topicField);
      }
      topicField.value = answers.topic;
    };
    const setPrompt = () => {
      const prompt = prompts[stepIndex];
      inputLabel.textContent = prompt.label;
      const isMessage = prompt.type === "message";
      inputLabel.htmlFor = isMessage ? "guided-message" : "guided-answer";
      input.hidden = isMessage;
      messageInput.hidden = !isMessage;
      input.required = !isMessage;
      messageInput.required = isMessage;
      input.minLength = prompt.key === "name" ? 2 : 0;
      messageInput.minLength = isMessage ? 10 : 0;
      if (prompt.type === "email") {
        input.type = "email";
        input.autocomplete = "email";
      } else if (!isMessage) {
        input.type = "text";
        input.autocomplete = "name";
      }
      entry.hidden = false;
    };
    const reply = (text, callback) => {
      typing.hidden = false;
      window.clearTimeout(typingTimer);
      typingTimer = window.setTimeout(() => {
        typing.hidden = true;
        addMessage("assistant", text);
        callback();
      }, reducedMotion.matches ? 160 : 520);
    };
    const selectedTopic = (event) => {
      const button = event.target instanceof Element
        ? event.target.closest("[data-chat-suggestion]")
        : null;
      if (!button) return;
      answers.topic = button.textContent.trim();
      suggestions.hidden = true;
      addMessage("visitor", answers.topic);
      reply("Thanks for reaching out. What name should I use?", () => {
        stepIndex = 0;
        setPrompt();
        input.focus();
      });
    };

    chat.hidden = false;
    addMessage("assistant", "Choose a starting point. You can also use the plain form below.");
    suggestions.addEventListener("click", selectedTopic);
    nextButton.addEventListener("click", () => {
      const control = prompts[stepIndex].type === "message" ? messageInput : input;
      if (!control.reportValidity()) return;
      answers[prompts[stepIndex].key] = control.value.trim();
      control.required = false;
      entry.hidden = true;
      addMessage("visitor", answers[prompts[stepIndex].key]);
      stepIndex += 1;

      if (stepIndex < prompts.length) {
        const prompt = prompts[stepIndex];
        const response = prompt.key === "email"
          ? `Nice to meet you, ${answers.name}. What email can I reach you at?`
          : "Thanks. What would you like to tell me?";
        reply(response, () => {
          setPrompt();
          (prompt.type === "message" ? messageInput : input).focus();
        });
        return;
      }

      const recap = `Topic: ${answers.topic}\nName: ${answers.name}\nEmail: ${answers.email}\nMessage: ${answers.message}`;
      reply("Review the summary, then choose Send message.", () => {
        summary.textContent = recap;
        summary.hidden = false;
        submitButton.hidden = false;
      });
    });
    submitButton.textContent = "Send message";
    submitButton.addEventListener("click", async () => {
      if (submitButton.disabled) return;
      form.elements.namedItem("name").value = answers.name;
      form.elements.namedItem("email").value = answers.email;
      form.elements.namedItem("message").value = answers.message;
      if (typeof window.fetch !== "function") {
        ensureTopicField();
        HTMLFormElement.prototype.submit.call(form);
        return;
      }

      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      setSubmitLabel(submitButton, "Sending...");
      typing.hidden = false;
      const typingStart = performance.now();
      let result;
      let networkError = false;
      try {
        const submission = new FormData(form);
        submission.set("topic", answers.topic);
        result = await sendContactRequest(submission);
      } catch {
        networkError = true;
      }
      const typingMinimum = reducedMotion.matches ? 160 : 520;
      const typingRemaining = typingMinimum - (performance.now() - typingStart);
      if (typingRemaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, typingRemaining));
      }
      typing.hidden = true;
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");

      if (result?.ok) {
        form.reset();
        submitButton.hidden = true;
        const confirmation = addMessage("assistant", "Your message was sent. Thank you!");
        confirmation.classList.add("chat-message-success");
        const check = document.createElement("span");
        check.className = "form-success-check";
        check.setAttribute("aria-hidden", "true");
        check.textContent = "✓";
        confirmation.prepend(check);
        return;
      }

      const reason = networkError
        ? "We couldn’t send this message because of a network or browser connection error. Your answers are still here."
        : result?.message || "We couldn’t send this message. Your answers are still here.";
      addMessage("assistant", reason);
      const emailMessage = addMessage("assistant", "Or you can ");
      const mailtoBody = `Topic: ${answers.topic}\nName: ${answers.name}\nEmail: ${answers.email}\n\n${answers.message}`;
      appendEmailLink(emailMessage, mailtoBody);
      if (networkError) {
        const fallback = document.createElement("button");
        fallback.className = "chat-action";
        fallback.type = "button";
        fallback.textContent = "Use standard Formspree POST";
        fallback.addEventListener("click", () => {
          ensureTopicField();
          HTMLFormElement.prototype.submit.call(form);
        }, { once: true });
        log.append(fallback);
      }
      setSubmitLabel(submitButton, "Try again");
    });
  }

  function initScrollIndicators() {
    const updateFunctions = [
      initScrollProgress(),
      initSectionRail(),
      initProjectIndex()
    ].filter(Boolean);
    if (!updateFunctions.length) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      updateFunctions.forEach((updateFunction) => updateFunction());
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    update();
  }

  initIntroGate();
  initHeroWords();
  initLogoDotHop();
  initPointerFill();
  initCursorLabel();
  initSpotlight();
  initInertiaScroll();
  initWordClipReveals();
  initScrollPalette();
  initScrollIndicators();
  initParticleMorph();
  initMenuOverlay();
  initProjectRows();
  initExpandablePanels();
  initAboutMotto();
  initTestimonialsCarousel();
  initContactForm();
  initContactChat();
})();
