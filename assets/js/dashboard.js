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
  const historyList = document.getElementById("historyList");

  if (!uploadForm || !fileInput || !uploadButton) {
    console.error("Not all items found!");
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

    uploadStatus.innerHTML = "Uploading";
    uploadButton.disabled = true;

    try {
      const response = await fetch("https://localhost:44378/api/upload/image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image.");
      }

      const data = await response.json();

      resultImage.src = data.imagePath;
      predictedLabel.innerText = data.recognizedAnimal;
      dateRecognized.innerText = new Date(data.dateRecognized).toLocaleString();
      resultSection.style.display = "block";

      const historyItem = document.createElement("li");
      historyItem.innerHTML = `<img src="${
        data.imagePath
      }" alt="Image" width="100"> ${data.recognizedAnimal} - ${new Date(
        data.dateRecognized
      ).toLocaleString()}`;
      historyList.appendChild(historyItem);

      uploadStatus.innerHTML = "Upload successful!";
    } catch (error) {
      console.error("Error:", error);
      uploadStatus.innerHTML = "Error uploading file.";
    } finally {
      uploadButton.disabled = false;
    }
  });
});
