const masks = [
  "assets/masks/MUM-3.png",
  "assets/masks/MUM-4.png",
  "assets/masks/MUM-5.png",
  "assets/masks/MUM-6.png",
  "assets/masks/MUM-7.png",
  "assets/masks/MUM-8.png",
  "assets/masks/MUM-9.png",
];

const CAPTURE_WIDTH = 1080;
const CAPTURE_HEIGHT = 1440;

const camera = document.getElementById("camera");
const maskOverlay = document.getElementById("maskOverlay");
const captureButtons = document.querySelectorAll(".capture-btn");
const cropBtn = document.getElementById("cropBtn");
const flipCameraBtn = document.getElementById("flipCameraBtn");
const permission = document.getElementById("permission");
const startCameraBtn = document.getElementById("startCamera");
const cameraScreen = document.getElementById("cameraScreen");
const previewScreen = document.getElementById("previewScreen");
const cropScreen = document.getElementById("cropScreen");
const previewImage = document.getElementById("previewImage");
const saveBtn = document.getElementById("saveBtn");
const reshootBtn = document.getElementById("reshootBtn");
const prevMaskBtn = document.getElementById("prevMask");
const nextMaskBtn = document.getElementById("nextMask");
const cropCanvas = document.getElementById("cropCanvas");
const cropFrame = document.querySelector("#cropScreen .frame");
const cropSlider = document.getElementById("cropSlider");
const cropUpBtn = document.getElementById("cropUpBtn");
const cropDownBtn = document.getElementById("cropDownBtn");
const cropThumb = document.getElementById("cropThumb");
const cropSaveBtn = document.getElementById("cropSaveBtn");
const cropActions = document.getElementById("cropActions");
const cropReshootBtn = document.getElementById("cropReshootBtn");
const canvas = document.getElementById("captureCanvas");
const ctx = canvas.getContext("2d");
const cropCtx = cropCanvas ? cropCanvas.getContext("2d") : null;
const logDebug = (..._args) => {};
window.logDebug = logDebug;

let stream = null;
let maskIndex = 0;
let maskImg = new Image();
let captureDataUrl = null;
let captureBlob = null;
let captureMode = "preview";
let cropSourceImage = null;
let cropY = Math.round(CAPTURE_HEIGHT * 0.6);
let cropShade = "bottom";
let cameraFacing = "user";

const CROP_STEP = 40;
const CROP_MIN = 200;

canvas.width = CAPTURE_WIDTH;
canvas.height = CAPTURE_HEIGHT;
if (cropCanvas) {
  cropCanvas.width = CAPTURE_WIDTH;
  cropCanvas.height = CAPTURE_HEIGHT;
}

function setPermissionMessage(message) {
  const target = permission.querySelector("p");
  if (target) target.textContent = message;
}

function setActiveScreen(screen) {
  cameraScreen.classList.remove("active");
  previewScreen.classList.remove("active");
  if (cropScreen) cropScreen.classList.remove("active");
  screen.classList.add("active");
}

function updateMask(index) {
  maskIndex = (index + masks.length) % masks.length;
  maskOverlay.src = masks[maskIndex];
  maskImg = new Image();
  maskImg.src = masks[maskIndex];
}

function addTapHandler(element, handler) {
  if (!element) return;
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (isTouch) {
    element.addEventListener("touchend", (event) => {
      if (element.id) logDebug(`tap: ${element.id}`);
      handler(event);
    });
  } else {
    element.addEventListener("click", (event) => {
      if (element.id) logDebug(`click: ${element.id}`);
      handler(event);
    });
  }
}

function setCaptureMode(mode) {
  captureMode = mode;
  if (cropBtn) {
    cropBtn.classList.toggle("active", mode === "crop");
  }
  if (cameraScreen) {
    cameraScreen.classList.toggle("crop-mode", mode === "crop");
  }
  if (maskOverlay) {
    maskOverlay.style.opacity = mode === "crop" ? "0" : "";
  }
}

function setCropEditing(isEditing) {
  if (cropSlider) cropSlider.classList.remove("hidden");
  if (cropActions) cropActions.classList.remove("hidden");
  renderCropPreview();
}

function handleCropActivate() {
  setCropEditing(true);
}

async function initCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setPermissionMessage("Camera not available in this browser.");
    return;
  }

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }

  const baseConstraints = {
    width: { ideal: 1080 },
    height: { ideal: 1440 },
    aspectRatio: 3 / 4,
    resizeMode: "crop-and-scale",
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        ...baseConstraints,
        facingMode: { exact: cameraFacing },
      },
      audio: false,
    });
    logDebug(`camera: ${cameraFacing} exact`);
  } catch (err) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...baseConstraints,
          facingMode: { ideal: cameraFacing },
        },
        audio: false,
      });
      logDebug(`camera: ${cameraFacing} ideal`);
    } catch (err2) {
      const message =
        err2 && err2.name ? `${err2.name}: ${err2.message}` : "Camera blocked.";
      setPermissionMessage(`${message} Check camera permissions and HTTPS.`);
      logDebug(`camera error: ${message}`);
      return;
    }
  }

  camera.setAttribute("playsinline", "");
  camera.setAttribute("webkit-playsinline", "");
  camera.muted = true;
  camera.autoplay = true;
  camera.srcObject = stream;
  if (cameraFacing === "user") {
    camera.classList.add("mirrored");
  } else {
    camera.classList.remove("mirrored");
  }

  try {
    await camera.play();
  } catch (err) {
    setPermissionMessage("Tap Start Camera again to allow playback.");
    return;
  }

  permission.classList.add("hidden");
}

function drawCameraFrame(includeMask = true) {
  if (includeMask && !maskImg.complete) return null;

  const cw = canvas.width;
  const ch = canvas.height;
  const vw = camera.videoWidth;
  const vh = camera.videoHeight;

  if (!vw || !vh) return null;

  const rect = camera.getBoundingClientRect();
  const displayWidth = rect.width || cw;
  const displayHeight = rect.height || ch;
  const displayAspect = displayWidth / displayHeight;
  const videoAspect = vw / vh;

  let sx = 0;
  let sy = 0;
  let sWidth = vw;
  let sHeight = vh;

  if (videoAspect > displayAspect) {
    sHeight = vh;
    sWidth = vh * displayAspect;
    sx = (vw - sWidth) / 2;
  } else {
    sWidth = vw;
    sHeight = vw / displayAspect;
    sy = (vh - sHeight) / 2;
  }

  ctx.clearRect(0, 0, cw, ch);
  ctx.save();
  if (cameraFacing === "user") {
    ctx.translate(cw, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(camera, sx, sy, sWidth, sHeight, 0, 0, cw, ch);
  ctx.restore();

  if (includeMask) {
    ctx.drawImage(maskImg, 0, 0, cw, ch);
  }

  return canvas;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateCropThumb() {
  if (!cropThumb) return;
  const percent = cropY / CAPTURE_HEIGHT;
  cropThumb.style.top = `${percent * 100}%`;
}

function renderCropPreview() {
  if (!cropCtx || !cropSourceImage) return;
  cropCtx.clearRect(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
  cropCtx.drawImage(cropSourceImage, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
  cropCtx.fillStyle = "rgba(0, 0, 0, 0.45)";
  if (cropShade === "top") {
    cropCtx.fillRect(0, 0, CAPTURE_WIDTH, cropY);
  } else {
    cropCtx.fillRect(0, cropY, CAPTURE_WIDTH, CAPTURE_HEIGHT - cropY);
  }
  cropCtx.strokeStyle = "#fff";
  cropCtx.lineWidth = 4;
  cropCtx.beginPath();
  cropCtx.moveTo(0, cropY + 0.5);
  cropCtx.lineTo(CAPTURE_WIDTH, cropY + 0.5);
  cropCtx.stroke();
  updateCropThumb();
}

function setCropY(nextY, showActions = true) {
  cropY = clamp(nextY, CROP_MIN, CAPTURE_HEIGHT);
  renderCropPreview();
  if (showActions && cropActions) cropActions.classList.remove("hidden");
}

async function saveCapture() {
  if (!captureBlob) return;

  const file = new File([captureBlob], "mashup.jpg", { type: "image/jpeg" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "Mashup",
      });
      return;
    } catch (err) {
      // Fall back to download.
    }
  }

  const url = URL.createObjectURL(captureBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mashup.jpg";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function saveCropMask() {
  if (!cropSourceImage) return;
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = CAPTURE_WIDTH;
  maskCanvas.height = CAPTURE_HEIGHT;
  const maskCtx = maskCanvas.getContext("2d");
  maskCtx.clearRect(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
  if (cropShade === "top") {
    const height = CAPTURE_HEIGHT - cropY;
    maskCtx.drawImage(
      cropSourceImage,
      0,
      cropY,
      CAPTURE_WIDTH,
      height,
      0,
      cropY,
      CAPTURE_WIDTH,
      height
    );
  } else {
    maskCtx.drawImage(
      cropSourceImage,
      0,
      0,
      CAPTURE_WIDTH,
      cropY,
      0,
      0,
      CAPTURE_WIDTH,
      cropY
    );
  }
  const dataUrl = maskCanvas.toDataURL("image/png");
  masks.push(dataUrl);
  updateMask(masks.length - 1);
  setCaptureMode("preview");
  setActiveScreen(cameraScreen);
}

async function handleCapture() {
      if (captureMode === "crop") {
        const frame = drawCameraFrame(false);
        if (!frame) return;
        cropSourceImage = new Image();
        cropSourceImage.onload = () => {
          setCropEditing(true);
          cropShade = "bottom";
          setCropY(Math.round(CAPTURE_HEIGHT * 0.6), false);
          renderCropPreview();
          if (cropScreen) setActiveScreen(cropScreen);
        };
        cropSourceImage.src = frame.toDataURL("image/jpeg", 0.92);
        return;
      }

      const frame = drawCameraFrame(true);
      if (!frame) return;
      captureDataUrl = frame.toDataURL("image/jpeg", 0.9);
      captureBlob = await new Promise((resolve) =>
        frame.toBlob(resolve, "image/jpeg", 0.9)
      );
      previewImage.src = captureDataUrl;
      setActiveScreen(previewScreen);
}

if (captureButtons.length) {
  captureButtons.forEach((button) => {
    addTapHandler(button, handleCapture);
  });
}

addTapHandler(saveBtn, () => {
  saveCapture();
});

addTapHandler(reshootBtn, () => {
  setActiveScreen(cameraScreen);
});

if (prevMaskBtn && nextMaskBtn) {
  addTapHandler(prevMaskBtn, () => {
    updateMask(maskIndex - 1);
  });

  addTapHandler(nextMaskBtn, () => {
    updateMask(maskIndex + 1);
  });
}

if (cropBtn) {
  addTapHandler(cropBtn, () => {
    setCaptureMode(captureMode === "crop" ? "preview" : "crop");
    setActiveScreen(cameraScreen);
  });
}

if (flipCameraBtn) {
  addTapHandler(flipCameraBtn, () => {
    cameraFacing = cameraFacing === "user" ? "environment" : "user";
    initCamera();
  });
}

if (cropUpBtn) {
  addTapHandler(cropUpBtn, () => {
    setCropY(cropY - CROP_STEP);
  });
}

if (cropDownBtn) {
  addTapHandler(cropDownBtn, () => {
    setCropY(cropY + CROP_STEP);
  });
}

if (cropCanvas) {
  cropCanvas.addEventListener("pointerdown", (event) => {
    const rect = cropCanvas.getBoundingClientRect();
    const relativeY = ((event.clientY - rect.top) / rect.height) * CAPTURE_HEIGHT;
    cropShade = relativeY < cropY ? "top" : "bottom";
    if (cropActions) cropActions.classList.remove("hidden");
    renderCropPreview();
  });
}

if (cropFrame) {
  cropFrame.addEventListener("click", handleCropActivate);
  cropFrame.addEventListener("touchstart", handleCropActivate, { passive: true });
}

if (cropSaveBtn) {
  addTapHandler(cropSaveBtn, () => {
    saveCropMask();
  });
}

if (cropReshootBtn) {
  addTapHandler(cropReshootBtn, () => {
    setCaptureMode("crop");
    setCropEditing(false);
    setActiveScreen(cameraScreen);
  });
}

addTapHandler(startCameraBtn, (event) => {
  if (event && event.cancelable) event.preventDefault();
  initCamera();
});

permission.addEventListener("click", (event) => {
  if (event.target !== startCameraBtn) {
    initCamera();
  }
});

const isSecure =
  window.location.protocol === "https:" ||
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

if (!isSecure) {
  setPermissionMessage("Camera needs HTTPS. Use https://intertcatchytitlehere.com/mashup.html");
}

updateMask(maskIndex);
setCaptureMode("preview");
setActiveScreen(cameraScreen);
