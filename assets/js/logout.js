function getToken() {
  let tokenFromCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="));
  let tokenCookieValue = tokenFromCookie ? tokenFromCookie.split("=")[1] : null;

  let tokenSession = sessionStorage.getItem("token");

  return tokenCookieValue || tokenSession;
}

function logout() {
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
  sessionStorage.removeItem("token");

  updateNavigation();

  window.location.href = "../index.html";
}

function updateNavigation() {
  if (getToken()) {
    document.getElementById("navLinks").innerHTML = `    
          <li><a href="../index.html">Home</a></li>
          <li><a href="#" id="logout">Logout</a></li>
        `;
  } else {
    document.getElementById("navLinks").innerHTML = `    
          <li><a href="index.html">Home</a></li>
          <li><a href="pages/register.html">Register</a></li>
          <li><a href="pages/login.html">Login</a></li>
        `;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  updateNavigation();

  const logoutButton = document.getElementById("logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", function (e) {
      e.preventDefault();
      logout();
    });
  }
});
