import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { apiFetch } from "../api/client.js";
import { requireAuthentication } from "../auth/session.js";
import { initNavigation } from "../shared/nav.js";

const ERROR_PLACEHOLDER = "Error";
const CHART_COLORS = ["#ff6384", "#36a2eb", "#ffce56"];

initNavigation();

// Module scripts are deferred, so the document is already parsed here.
if (requireAuthentication()) {
  await Promise.all([
    showCount("/api/statistics/total", "totalRecognitions"),
    showCount("/api/statistics/users", "totalUsers"),
    showTopAnimals(),
  ]);
}

async function showCount(path, elementId) {
  const element = document.getElementById(elementId);

  try {
    element.textContent = await apiFetch(path);
  } catch (error) {
    console.error(`Failed to load ${path}:`, error);
    element.textContent = ERROR_PLACEHOLDER;
  }
}

async function showTopAnimals() {
  const container = document.getElementById("topAnimalsChart");

  try {
    const animals = await apiFetch("/api/statistics/top-animal");
    renderAnimalChart(
      container,
      animals.map((animal) => animal.animalName),
      animals.map((animal) => animal.count),
    );
  } catch (error) {
    console.error("Failed to load top animals:", error);
    container.textContent = "Error loading chart.";
  }
}

function renderAnimalChart(container, labels, values) {
  const canvas = document.createElement("canvas");
  container.replaceChildren(canvas);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Recognitions",
          data: values,
          backgroundColor: CHART_COLORS,
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
          font: { weight: "bold", size: 14 },
        },
        title: { display: false },
      },
      layout: { padding: 20 },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 20 } },
      },
    },
    plugins: [ChartDataLabels],
  });
}
