document
  .getElementById("registerForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const fullName = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const registerData = {
      fullName: fullName,
      email: email,
      password: password,
    };

    fetch("https://localhost:44378/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registerData),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.userId) {
          alert("Success!");
          window.location.href = "login.html";
        } else {
          alert("Registration error: " + data.message);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Error sending request.");
      });
  });
