# Jared Site

Static personal site for Jared Goldberg.

The project is built as a hand-authored HTML/CSS/JS site with a shared visual shell across essays, work case studies, recipes, art, and community pages. It also contains a few experimental camera/mashup prototypes that are separate from the main editorial site.

## Project shape

- `index.html`, `about.html`, `art.html`, `dm.html`: top-level entry pages
- `assets/`: shared site CSS, JS, and common assets
- `writing/`: essays and index page
- `systems/`: work and systems case studies
- `food/`: recipes and food experiments
- `community/`: community-service and social-impact pages
- `favicon/`: favicon source and exports
- `Ad App/`, `mashup v1/`: experimental prototype apps

## Stack

- Static HTML
- Shared CSS in `assets/style.css`
- Lightweight vanilla JS in `assets/site.js`
- One PHP form handler in `art-access.php`

## Local development

This repo does not require a build step.

For static preview, open `index.html` directly or run a simple local server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

If you need to test the art access form, use a local PHP server instead:

```bash
php -S localhost:8000
```

## Current priorities

- Keep the shared shell consistent across pages
- Replace placeholder production metadata and canonical URLs
- Preserve the main editorial site separately from prototype experiments
- Build new work on top of the shared design system instead of duplicating page chrome further

## Notes

- There is currently no GitHub remote configured for this local repository.
- The working tree may contain in-progress content edits; avoid broad cleanup commands unless you intend to review each change.
