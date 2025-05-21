document.addEventListener("DOMContentLoaded", async function () {
  const token = getToken();

  if (!token) {
    alert("You must be logged in to view this page.");
    window.location.href = "../pages/login.html";
    return;
  }

  await fetchRecognitionCount(token);
  await fetchUserCount(token);
  await fetchTopAnimals(token);
});

function getToken() {
  let tokenFromCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="));
  let tokenCookieValue = tokenFromCookie ? tokenFromCookie.split("=")[1] : null;
  let tokenSession = sessionStorage.getItem("token");
  return tokenCookieValue || tokenSession;
}

async function fetchRecognitionCount(token) {
  try {
    const res = await fetch("https://localhost:44378/api/statistics/total", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error(`Failed with status ${res.status}`);
    const count = await res.json();
    document.getElementById("totalRecognitions").textContent = count;
  } catch (err) {
    console.error("Error fetching recognition count:", err);
    document.getElementById("totalRecognitions").textContent = "Error";
  }
}

async function fetchUserCount(token) {
  try {
    const res = await fetch("https://localhost:44378/api/statistics/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error(`Failed with status ${res.status}`);
    const count = await res.json();
    document.getElementById("totalUsers").textContent = count;
  } catch (err) {
    console.error("Error fetching user count:", err);
    document.getElementById("totalUsers").textContent = "Error";
  }
}

async function fetchTopAnimals(token) {
  try {
    const res = await fetch(
      "https://localhost:44378/api/statistics/top-animal",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Response status:", res.status);
    console.log("Content-Type:", res.headers.get("Content-Type"));

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Raw error response:", errorText);
      throw new Error(`Request failed with status ${res.status}`);
    }

    const data = await res.json();
    console.log("Top animals response:", data);

    const labels = data.map((item) => item.animalName);
    const values = data.map((item) => item.count);

    renderAnimalChart(labels, values);
  } catch (err) {
    console.error("Error fetching top animals:", err);
    document.getElementById("topAnimalsChart").textContent =
      "Error loading chart.";
  }
}

function renderAnimalChart(labels, values) {
  const canvas = document.createElement("canvas");
  document.getElementById("topAnimalsChart").innerHTML = "";
  document.getElementById("topAnimalsChart").appendChild(canvas);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Recognitions",
          data: values,
          backgroundColor: ["#ff6384", "#36a2eb", "#ffce56"],
          borderRadius: 12,
          barThickness: 60,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
        datalabels: {
          anchor: "end",
          align: "end",
          color: "#444",
          font: {
            weight: "bold",
            size: 14,
          },
        },
        title: {
          display: false,
        },
      },
      layout: {
        padding: 20,
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 20,
          },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}
