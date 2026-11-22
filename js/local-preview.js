// Rewrite hosted root URLs only for direct file:// previews.
(function () {
  if (window.location.protocol !== "file:") return;

  const nestedPage = /\/(?:about|projects|resume|contact)\/index\.html$/i.test(window.location.pathname);
  const rootPrefix = nestedPage ? "../" : "./";
  const routes = {
    "/": "index.html",
    "/about/": "about/index.html",
    "/projects/": "projects/index.html",
    "/resume/": "resume/index.html",
    "/contact/": "contact/index.html"
  };

  function localize(value, isAsset) {
    if (!value || value.charAt(0) !== "/" || value.charAt(1) === "/") return value;
    const url = new URL(value, "https://local-preview.invalid");
    const route = routes[url.pathname];
    if (!isAsset && !route) return value;
    const localPath = route || url.pathname.slice(1);
    return rootPrefix + localPath + url.search + url.hash;
  }

  function rewrite(element) {
    if (!(element instanceof Element)) return;
    const tag = element.tagName.toLowerCase();
    const assetAttributes = {
      link: ["href"],
      script: ["src"],
      img: ["src"],
      source: ["src"]
    };
    (assetAttributes[tag] || []).forEach(function (attribute) {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, localize(value, true));
    });

    if (tag === "a") {
      const href = element.getAttribute("href");
      if (href && href.charAt(0) === "/") element.setAttribute("href", localize(href, false));
    }
    if (tag === "img" && element.hasAttribute("srcset")) {
      const srcset = element.getAttribute("srcset");
      element.setAttribute("srcset", srcset.split(",").map(function (candidate) {
        const parts = candidate.trim().split(/\s+/);
        parts[0] = localize(parts[0], true);
        return parts.join(" ");
      }).join(", "));
    }
    if (tag === "source" && element.hasAttribute("srcset")) {
      const srcset = element.getAttribute("srcset");
      element.setAttribute("srcset", srcset.split(",").map(function (candidate) {
        const parts = candidate.trim().split(/\s+/);
        parts[0] = localize(parts[0], true);
        return parts.join(" ");
      }).join(", "));
    }
  }

  function rewriteTree(node) {
    rewrite(node);
    if (node.querySelectorAll) node.querySelectorAll("link[href],script[src],img[src],img[srcset],source[src],a[href]").forEach(rewrite);
  }

  rewriteTree(document.documentElement);
  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "childList") mutation.addedNodes.forEach(rewriteTree);
      else if (mutation.type === "attributes") rewrite(mutation.target);
    });
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["href", "src", "srcset"],
    childList: true,
    subtree: true
  });
})();
