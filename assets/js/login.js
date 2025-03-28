document
  .getElementById("loginForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const loginData = {
      email: document.getElementById("email").value,
      password: document.getElementById("password").value,
    };

    fetch("https://localhost:44378/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Login error. Please check your credentials.");
        }
        return response.json();
      })
      .then((data) => {
        if (data.token) {
          sessionStorage.setItem("token", data.token);
          alert("Successful login!");
          window.location.href = "dashboard.html";
        } else {
          alert("Error: " + data.message);
        }
      })
      .catch((error) => {
        alert("Invalid email or password.");
        console.error(error);
      });
  });
