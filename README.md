# AnimalClassifier.Frontend 🐾

**AnimalClassifier.Frontend** is the web-based user interface for the [*AnimalClassifier*](https://github.com/Tomi1819/AnimalClassifier) project. It allows users to upload animal images and receive classification results via a machine learning backend service.

## 🔍 Overview

A lightweight, framework-free interface built with HTML, CSS, and vanilla JavaScript, bundled by [Vite](https://vite.dev/).

## 🛠️ Technologies Used

- 🌐 HTML
- 🎨 CSS
- ⚙️ JavaScript (Vanilla, ES modules)
- ⚡ Vite (dev server, API proxy, production build)

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

## 🗝️ Passkeys

The login page offers a passkey alongside the password, and the account page
registers and removes them. Both are hidden where the browser cannot take part,
which is decided by `isPasskeySupported` in `src/auth/passkeys.js`: it looks for
the JSON helpers on `PublicKeyCredential`, which spare the module from
converting every field to and from its binary form by hand.

A passkey is bound to the domain in the address bar, so the backend's relying
party id has to be this frontend's domain. In development that is `localhost`,
which browsers accept without HTTPS; a deployment needs HTTPS and a domain
shared with the API. See the backend README.

## 🔑 Changing the password

The account page changes the password once the current one is confirmed. The
backend ends every session the account had and answers with a new token, which
`changePassword` in `src/auth/password.js` stores in place of the old one, so
this tab and any other open on the same browser stay signed in. Other devices
have to sign in again.

## 🌗 Themes

The site has a light and a dark theme. It is light until the user picks dark
from the switch in the account menu, and the choice is kept in `localStorage`
under `theme`.

- `public/theme-init.js` runs in each page's `<head>` and sets
  `<html data-theme="light|dark">` before the first paint, so a dark page never
  flashes light. Every new page needs the same `<script>` tag.
- `src/shared/theme.js` keeps the page in step afterwards, including with a
  choice made in another tab.
- `src/styles/main.css` defines every colour as a variable on `:root` and gives
  the dark values under `:root[data-theme="dark"]`. New rules should use the
  variables rather than fixed colours, so that they work in both themes.

## 📁 Project Structure

```
index.html                Home page
pages/                    One HTML file per page (each is a build entry point)
public/                   Static files served from the root, e.g. /logo.png
  theme-init.js           Sets the theme before the first paint
src/
  api/client.js           fetch wrapper: base URL, bearer token, error handling
  auth/session.js         Token storage and the page guard
  auth/passkeys.js        WebAuthn ceremonies, one function each
  auth/password.js        Changing the password and keeping the new session
  account/                The account page's sections: password and passkeys
  shared/account-menu.js  The settings menu: account, admin, theme and sign out
  shared/confirm.js       The modal confirmation, built in script
  shared/disclosure.js    Open and close handling shared by the bar's menus
  shared/icons.js         The outline icons the menus draw
  shared/nav.js           Session-aware navigation
  shared/theme.js         The theme choice, stored and applied
  shared/theme-switch.js  The light and dark control
  pages/                  One module per page
  styles/main.css         Application styles
```
