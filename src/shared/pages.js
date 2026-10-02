/**
 * Where each page is served from. The navigation and every redirect read the
 * paths from here, so that a page which moves is changed in one place.
 *
 * The HTML files link to one another directly, and Vite needs each of them
 * listed as an entry point in vite.config.js; neither reads these.
 */
export const HOME_PAGE = "/";
export const LOGIN_PAGE = "/pages/login.html";
export const REGISTER_PAGE = "/pages/register.html";
export const DASHBOARD_PAGE = "/pages/dashboard.html";
export const SEARCH_PAGE = "/pages/search.html";
export const STATISTICS_PAGE = "/pages/statistics.html";
export const ACCOUNT_PAGE = "/pages/account.html";
export const ADMIN_PAGE = "/pages/admin.html";
