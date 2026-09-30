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

## ⚙️ Account settings

The account page is a list of settings, grouped under titles such as "Sign-in
and security". Each row names a setting, sums up its state, and opens in place
to change it; opening one closes any other, so the page never holds two
changes half made.

To add a setting:

1. Add a row to a group's list in `pages/account.html`: an `li.setting` with an
   id, a `.setting__head` holding the label, the summary and a button marked
   `data-setting-open`, and a `.setting__panel hidden` holding the change, with
   a button marked `data-setting-close`. A setting that is a single action,
   such as signing out everywhere, can leave the panel out and give its button
   a handler of its own.
2. Give it a module in `src/account/` that calls `initSetting` from
   `src/account/setting.js`. `onOpen` focuses where the user starts, `onClose`
   clears whatever was typed, and the returned `close` puts the panel away once
   the change is made.
3. Call that module's init from `src/pages/account.js`.

A setting that belongs with none of the groups gets a new
`section.settings-group` of its own, as deleting the account has in "Danger
zone".

## ✏️ Changing the name

The token carries only the email, so the "Profile" group asks the backend for
the name with `getProfile` in `src/auth/account.js` and shows it as the row's
summary. The field starts from that name, and cancelling puts it back.

`changeName` saves what was typed. The backend keeps the letters as they are
and tidies only the spacing, and the row shows its copy. Passkeys made before
the change keep the old name on the user's devices.

## 🔑 Changing the password

The account page changes the password once the current one is confirmed. The
backend ends every session the account had and answers with a new token, which
`changePassword` in `src/auth/account.js` stores in place of the old one, so
this tab and any other open on the same browser stay signed in. Other devices
have to sign in again.

Signing out the other devices, from the same page, works the same way: the
backend ends every session, and `signOutOtherSessions` keeps this one going
with the token it answers with.

## 📦 Downloading the account's data

"Your data" on the account page downloads a copy of everything the account
holds: the profile, the whole history, cleared entries included, and the
uploaded files, in one ZIP archive the backend builds. It is a single action,
so the row has no panel and nothing to confirm.

`exportData` in `src/auth/account.js` fetches the archive with `apiDownload`,
which calls the backend the way `apiFetch` does but hands back a Blob rather
than JSON, and `saveFile` in `src/shared/save-file.js` gives it to the browser
to save. The file is named after the day in the user's own time zone. The
backend allows only a few exports in a while, and explains a refusal under the
button.

## 🗑️ Deleting the account

The "Danger zone" at the bottom of the account page deletes the account once
its password is typed in and a last question is answered. The backend removes
the account with its history, uploads and passkeys, and every session ends with
it, so `deleteAccount` in `src/auth/account.js` clears the stored session and
the page returns to the home page. A wrong password, or an administrator's
account, which the backend refuses to delete, is explained under the form.

Its red, in `.btn--danger` and `.btn-ghost--danger`, is kept for changes that
cannot be taken back. The fill comes from `--danger-fill`, which the dark theme
leaves as it is so the white text on it stays readable.

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
  auth/account.js         Account changes that keep this session going
  account/setting.js      A settings row that opens in place
  account/                The account page's header and one module per setting
  shared/account-menu.js  The settings menu: account, admin, theme and sign out
  shared/confirm.js       The modal confirmation, built in script
  shared/disclosure.js    Open and close handling shared by the bar's menus
  shared/icons.js         The outline icons the menus draw
  shared/nav.js           Session-aware navigation
  shared/save-file.js     Saves a file the page holds as a download
  shared/signed-in-user.js  Who is signed in, as the menu and account page show it
  shared/theme.js         The theme choice, stored and applied
  shared/theme-switch.js  The light and dark control
  pages/                  One module per page
  styles/main.css         Application styles
```
