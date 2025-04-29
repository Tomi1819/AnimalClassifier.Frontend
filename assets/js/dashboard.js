document.addEventListener("DOMContentLoaded", function () {
  const token = sessionStorage.getItem("token");

  if (!token) {
    console.warn("No token found. Redirecting to login...");
    window.location.href = "login.html";
    return;
  }

  const imageTabBtn = document.getElementById("imageTabBtn");
  const videoTabBtn = document.getElementById("videoTabBtn");
  const imageUploadTab = document.getElementById("imageUploadTab");
  const videoUploadTab = document.getElementById("videoUploadTab");

  const imageUploadForm = document.getElementById("imageUploadForm");
  const imageFileInput = document.getElementById("imageFileUpload");
  const imageUploadButton = document.getElementById("imageUploadButton");

  const videoUploadForm = document.getElementById("videoUploadForm");
  const videoFileInput = document.getElementById("videoFileUpload");
  const videoUploadButton = document.getElementById("videoUploadButton");

  const uploadStatus = document.getElementById("uploadStatus");
  const resultSection = document.getElementById("resultSection");
  const resultImage = document.getElementById("resultImage");
  const resultVideo = document.getElementById("resultVideo");
  const predictedLabel = document.getElementById("predictedLabel");
  const dateRecognized = document.getElementById("dateRecognized");
  const predictionScore = document.getElementById("predictionScore");
  const lowConfidenceMessage = document.getElementById("lowConfidenceMessage");
  const historyList = document.getElementById("historyList");

  if (
    !imageUploadForm ||
    !imageFileInput ||
    !videoUploadForm ||
    !videoFileInput
  ) {
    console.error("Required form elements not found.");
    return;
  }

  imageTabBtn.addEventListener("click", function () {
    imageTabBtn.classList.add("active");
    videoTabBtn.classList.remove("active");
    imageUploadTab.style.display = "block";
    videoUploadTab.style.display = "none";
  });

  videoTabBtn.addEventListener("click", function () {
    videoTabBtn.classList.add("active");
    imageTabBtn.classList.remove("active");
    videoUploadTab.style.display = "block";
    imageUploadTab.style.display = "none";
  });

  imageUploadForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (imageFileInput.files.length === 0) {
      alert("Please select an image file.");
      return;
    }

    const formData = new FormData();
    formData.append("formFile", imageFileInput.files[0]);

    uploadStatus.textContent = "Uploading...";
    imageUploadButton.disabled = true;

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
      resultImage.style.display = "block";
      resultVideo.style.display = "none";

      const existingVideoStats = document.getElementById("videoStats");
      if (existingVideoStats) {
        existingVideoStats.remove();
      }

      const paragraphs = resultSection.querySelectorAll("p");
      if (paragraphs.length >= 3) {
        paragraphs[0].style.display = "block";
        paragraphs[2].style.display = "block";
      }

      displayResults(data, fullImageUrl, "image");

      uploadStatus.textContent = "Image upload successful!";
    } catch (error) {
      console.error("Error:", error);
      uploadStatus.textContent = "Error uploading image.";
    } finally {
      imageUploadButton.disabled = false;
    }
  });

  videoUploadForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (videoFileInput.files.length === 0) {
      alert("Please select a video file.");
      return;
    }

    const formData = new FormData();
    formData.append("videoFile", videoFileInput.files[0]);

    uploadStatus.textContent = "Uploading video...";
    videoUploadButton.disabled = true;

    try {
      const response = await fetch("https://localhost:44378/api/upload/video", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Video upload failed.");
      }

      const fullVideoUrl = `https://localhost:44378${data.videoPath}`;

      resultVideo.src = fullVideoUrl;
      resultVideo.style.display = "block";
      resultImage.style.display = "none";

      displayVideoResults(data, fullVideoUrl);

      uploadStatus.textContent = "Video upload successful!";
    } catch (error) {
      console.error("Error:", error);
      uploadStatus.textContent = "Error uploading video.";
    } finally {
      videoUploadButton.disabled = false;
    }
  });

  function displayResults(data, mediaUrl, mediaType) {
    predictedLabel.textContent = data.recognizedAnimal;
    dateRecognized.textContent = new Date(data.dateRecognized).toLocaleString();
    predictionScore.textContent = (data.predictionScore * 100).toFixed(2) + "%";

    if (data.predictionScore < 0.5) {
      lowConfidenceMessage.style.display = "block";
    } else {
      lowConfidenceMessage.style.display = "none";
    }

    resultSection.style.display = "block";

    addToHistory({
      type: "image",
      url: mediaUrl,
      animal: data.recognizedAnimal,
      date: new Date(data.dateRecognized).toLocaleString(),
    });
  }

  function displayVideoResults(data, videoUrl) {
    const existingVideoStats = document.getElementById("videoStats");
    if (existingVideoStats) {
      existingVideoStats.remove();
    }

    resultSection.style.display = "block";

    const videoStatsDiv = document.createElement("div");
    videoStatsDiv.id = "videoStats";
    videoStatsDiv.className = "video-stats";

    const framesCounter = document.createElement("div");
    framesCounter.className = "frames-counter";
    framesCounter.innerHTML = `
      <div class="counter-label">Frames Processed</div>
      <div class="counter-value" id="framesCount">0</div>
      <div class="counter-progress">
        <div class="progress-bar" id="framesProgressBar"></div>
      </div>
    `;
    videoStatsDiv.appendChild(framesCounter);

    const animalsDetected = document.createElement("div");
    animalsDetected.className = "animals-detected";
    animalsDetected.innerHTML = `
      <h3>Animals Detected (${data.topAnimals.length})</h3>
      <div class="animals-grid" id="animalsGrid"></div>
    `;
    videoStatsDiv.appendChild(animalsDetected);

    const mediaContainer = document.getElementById("mediaContainer");
    if (mediaContainer) {
      if (mediaContainer.nextSibling) {
        resultSection.insertBefore(videoStatsDiv, mediaContainer.nextSibling);
      } else {
        resultSection.appendChild(videoStatsDiv);
      }
    } else {
      resultSection.appendChild(videoStatsDiv);
    }

    const paragraphs = resultSection.querySelectorAll("p");
    if (paragraphs.length >= 3) {
      paragraphs[0].style.display = "none"; // Recognized animal
      paragraphs[2].style.display = "none"; // Prediction accuracy
    }

    dateRecognized.textContent = new Date().toLocaleString();

    const targetFrames = data.framesProcessed;
    let currentFrames = 0;
    const framesCountElement = document.getElementById("framesCount");
    const framesProgressBar = document.getElementById("framesProgressBar");

    const frameInterval = setInterval(() => {
      currentFrames++;
      framesCountElement.textContent = currentFrames;
      framesProgressBar.style.width =
        (currentFrames / targetFrames) * 100 + "%";

      if (currentFrames >= targetFrames) {
        clearInterval(frameInterval);
      }
    }, 50);

    const animalsGrid = document.getElementById("animalsGrid");
    if (!animalsGrid) {
      console.error("Animals grid element not found");
      return;
    }

    data.topAnimals.forEach((animal, index) => {
      const scorePercentage = (parseFloat(animal.averageScore) * 100).toFixed(
        0
      );
      const animalCard = document.createElement("div");
      animalCard.className = "animal-card";
      animalCard.style.animationDelay = index * 0.2 + "s";

      animalCard.innerHTML = `
        <div class="animal-icon ${animal.animal.toLowerCase()}">
          <svg viewBox="0 0 24 24" class="animal-svg">
            <circle cx="12" cy="12" r="10" fill="#f0f0f0"></circle>
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="8px">${animal.animal
              .charAt(0)
              .toUpperCase()}</text>
          </svg>
        </div>
        <div class="animal-details">
          <div class="animal-name">${animal.animal}</div>
          <div class="animal-score-container">
            <div class="animal-score-bar">
              <div class="animal-score-fill" style="width: 0%"></div>
            </div>
            <div class="animal-score-percentage">0%</div>
          </div>
        </div>
      `;

      animalsGrid.appendChild(animalCard);

      setTimeout(() => {
        const scoreFill = animalCard.querySelector(".animal-score-fill");
        const scorePercentageText = animalCard.querySelector(
          ".animal-score-percentage"
        );
        let currentScore = 0;

        const scoreInterval = setInterval(() => {
          currentScore++;
          scoreFill.style.width = currentScore + "%";
          scorePercentageText.textContent = currentScore + "%";

          if (currentScore >= scorePercentage) {
            clearInterval(scoreInterval);
          }
        }, 20);
      }, 500 + index * 200);
    });

    const topAnimal =
      data.topAnimals.length > 0 ? data.topAnimals[0].animal : "Unknown";
    addToHistory({
      type: "video",
      url: videoUrl,
      animal: topAnimal,
      date: new Date().toLocaleString(),
      framesProcessed: data.framesProcessed,
      allAnimals: data.topAnimals.map((a) => a.animal).join(", "),
    });
  }

  function addToHistory(itemData) {
    const historyItem = document.createElement("li");
    historyItem.className = "history-item-container";

    let itemHTML = "";

    if (itemData.type === "image") {
      itemHTML = `
        <div class="history-item">
          <img src="${itemData.url}" alt="Image" width="100">
          <div class="history-details">
            <h4>${itemData.animal}</h4>
            <div class="date">${itemData.date}</div>
            <div class="result">Type: Image</div>
          </div>
        </div>`;
    } else if (itemData.type === "video") {
      itemHTML = `
        <div class="history-item">
          <video width="100" height="100">
            <source src="${itemData.url}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
          <div class="history-details">
            <h4>${itemData.animal}</h4>
            <div class="date">${itemData.date}</div>
            <div class="result">Video: ${itemData.framesProcessed} frames analyzed</div>
            <div class="animals-found">${itemData.allAnimals}</div>
          </div>
        </div>`;
    }

    historyItem.innerHTML = itemHTML;
    historyList.prepend(historyItem);
  }
});
