# Nawaraj Gupta — personal portfolio

A lightweight, multi-page portfolio built with plain HTML, CSS, and vanilla JavaScript. No build step or runtime dependencies are required.

## Preview locally

Open `index.html` in a browser. The `js/local-preview.js` helper runs only for `file://` pages and converts hosted root URLs (such as `/about/` and `/css/style.css`) to paths inside this project. It also handles links created later by the menu. On HTTP(S), it does nothing. General Sans loads from Fontshare when online; system UI fonts are the fallback.

The site uses these clean routes when hosted:

```text
/                 index.html
/about/           about/index.html
/projects/        projects/index.html
/resume/          resume/index.html
/contact/         contact/index.html
```

## Edit the content

- Update the repeated name, tagline, education, and contact details in `index.html`, `about/index.html`, `projects/index.html`, `resume/index.html`, and `contact/index.html`.
- Replace `assets/photo.jpg` with your preferred portrait. The Home and About particle canvases sample that photo; if it is missing, the image falls back to `assets/silhouette.svg`. Update the image `alt` text if needed.
- Tune the portrait constants at the top of `initParticlePortrait` in `js/main.js`:
  - `PARTICLE_COUNT_DESKTOP` and `PARTICLE_COUNT_MOBILE` set the target density (8,000 and 3,000 by default).
  - `DOT_SIZE` sets the minimum and maximum dot radius in CSS pixels; the canvas scales it for the display’s pixel ratio.
  - `CONTRAST` controls the grayscale contrast stretch, and `GAMMA` adjusts its midtones before luminance-weighted sampling.
  - `BACKGROUND_MASK` is `"plain"` for a solid-color backdrop, `"vignette"` for a busy backdrop, or `"none"` to disable masking. The sampler crops from the top center so the face fills the frame.
  - `SHOW_FAINT_PHOTO` toggles a 10%-opacity photo underlay after the particles settle; `PHOTO_OPACITY` tunes its strength.
  - `CROP_HEIGHT` sets how much of the source photo’s height is sampled. `repelStrength` in the animation loop controls pointer interaction.
- Edit the project cards in `projects/index.html` and the featured cards in `index.html` as projects take shape.
- Add your LinkedIn profile URL to the LinkedIn entry in `contact/index.html` and the footer links on each page.
- When a resume is ready, add it at `assets/resume.pdf`, then replace the disabled button and note in `resume/index.html` with a download link.
- The Contact page sends form and guided-chat messages through Formspree. See **Send contact messages** below to change the endpoint, review the spam honeypot, and find submissions.

## Change the colors

Edit the custom properties near the top of `css/style.css`. The dark palette is the first-visit default; the light palette is in `:root[data-theme="light"]`. The theme toggle remembers the visitor’s choice in local storage.

## Motion effects

The motion enhancements are in `css/effects.css` and `js/effects.js`. At the top of `js/effects.js`, set an entry in `EFFECTS` to `false` to disable that effect. The first-visit intro is present in the page markup, starts only on the first visit, and can be skipped with its button, Escape, or a pointer/touch press anywhere. It is omitted when reduced motion is enabled. For testing, add `?intro=1` to any page URL to force the intro; append `&introSlow=1` to slow its progress to six seconds. The longer duration only applies to this debug URL.

Phase 2 adds word and clip-path reveals, a scroll progress bar, section navigation on Home and Projects, a project index on Projects, and an automatic dark/light palette that follows the marked sections. Pressing the theme toggle takes precedence over automatic palette changes until the next page load. On fine-pointer devices, wheel input gets a short vanilla-JavaScript inertia treatment; keyboard scrolling, same-page anchors, browser find, and history navigation remain native. Touch and reduced-motion users keep native scrolling.

To change automatic palette sections, edit the `data-scroll-theme` attributes in the page markup. The Home and Projects section rails use `data-rail-label`; each rail target needs a stable `id`. The Projects index follows project cards with IDs inside `.project-page-grid`. The particle portrait remains in `js/main.js` and continues to use the embedded image data in `js/photo-data.js` for `file://` compatibility.

Phase 3 adds a full-screen menu, particle scenes (portrait, name, and laptop), and scroll-speed scatter. Use the `Scene` button on either portrait to cycle scenes; scrolling through the portrait also selects a scene. The portrait renders its dots through a single `ImageData` upload per frame and caps canvas pixel ratio at 2. If mobile morph rendering stays below 50fps for two sample windows, it progressively reduces the particle count (down to 1,500); drawing every other dot is retained as a last-resort morph fallback. Reduced-motion mode keeps the portrait static and hides the scene control.

The Home project cards expand on hover or keyboard focus. Projects-page rows reveal their description on hover/focus; on touch devices, use each row's **Show details** button. On About, select the motto to trigger its small interaction. The **Menu** button opens the accessible full-screen navigation; Escape closes it and focus returns to the button. Disable any of these in the `EFFECTS` object at the top of `js/effects.js`: `particleMorph`, `menuOverlay`, `projectRows`, `expandablePanels`, or `aboutMotto`.

Phase 4 adds a three-slide placeholder “Kind words” carousel on Home. Replace the clearly labeled placeholder quotes and attributions with real feedback. The carousel advances every nine seconds, pauses while hovered or focused, and uses manual controls for reduced-motion visitors. The Contact page progressively enhances the regular form with guided conversation prompts; both paths submit to Formspree, and the plain POST form remains available when JavaScript is disabled. Set `testimonialsCarousel` or `contactChat` to `false` in `EFFECTS` in `js/effects.js` to turn either enhancement off.

## Send contact messages

- The Formspree endpoint is `CONTACT_ENDPOINT` near the top of `js/effects.js`; keep it in sync with the form `action` in `contact/index.html`. Both currently use `https://formspree.io/f/xkjrqoky`.
- The form includes a visually hidden `_gotcha` honeypot. People do not see or tab to it; common bots that fill every field are flagged by Formspree.
- View received messages by signing in to Formspree, opening the form associated with that endpoint, and checking its **Submissions** inbox. Formspree may require account confirmation before delivering messages.
- The form asks only for name, email, and message. The guided chat additionally sends the visitor’s selected topic. Messages are sent to Formspree for delivery to the configured email; this site does not store them.

## Deploy for free

### GitHub Pages

1. Create a GitHub repository and add these files at its root.
2. Push the files to the repository’s default branch.
3. In the repository, open **Settings → Pages**.
4. Choose **Deploy from a branch**, select the default branch and `/ (root)`, then save.
5. Wait for the published URL shown in the Pages settings.

GitHub Pages serves the folder-based clean routes. It does not redirect the previous `.html` page URLs; no compatibility redirect is included. Canonical and Open Graph URLs, `sitemap.xml`, and `robots.txt` use `https://nawarajgupta.com.np`. Update these if you change domains.

### Netlify

1. Sign in to Netlify and open **Add new site → Deploy manually**.
2. Drag the project folder onto Netlify Drop. No build command is required.
3. The root `_redirects` file maps the old `.html` URLs to clean routes and sends unknown paths to `404.html`.

On other static hosts, configure a not-found document as `404.html` if the host requires it. The site itself needs no build step.

## Changing the photo (important)

The particle portrait reads pixels from `js/photo-data.js`, which embeds the photo as a data URI so the effect works
even when you double-click `index.html` (browsers block pixel reading from normal files opened via `file://`).
After replacing `assets/photo.jpg`, regenerate it:

    python3 -c "import base64;b=base64.b64encode(open('assets/photo.jpg','rb').read()).decode();open('js/photo-data.js','w').write('window.PORTRAIT_PHOTO_DATA = \"data:image/jpeg;base64,'+b+'\";\n')"

Dark theme uses LOCAL_CONTRAST / LOCAL_RADIUS (in `initParticlePortrait`) to bring out facial features.
