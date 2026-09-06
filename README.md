# AnimalClassifier.Frontend 🐾

**AnimalClassifier.Frontend** is the web-based user interface for the [*AnimalClassifier*](https://github.com/Tomi1819/AnimalClassifier) project. It allows users to upload animal images and receive classification results via a machine learning backend service.

## 🔍 Overview

A lightweight, framework-free interface built with HTML, CSS, and vanilla JavaScript, bundled by [Vite](https://vite.dev/).

## 🛠️ Technologies Used

- 🌐 HTML
- 🎨 CSS
- ⚙️ JavaScript (Vanilla, ES modules)
- ⚡ Vite (dev server, API proxy, production build)
- 📊 Chart.js (statistics page only)

## 🚀 Getting Started

Start the backend first, using the `https` launch profile (`https://localhost:7292`):

```bash
cd ../AnimalClassifier/AnimalClassifier
dotnet run --launch-profile https
```

Then start the frontend:

```bash
npm install
npm run dev
```

The app is served at <http://localhost:3000>.

| Script            | Description                                   |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Dev server with hot reload and the API proxy   |
| `npm run build`   | Production build into `dist/`                  |
| `npm run preview` | Serves the production build locally            |

## 🔌 Backend Connection

In development, Vite proxies `/api` and `/uploads` to the backend (see `vite.config.js`). Requests therefore stay same-origin, so **CORS does not apply and the self-signed development certificate is accepted automatically**.

If the backend runs on a different port, change `BACKEND_URL` in `vite.config.js`.

For deployments where the frontend is served from a different origin than the API, set `VITE_API_BASE_URL` in `.env.production` to the backend origin, and add that frontend origin to `Cors:AllowedOrigins` in the backend's `appsettings.json`. Leave it empty when the backend serves the built frontend itself.

> Only `VITE_`-prefixed variables are exposed to the browser, and they are baked into the bundle at build time. Never put secrets in them.

## 📁 Project Structure

```
index.html            Home page
pages/                One HTML file per page (each is a build entry point)
public/               Static files served from the root, e.g. /logo.png
src/
  api/client.js       fetch wrapper: base URL, bearer token, error handling
  auth/session.js     Token storage and the page guard
  shared/nav.js       Session-aware navigation and logout
  pages/              One module per page
  styles/main.css     Application styles
```
