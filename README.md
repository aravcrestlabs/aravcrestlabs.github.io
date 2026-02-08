# AravCrestLabs Website

This is the static website for AravCrestLabs, built with **Eleventy**.

## Build Commands

- **Build for Production**: `npm run build`
  - Generates static files in `dist/`.
  - Deployment-ready.

- **Development Server**: `npx @11ty/eleventy --serve`
  - Starts a local server at `http://localhost:8080`.
  - Watches for file changes.

## Deployment

The site is configured for deployment to GitHub Pages.

1. Build the site: `npm run build`
2. Commit changes:
   ```bash
   git add .
   git commit -m "Update site"
   git push origin main
   ```
3. GitHub Actions will automatically deploy the `dist/` folder.

## Project Structure

- `src/`: Source templates (EJS) and data.
- `src/_data/`: Global data files (`env.js`, `ext.js`).
- `public/`: Static assets (CSS, JS, Images) copied to root.
- `dist/`: Output directory (Do not edit manually).
