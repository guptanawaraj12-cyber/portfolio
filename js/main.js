(() => {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const storedTheme = localStorage.getItem("portfolio-theme");
  root.style.setProperty("--theme-duration", "0s");
  root.dataset.theme = storedTheme === "light" ? "light" : "dark";
  window.requestAnimationFrame(() => root.style.removeProperty("--theme-duration"));

  root.classList.add("js-ready");

  const themeToggle = document.querySelector(".theme-toggle");
  const updateThemeButton = () => {
    const isDark = root.dataset.theme === "dark";
    themeToggle?.setAttribute("aria-pressed", String(isDark));
    themeToggle?.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      isDark ? "#0A0A0A" : "#E4E2DC"
    );
  };
  updateThemeButton();

  document.querySelectorAll(".project-grid, .project-page-grid, .timeline").forEach((list) => {
    Array.from(list.children).forEach((item, index) => {
      item.style.setProperty("--stagger-index", index);
    });
  });

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const easingValues = getComputedStyle(root).getPropertyValue("--ease-main")
    .match(/[\d.]+/g).map(Number);
  const easeMain = (value) => {
    const curve = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
    let low = 0;
    let high = 1;
    let estimate = value;
    for (let iteration = 0; iteration < 6; iteration += 1) {
      const x = curve(estimate, easingValues[0], easingValues[2]);
      if (x < value) low = estimate;
      else high = estimate;
      estimate = (low + high) / 2;
    }
    return curve(estimate, easingValues[1], easingValues[3]);
  };

  const initParticlePortrait = (container) => {
    const SHOW_FAINT_PHOTO = true;
    const PARTICLE_COUNT_DESKTOP = 8000;
    const PARTICLE_COUNT_MOBILE = 3000;
    const DOT_SIZE = { min: 0.6, max: 1.1 };
    const CONTRAST = 1.25;
    const GAMMA = 0.88;
    const BACKGROUND_MASK = "plain";
    const PHOTO_OPACITY = 0.1;
    const CROP_HEIGHT = 0.46;
    const canvas = container.querySelector(".particle-canvas");
    const source = container.querySelector(".particle-fallback");
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !source || !context) return null;

    // Pixels are read from a data-URI copy of the photo. A normal <img src="/assets/photo.jpg">
    // taints the canvas when the page is opened via file://, which blocks getImageData().
    const sampleImage = new Image();
    sampleImage.src = window.PORTRAIT_PHOTO_DATA || source.currentSrc || source.src;

    const sampleCanvas = document.createElement("canvas");
    const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!sampleContext) return null;
    const photoUnderlay = document.createElement("canvas");
    photoUnderlay.className = "particle-photo-underlay";
    photoUnderlay.setAttribute("aria-hidden", "true");
    container.insertBefore(photoUnderlay, canvas);
    const photoUnderlayContext = photoUnderlay.getContext("2d");
    const underlaySampleCanvas = document.createElement("canvas");
    const underlaySampleContext = underlaySampleCanvas.getContext("2d");

    const pointer = { x: 0, y: 0, active: false };
    let particles = [];
    let assembledParticles = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let visible = false;
    let frameId = 0;
    let startedAt = 0;
    let pausedAt = 0;
    let hasStarted = false;
    let resizeTimer = 0;
    let paletteTransitionUntil = 0;
    let isReducedMotion = reducedMotion.matches;
    let palette = { fg: "", accent: "" };
    let foregroundColor = [238, 236, 232];
    let accentColor = [91, 95, 224];
    let frameImage = null;
    let framePixels = null;
    let motionPending = false;
    let morphEnabled = false;
    let activeScene = 0;
    let scrollScatter = 0;
    let lastScrollY = window.scrollY;
    let lastScrollAt = performance.now();
    let morphSampleStartedAt = 0;
    let morphSampleFrames = 0;
    let morphSimplified = false;
    let healthyMorphWindows = 0;
    let slowMorphWindows = 0;
    let mobileParticleLimit = PARTICLE_COUNT_MOBILE;

    const readHexColor = (value, fallback) => {
      const match = /^#([0-9a-f]{6})$/i.exec(value);
      if (!match) return fallback;
      return [
        parseInt(match[1].slice(0, 2), 16),
        parseInt(match[1].slice(2, 4), 16),
        parseInt(match[1].slice(4, 6), 16)
      ];
    };

    const setPalette = () => {
      const styles = getComputedStyle(root);
      palette = {
        fg: styles.getPropertyValue("--fg").trim(),
        accent: styles.getPropertyValue("--accent").trim()
      };
      foregroundColor = readHexColor(palette.fg, [238, 236, 232]);
      accentColor = readHexColor(palette.accent, [91, 95, 224]);
    };

    const sampleParticles = () => {
      const sourceWidth = sampleImage.naturalWidth;
      const sourceHeight = sampleImage.naturalHeight;
      if (!sourceWidth || !sourceHeight || !width || !height) return [];

      const sampleWidth = Math.max(1, Math.round(width));
      const sampleHeight = Math.max(1, Math.round(height));
      const frameRatio = width / height;
      const cropHeight = Math.min(sourceHeight, sourceWidth * CROP_HEIGHT, sourceWidth / frameRatio);
      const cropWidth = cropHeight * frameRatio;
      const cropX = (sourceWidth - cropWidth) / 2;
      const cropY = 0;

      sampleCanvas.width = sourceWidth;
      sampleCanvas.height = sourceHeight;
      sampleContext.clearRect(0, 0, sourceWidth, sourceHeight);
      sampleContext.drawImage(sampleImage, 0, 0, sourceWidth, sourceHeight);
      const originalPixels = sampleContext.getImageData(0, 0, sourceWidth, sourceHeight).data;
      const originalCorners = [
        0,
        (sourceWidth - 1) * 4,
        (sourceHeight - 1) * sourceWidth * 4,
        (sourceWidth * sourceHeight - 1) * 4
      ];
      const transparentSource = originalCorners.filter((offset) => originalPixels[offset + 3] < 24).length >= 2;
      const background = [0, 1, 2].map((channel) =>
        originalCorners.reduce((sum, offset) => sum + originalPixels[offset + channel], 0) / originalCorners.length
      );

      sampleCanvas.width = sampleWidth;
      sampleCanvas.height = sampleHeight;
      sampleContext.clearRect(0, 0, sampleWidth, sampleHeight);
      sampleContext.drawImage(sampleImage, cropX, cropY, cropWidth, cropHeight, 0, 0, sampleWidth, sampleHeight);

      const pixels = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
      const luminance = (offset) => {
        const red = pixels[offset];
        const green = pixels[offset + 1];
        const blue = pixels[offset + 2];
        return red * 0.2126 + green * 0.7152 + blue * 0.0722;
      };
      const smoothstep = (edge0, edge1, value) => {
        const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
      };
      const maskAt = (offset, x, y) => {
        if (pixels[offset + 3] < 24) return 0;
        if (transparentSource) return pixels[offset + 3] / 255;
        if (BACKGROUND_MASK === "none") return 1;
        if (BACKGROUND_MASK === "vignette") {
          const dx = (x - sampleWidth / 2) / (sampleWidth * 0.48);
          const dy = (y - sampleHeight * 0.46) / (sampleHeight * 0.5);
          return 1 - smoothstep(0.82, 1.08, Math.hypot(dx, dy));
        }
        const distance = Math.hypot(
          pixels[offset] - background[0],
          pixels[offset + 1] - background[1],
          pixels[offset + 2] - background[2]
        );
        return smoothstep(18, 50, distance);
      };

      if (SHOW_FAINT_PHOTO && photoUnderlayContext && underlaySampleContext) {
        const photoPixels = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight);
        for (let y = 0; y < sampleHeight; y += 1) {
          for (let x = 0; x < sampleWidth; x += 1) {
            const offset = (y * sampleWidth + x) * 4;
            photoPixels.data[offset + 3] = Math.round(photoPixels.data[offset + 3] * maskAt(offset, x, y));
          }
        }
        underlaySampleCanvas.width = sampleWidth;
        underlaySampleCanvas.height = sampleHeight;
        underlaySampleContext.putImageData(photoPixels, 0, 0);
        photoUnderlay.width = canvas.width;
        photoUnderlay.height = canvas.height;
        photoUnderlayContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        photoUnderlayContext.clearRect(0, 0, width, height);
        photoUnderlayContext.drawImage(underlaySampleCanvas, 0, 0, width, height);
      }

      const histogram = new Uint32Array(256);
      let subjectSamples = 0;
      for (let y = 0; y < sampleHeight; y += 1) {
        for (let x = 0; x < sampleWidth; x += 1) {
          const offset = (y * sampleWidth + x) * 4;
          if (maskAt(offset, x, y) < 0.15) continue;
          histogram[Math.round(luminance(offset))] += 1;
          subjectSamples += 1;
        }
      }
      const percentile = (fraction) => {
        const target = subjectSamples * fraction;
        let total = 0;
        for (let value = 0; value < histogram.length; value += 1) {
          total += histogram[value];
          if (total >= target) return value;
        }
        return 255;
      };
      const low = percentile(0.03);
      const high = Math.max(low + 1, percentile(0.97));
      const isDark = root.dataset.theme === "dark";
      const limit = window.matchMedia("(max-width: 640px)").matches
        ? mobileParticleLimit
        : PARTICLE_COUNT_DESKTOP;
      const cellSize = Math.max(1, Math.sqrt((sampleWidth * sampleHeight) / (limit * 5)));
      // Dark theme: boost LOCAL contrast (value minus its neighbourhood average) so eyes, brows,
      // nose, lips and jaw read clearly instead of one flat mid-tone face next to a bright shirt.
      const LOCAL_CONTRAST = 2.4;
      const LOCAL_RADIUS = Math.max(4, Math.round(sampleWidth * 0.07));
      let localMean = null;
      if (isDark && !transparentSource) {
        const stride = sampleWidth + 1;
        const integral = new Float64Array(stride * (sampleHeight + 1));
        for (let y = 0; y < sampleHeight; y += 1) {
          let row = 0;
          for (let x = 0; x < sampleWidth; x += 1) {
            row += luminance((y * sampleWidth + x) * 4);
            integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
          }
        }
        localMean = (x, y) => {
          const x0 = Math.max(0, x - LOCAL_RADIUS);
          const x1 = Math.min(sampleWidth, x + LOCAL_RADIUS + 1);
          const y0 = Math.max(0, y - LOCAL_RADIUS);
          const y1 = Math.min(sampleHeight, y + LOCAL_RADIUS + 1);
          const sum = integral[y1 * stride + x1] - integral[y0 * stride + x1]
            - integral[y1 * stride + x0] + integral[y0 * stride + x0];
          return sum / ((x1 - x0) * (y1 - y0));
        };
      }
      const candidates = [];
      for (let y = cellSize / 2; y < sampleHeight; y += cellSize) {
        for (let x = cellSize / 2; x < sampleWidth; x += cellSize) {
          const jitterX = (Math.random() - 0.5) * cellSize * 0.6;
          const jitterY = (Math.random() - 0.5) * cellSize * 0.6;
          const sampleX = Math.max(0, Math.min(sampleWidth - 1, Math.floor(x + jitterX)));
          const sampleY = Math.max(0, Math.min(sampleHeight - 1, Math.floor(y + jitterY)));
          const offset = (sampleY * sampleWidth + sampleX) * 4;
          const mask = maskAt(offset, sampleX, sampleY);
          if (mask < 0.15) continue;
          const normalized = Math.max(0, Math.min(1, (luminance(offset) - low) / (high - low)));
          const contrasted = Math.max(0, Math.min(1, 0.5 + (normalized - 0.5) * CONTRAST));
          let tone = Math.pow(contrasted, GAMMA);
          if (localMean) {
            const detail = (luminance(offset) - localMean(sampleX, sampleY)) / (high - low);
            tone = Math.max(0, Math.min(1, tone * 0.45 + 0.28 + detail * LOCAL_CONTRAST));
          }
          const density = isDark && !transparentSource ? tone : 1 - tone;
          candidates.push({
            x: sampleX * width / sampleWidth,
            y: sampleY * height / sampleHeight,
            weight: mask * (0.12 + Math.pow(density, 1.25) * 0.88)
          });
        }
      }

      let lowScale = 0;
      let highScale = 1;
      const expectedAt = (scale) => candidates.reduce((sum, point) =>
        sum + Math.min(1, point.weight * scale), 0
      );
      while (expectedAt(highScale) < limit) highScale *= 2;
      for (let iteration = 0; iteration < 20; iteration += 1) {
        const scale = (lowScale + highScale) / 2;
        if (expectedAt(scale) < limit) lowScale = scale;
        else highScale = scale;
      }
      const points = candidates
        .filter((point) => Math.random() < Math.min(1, point.weight * highScale))
        .map((point) => ({
          x: point.x,
          y: point.y,
          size: DOT_SIZE.min + Math.random() * (DOT_SIZE.max - DOT_SIZE.min),
          accent: Math.random() < 0.035
        }));

      const diagonal = Math.hypot(width, height);
      canvas.dataset.particleCount = String(points.length);
      canvas.dataset.crop = `${Math.round(cropX)},${Math.round(cropY)},${Math.round(cropWidth)},${Math.round(cropHeight)}`;
      const imageScale = width / cropWidth;
      source.style.width = `${sourceWidth * imageScale}px`;
      source.style.height = `${sourceHeight * imageScale}px`;
      source.style.maxWidth = "none";
      source.style.left = "50%";
      source.style.top = "0";
      source.style.right = "auto";
      source.style.bottom = "auto";
      source.style.transform = "translateX(-50%)";
      source.style.objectFit = "fill";
      return points.map((point) => {
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        const travel = Math.hypot(point.x - startX, point.y - startY) / diagonal;
        return {
          ...point,
          homeX: point.x,
          homeY: point.y,
          x: isReducedMotion ? point.x : startX,
          y: isReducedMotion ? point.y : startY,
          startX,
          startY,
          delay: travel * 180,
          duration: 1200 + Math.random() * 220,
          velocityX: 0,
          velocityY: 0,
          displaced: false,
          assembled: isReducedMotion
        };
      });
    };

    const sampleMorphTarget = (drawScene) => {
      const targetWidth = Math.max(1, Math.round(width));
      const targetHeight = Math.max(1, Math.round(height));
      sampleCanvas.width = targetWidth;
      sampleCanvas.height = targetHeight;
      sampleContext.clearRect(0, 0, targetWidth, targetHeight);
      drawScene(sampleContext, targetWidth, targetHeight);

      const pixels = sampleContext.getImageData(0, 0, targetWidth, targetHeight).data;
      const candidates = [];
      for (let y = 0; y < targetHeight; y += 2) {
        for (let x = 0; x < targetWidth; x += 2) {
          if (pixels[(y * targetWidth + x) * 4 + 3] > 72) candidates.push({ x, y });
        }
      }
      if (!candidates.length) return [];

      return particles.map((_, index) => {
        const offset = Math.floor((index + 0.5) * candidates.length / particles.length);
        const point = candidates[Math.min(candidates.length - 1, offset)];
        return {
          x: point.x * width / targetWidth,
          y: point.y * height / targetHeight
        };
      });
    };

    const buildMorphTargets = () => {
      if (!morphEnabled || !particles.length) return;

      const name = sampleMorphTarget((target, targetWidth, targetHeight) => {
        const size = Math.min(targetWidth * 0.19, targetHeight * 0.14);
        target.fillStyle = "#FFFFFF";
        target.font = `600 ${size}px system-ui, sans-serif`;
        target.textAlign = "center";
        target.textBaseline = "middle";
        target.fillText("Nawaraj", targetWidth / 2, targetHeight * 0.43, targetWidth * 0.9);
        target.fillText("Gupta", targetWidth / 2, targetHeight * 0.58, targetWidth * 0.9);
      });
      const laptop = sampleMorphTarget((target, targetWidth, targetHeight) => {
        const screenWidth = targetWidth * 0.52;
        const screenHeight = targetHeight * 0.34;
        const left = (targetWidth - screenWidth) / 2;
        const top = targetHeight * 0.27;
        target.strokeStyle = "#FFFFFF";
        target.lineWidth = Math.max(2, targetWidth * 0.008);
        target.lineCap = "round";
        target.strokeRect(left, top, screenWidth, screenHeight);
        target.beginPath();
        target.moveTo(left - targetWidth * 0.09, top + screenHeight + targetHeight * 0.08);
        target.lineTo(left + screenWidth + targetWidth * 0.09, top + screenHeight + targetHeight * 0.08);
        target.lineTo(left + screenWidth + targetWidth * 0.04, top + screenHeight + targetHeight * 0.15);
        target.lineTo(left - targetWidth * 0.04, top + screenHeight + targetHeight * 0.15);
        target.closePath();
        target.stroke();
        target.beginPath();
        for (let index = 1; index < 5; index += 1) {
          const x = left + screenWidth * index / 5;
          target.moveTo(x, top + screenHeight * 0.78);
          target.lineTo(x, top + screenHeight * 0.9);
        }
        target.stroke();
      });

      particles.forEach((particle, index) => {
        particle.nameTarget = name[index] || { x: width / 2, y: height / 2 };
        particle.laptopTarget = laptop[index] || { x: width / 2, y: height / 2 };
        if (activeScene !== 0 && particle.assembled) particle.morphing = true;
      });
    };

    const setScene = (scene) => {
      if (!morphEnabled || isReducedMotion || scene < 0 || scene > 2 || scene === activeScene) return false;
      activeScene = scene;
      morphSampleStartedAt = 0;
      morphSampleFrames = 0;
      motionPending = true;
      particles.forEach((particle) => {
        if (particle.assembled) particle.morphing = true;
      });
      container.dataset.particleScene = ["portrait", "name", "laptop"][scene];
      container.dispatchEvent(new CustomEvent("portfolio:particlescenechange", {
        bubbles: true,
        detail: { scene }
      }));
      start();
      return true;
    };

    const scenePosition = (particle) => {
      if (activeScene === 1 && particle.nameTarget) return particle.nameTarget;
      if (activeScene === 2 && particle.laptopTarget) return particle.laptopTarget;
      return null;
    };

    const paintDot = (particle, color) => {
      const centerX = Math.round(particle.x * pixelRatio);
      const centerY = Math.round(particle.y * pixelRatio);
      const radius = particle.size * pixelRatio;
      const edge = radius + 0.5;
      const extent = Math.ceil(edge);
      const minX = Math.max(0, centerX - extent);
      const maxX = Math.min(canvas.width - 1, centerX + extent);
      const minY = Math.max(0, centerY - extent);
      const maxY = Math.min(canvas.height - 1, centerY + extent);

      for (let y = minY; y <= maxY; y += 1) {
        const dy = y - centerY;
        for (let x = minX; x <= maxX; x += 1) {
          const dx = x - centerX;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared >= edge * edge) continue;
          const coverage = Math.min(1, edge - Math.sqrt(distanceSquared));
          const offset = (y * canvas.width + x) * 4;
          const sourceAlpha = coverage;
          const destinationAlpha = framePixels[offset + 3] / 255;
          const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
          if (!outputAlpha) continue;
          const destinationWeight = destinationAlpha * (1 - sourceAlpha);
          framePixels[offset] = Math.round(
            (color[0] * sourceAlpha + framePixels[offset] * destinationWeight) / outputAlpha
          );
          framePixels[offset + 1] = Math.round(
            (color[1] * sourceAlpha + framePixels[offset + 1] * destinationWeight) / outputAlpha
          );
          framePixels[offset + 2] = Math.round(
            (color[2] * sourceAlpha + framePixels[offset + 2] * destinationWeight) / outputAlpha
          );
          framePixels[offset + 3] = Math.round(outputAlpha * 255);
        }
      }
    };

    const draw = (now) => {
      if (!frameImage || frameImage.width !== canvas.width || frameImage.height !== canvas.height) {
        frameImage = context.createImageData(canvas.width, canvas.height);
        framePixels = frameImage.data;
      }
      framePixels.fill(0);
      if (!palette.fg || now < paletteTransitionUntil) setPalette();

      if (morphEnabled && activeScene !== 0 && !isReducedMotion) {
        if (!morphSampleStartedAt) morphSampleStartedAt = now;
        morphSampleFrames += 1;
        if (now - morphSampleStartedAt >= 1000) {
          const measuredFps = morphSampleFrames * 1000 / (now - morphSampleStartedAt);
          canvas.dataset.morphFps = String(Math.round(measuredFps));
          if (measuredFps < 50) {
            slowMorphWindows += 1;
            healthyMorphWindows = 0;
            if (window.matchMedia("(max-width: 640px)").matches &&
              slowMorphWindows >= 2 && particles.length > 1500) {
              mobileParticleLimit = Math.max(1500, Math.floor(particles.length * 0.75));
              particles = particles.filter((_, index) =>
                Math.floor(index * mobileParticleLimit / particles.length) !==
                Math.floor((index + 1) * mobileParticleLimit / particles.length)
              );
              assembledParticles = particles.reduce(
                (count, particle) => count + Number(particle.assembled),
                0
              );
              canvas.dataset.particleCount = String(particles.length);
              buildMorphTargets();
              slowMorphWindows = 0;
            } else if (slowMorphWindows >= 2) {
              morphSimplified = true;
              healthyMorphWindows = 0;
            }
          } else if (measuredFps >= 54) {
            slowMorphWindows = 0;
            healthyMorphWindows += 1;
            if (healthyMorphWindows >= 2) morphSimplified = false;
          }
          canvas.dataset.morphSimplified = String(morphSimplified);
          morphSampleStartedAt = now;
          morphSampleFrames = 0;
        }
      }

      const elapsed = now - startedAt;
      const radius = Math.min(width, height) * 0.2;
      const repelStrength = Math.min(width * 0.065, 32);
      const scatterAmount = scrollScatter;
      scrollScatter *= 0.9;
      if (scrollScatter < 0.012) scrollScatter = 0;
      const drawStride = morphSimplified && activeScene !== 0 ? 2 : 1;
      let nextMotionPending = false;
      const accentParticles = [];
      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        if (!isReducedMotion && !particle.assembled) {
          const progress = (elapsed - particle.delay) / particle.duration;
          if (progress >= 0) {
            const eased = easeMain(Math.min(progress, 1));
            particle.x = particle.startX + (particle.homeX - particle.startX) * eased;
            particle.y = particle.startY + (particle.homeY - particle.startY) * eased;
            if (progress >= 1) {
              particle.assembled = true;
              assembledParticles += 1;
              particle.velocityX = 0;
              particle.velocityY = 0;
              particle.morphing = activeScene !== 0;
            }
          }
        } else {
          const base = scenePosition(particle);
          const baseX = base ? base.x : particle.homeX;
          const baseY = base ? base.y : particle.homeY;
          let affected = false;
          let deltaX = 0;
          let deltaY = 0;
          let distanceSquared = radius * radius;
          if (!isReducedMotion && pointer.active) {
            deltaX = particle.x - pointer.x;
            deltaY = particle.y - pointer.y;
            if (Math.abs(deltaX) < radius && Math.abs(deltaY) < radius) {
              distanceSquared = deltaX * deltaX + deltaY * deltaY;
              affected = distanceSquared > 0 && distanceSquared < radius * radius;
            }
          }
          const needsUpdate = affected || particle.displaced || particle.morphing || scatterAmount > 0.012;
          if (!isReducedMotion && needsUpdate) {
            let targetX = baseX;
            let targetY = baseY;
            if (scatterAmount > 0) {
              const angle = index * 2.399963;
              const scatter = Math.min(width, height) * 0.12 * scatterAmount;
              targetX += Math.cos(angle) * scatter;
              targetY += Math.sin(angle) * scatter;
            }
            if (affected) {
              const distance = Math.sqrt(distanceSquared);
              const force = (1 - distance / radius) * repelStrength;
              targetX += (deltaX / distance) * force;
              targetY += (deltaY / distance) * force;
              particle.displaced = true;
            }
            particle.velocityX = (particle.velocityX + (targetX - particle.x) * 0.075) * 0.84;
            particle.velocityY = (particle.velocityY + (targetY - particle.y) * 0.075) * 0.84;
            particle.x += particle.velocityX;
            particle.y += particle.velocityY;
            if (!pointer.active && scatterAmount < 0.012 &&
              Math.abs(baseX - particle.x) < 0.12 &&
              Math.abs(baseY - particle.y) < 0.12 &&
              Math.abs(particle.velocityX) < 0.12 &&
              Math.abs(particle.velocityY) < 0.12) {
              particle.x = baseX;
              particle.y = baseY;
              particle.velocityX = 0;
              particle.velocityY = 0;
              particle.displaced = false;
              particle.morphing = false;
            }
          }
        }

        if (!particle.assembled ||
          Math.abs(particle.velocityX) > 0.12 ||
          Math.abs(particle.velocityY) > 0.12 ||
          particle.morphing ||
          (!pointer.active && particle.displaced)) {
          nextMotionPending = true;
        }
        if (index % drawStride !== 0) continue;
        if (particle.accent) accentParticles.push(particle);
        else paintDot(particle, foregroundColor);
      }
      accentParticles.forEach((particle) => paintDot(particle, accentColor));
      context.putImageData(frameImage, 0, 0);
      container.classList.add("particle-ready");
      if (assembledParticles === particles.length) {
        container.classList.add("particle-settled");
        source.style.opacity = "0";
        photoUnderlay.style.opacity = SHOW_FAINT_PHOTO ? String(PHOTO_OPACITY) : "0";
      }
      motionPending = nextMotionPending || scrollScatter > 0.012 || performance.now() < paletteTransitionUntil;
      return motionPending;
    };

    const stop = () => {
      if (!frameId) return;
      if (!pausedAt) pausedAt = performance.now();
      cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const animate = (now) => {
      frameId = 0;
      if (!visible || isReducedMotion || document.hidden) return;
      if (!draw(now)) return;
      frameId = requestAnimationFrame(animate);
    };

    const start = () => {
      if (!visible || isReducedMotion || document.hidden || frameId || !particles.length) return;
      const now = performance.now();
      if (paletteTransitionUntil && now >= paletteTransitionUntil) {
        paletteTransitionUntil = 0;
        setPalette();
        draw(now);
      }
      if (!pointer.active && !motionPending) return;
      if (pausedAt) {
        startedAt += now - pausedAt;
        pausedAt = 0;
      } else if (!hasStarted) {
        startedAt = now;
      }
      hasStarted = true;
      frameId = requestAnimationFrame(animate);
    };

    const rebuild = () => {
      stop();
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height || !source.naturalWidth) return;
      width = rect.width;
      height = rect.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      frameImage = context.createImageData(canvas.width, canvas.height);
      framePixels = frameImage.data;
      particles = sampleParticles();
      assembledParticles = particles.reduce(
        (count, particle) => count + Number(particle.assembled),
        0
      );
      buildMorphTargets();
      startedAt = performance.now();
      pausedAt = 0;
      hasStarted = false;
      container.classList.remove("particle-ready");
      container.classList.remove("particle-settled");
      source.style.opacity = "";
      photoUnderlay.style.opacity = "0";
      setPalette();
      if (isReducedMotion) {
        draw(startedAt);
      } else {
        motionPending = true;
        draw(startedAt);
        start();
      }
    };

    const pointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = event.pointerType !== "touch" || event.buttons > 0;
      if (pointer.active) start();
    };
    container.addEventListener("pointermove", pointerMove);
    container.addEventListener("pointerdown", pointerMove);
    const releasePointer = () => {
      pointer.active = false;
      start();
    };
    container.addEventListener("pointerup", releasePointer);
    container.addEventListener("pointerleave", releasePointer);

    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          if (isReducedMotion) draw(performance.now());
          else start();
        } else {
          stop();
        }
      }, { threshold: 0.01 })
      : null;
    if (observer) observer.observe(container);
    else visible = true;

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(rebuild, 120);
      });
      resizeObserver.observe(container);
    } else {
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(rebuild, 120);
      });
    }

    reducedMotion.addEventListener?.("change", (event) => {
      isReducedMotion = event.matches;
      if (isReducedMotion) {
        stop();
        activeScene = 0;
        scrollScatter = 0;
        particles = particles.map((particle) => ({
          ...particle,
          x: particle.homeX,
          y: particle.homeY,
          assembled: true,
          velocityX: 0,
          velocityY: 0,
          displaced: false,
          morphing: false
        }));
        assembledParticles = particles.length;
        container.dataset.particleScene = "portrait";
        draw(performance.now());
      } else {
        rebuild();
        start();
      }
    });

    const whenLoaded = (image, callback) => {
      if (image.complete && image.naturalWidth) callback();
      else image.addEventListener("load", callback, { once: true });
    };
    whenLoaded(sampleImage, () => whenLoaded(source, rebuild));

    return {
      pause: stop,
      resume: start,
      refresh: () => {
        const themeDuration = parseFloat(getComputedStyle(root).getPropertyValue("--theme-duration")) * 1000;
        paletteTransitionUntil = performance.now() + (isReducedMotion ? 0 : themeDuration);
        motionPending = !isReducedMotion && paletteTransitionUntil > performance.now();
        setPalette();
        if (isReducedMotion) draw(performance.now());
        else if (!frameId && visible && !document.hidden) start();
        else if (!frameId) draw(performance.now());
      },
      enableMorph: () => {
        if (isReducedMotion || morphEnabled) return false;
        morphEnabled = true;
        buildMorphTargets();
        const handleScroll = () => {
          if (isReducedMotion) return;
          const now = performance.now();
          const currentY = window.scrollY;
          const elapsed = Math.max(1, now - lastScrollAt);
          const speed = Math.abs(currentY - lastScrollY) / elapsed;
          scrollScatter = Math.max(scrollScatter, Math.min(1, speed * 0.18));
          lastScrollY = currentY;
          lastScrollAt = now;

          const rect = container.getBoundingClientRect();
          const progress = Math.max(0, Math.min(1,
            (window.innerHeight - rect.top) / (window.innerHeight + rect.height)
          ));
          setScene(progress > 0.88 ? 2 : progress > 0.55 ? 1 : 0);
          start();
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return true;
      },
      setScene
    };
  };

  const particlePortraits = Array.from(document.querySelectorAll("[data-particle-portrait]"))
    .map(initParticlePortrait)
    .filter(Boolean);
  window.portfolioParticlePortraits = particlePortraits;

  themeToggle?.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("portfolio-theme", root.dataset.theme);
    updateThemeButton();
    particlePortraits.forEach((portrait) => portrait.refresh());
  });

  document.addEventListener("portfolio:themechange", () => {
    updateThemeButton();
    particlePortraits.forEach((portrait) => portrait.refresh());
  });

  const timeElement = document.querySelector("[data-local-time]");
  const updateLocalTime = () => {
    if (!timeElement) return;
    timeElement.textContent = new Intl.DateTimeFormat("en-NP", {
      timeZone: "Asia/Kathmandu",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(new Date());
  };
  updateLocalTime();
  if (timeElement) window.setInterval(updateLocalTime, 30000);

  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reducedMotion.matches) {
    root.classList.add("has-custom-cursor");
    const cursor = document.createElement("div");
    cursor.className = "custom-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = '<span class="cursor-ring"></span><span class="cursor-dot"></span>';
    document.body.append(cursor);

    window.addEventListener("pointermove", (event) => {
      cursor.style.setProperty("--cursor-x", `${event.clientX}px`);
      cursor.style.setProperty("--cursor-y", `${event.clientY}px`);
    });
    document.addEventListener("pointerover", (event) => {
      if (event.target.closest("a, button, input, textarea")) cursor.classList.add("is-hovering");
    });
    document.addEventListener("pointerout", (event) => {
      if (event.target.closest("a, button, input, textarea") &&
        !event.relatedTarget?.closest?.("a, button, input, textarea")) {
        cursor.classList.remove("is-hovering");
      }
    });

    document.querySelectorAll(".button-primary, .dock-icon").forEach((target) => {
      target.addEventListener("pointermove", (event) => {
        const rect = target.getBoundingClientRect();
        const currentX = parseFloat(target.style.getPropertyValue("--mag-x")) || 0;
        const currentY = parseFloat(target.style.getPropertyValue("--mag-y")) || 0;
        target.style.setProperty("--mag-x", `${(event.clientX - rect.left - rect.width / 2 + currentX) * 0.16}px`);
        target.style.setProperty("--mag-y", `${(event.clientY - rect.top - rect.height / 2 + currentY) * 0.16}px`);
      });
      target.addEventListener("pointerleave", () => {
        target.style.setProperty("--mag-x", "0px");
        target.style.setProperty("--mag-y", "0px");
      });
    });
  }

  document.addEventListener("visibilitychange", () => {
    particlePortraits.forEach((portrait) => {
      if (document.hidden) portrait.pause();
      else portrait.resume();
    });
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (reducedMotion.matches || !link || link.target || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const destination = new URL(link.href, window.location.href);
    const isLocalFile = window.location.protocol === "file:";
    const isPortfolioRoute = isLocalFile
      ? /\/(?:index\.html|(?:about|projects|resume|contact)\/index\.html)$/i.test(destination.pathname)
      : /^\/(?:|about\/|projects\/|resume\/|contact\/)$/.test(destination.pathname);
    if (destination.protocol !== window.location.protocol ||
      destination.origin !== window.location.origin ||
      !isPortfolioRoute ||
      destination.pathname === window.location.pathname) return;
    event.preventDefault();
    document.body.classList.add("page-exit");
    window.setTimeout(() => { window.location.href = destination.href; }, 380);
  });
})();
