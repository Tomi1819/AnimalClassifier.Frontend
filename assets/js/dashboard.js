document.addEventListener("DOMContentLoaded", function () {
  const token = sessionStorage.getItem("token");

  if (!token) {
    console.warn("No token found. Redirecting to login...");
    window.location.href = "login.html";
    return;
  }

  const uploadForm = document.getElementById("uploadForm");
  const fileInput = document.getElementById("fileUpload");
  const uploadButton = document.getElementById("uploadButton");
  const uploadStatus = document.getElementById("uploadStatus");
  const resultSection = document.getElementById("resultSection");
  const resultImage = document.getElementById("resultImage");
  const predictedLabel = document.getElementById("predictedLabel");
  const dateRecognized = document.getElementById("dateRecognized");
  const predictionScore = document.getElementById("predictionScore");
  const lowConfidenceMessage = document.getElementById("lowConfidenceMessage");
  const historyList = document.getElementById("historyList");

  if (!uploadForm || !fileInput || !uploadButton) {
    console.error("Required form elements not found.");
    return;
  }

  uploadForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (fileInput.files.length === 0) {
      alert("Please select an image file.");
      return;
    }

    const formData = new FormData();
    formData.append("formFile", fileInput.files[0]);

    uploadStatus.textContent = "Uploading...";
    uploadButton.disabled = true;

    try {
      const response = await fetch("https://localhost:44378/api/upload/image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed.");
      }

      const fullImageUrl = `https://localhost:44378${data.imagePath}`;

      resultImage.src = fullImageUrl;
      predictedLabel.textContent = data.recognizedAnimal;
      dateRecognized.textContent = new Date(
        data.dateRecognized
      ).toLocaleString();
      predictionScore.textContent =
        (data.predictionScore * 100).toFixed(2) + "%";

      if (data.predictionScore < 0.5) {
        lowConfidenceMessage.style.display = "block";
      } else {
        lowConfidenceMessage.style.display = "none";
      }

      resultSection.style.display = "block";

      const historyItem = document.createElement("li");
      historyItem.innerHTML = `<img src="${fullImageUrl}" alt="Image" width="100"> ${
        data.recognizedAnimal
      } - ${new Date(data.dateRecognized).toLocaleString()}`;
      historyList.prepend(historyItem);

      uploadStatus.textContent = "Upload successful!";
    } catch (error) {
      console.error("Error:", error);
      uploadStatus.textContent = "Error uploading file.";
    } finally {
      uploadButton.disabled = false;
    }
  });
});
