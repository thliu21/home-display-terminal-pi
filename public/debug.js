const stateCard = document.querySelector("#debug-state-card");
const stateValue = document.querySelector("#debug-state-value");
const apiStatus = document.querySelector("#debug-api-status");
const localTime = document.querySelector("#debug-local-time");
const pinLabel = document.querySelector("#debug-pin");
const levelLabel = document.querySelector("#debug-level");
const backendLabel = document.querySelector("#debug-backend");
const updatedLabel = document.querySelector("#debug-updated");
const hintLabel = document.querySelector("#debug-hint");
const logList = document.querySelector("#debug-log");
const clearButton = document.querySelector("#debug-clear-log");

let lastPressed = null;

function startDebug() {
  updateClock();
  readButton();
  setInterval(updateClock, 1000);
  setInterval(readButton, 250);
  clearButton.addEventListener("click", () => {
    logList.innerHTML = "";
  });
}

function updateClock() {
  localTime.textContent = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

async function readButton() {
  try {
    const response = await fetch("/api/gpio/button", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    renderState(data);
  } catch (error) {
    renderUnavailable(`API offline: ${error.message}`);
  }
}

function renderState(data) {
  const now = new Date();
  pinLabel.textContent = String(data.pin ?? "17");
  levelLabel.textContent = data.level || "--";
  backendLabel.textContent = data.backend || "Unavailable";
  updatedLabel.textContent = formatTime(now);

  if (!data.available) {
    renderUnavailable(data.error || "GPIO backend unavailable");
    return;
  }

  apiStatus.textContent = "Live";
  stateCard.dataset.pressed = data.pressed ? "true" : "false";
  stateValue.textContent = data.pressed ? "Pressed" : "Released";
  hintLabel.textContent = data.pressed
    ? "Button is closing GPIO17 to GND. This matches the expected wiring."
    : "Released should read HIGH. Press the button; it should switch to LOW and Pressed.";

  if (lastPressed !== data.pressed) {
    addLog(data.pressed ? "Pressed" : "Released", now, data.level);
    lastPressed = data.pressed;
  }
}

function renderUnavailable(message) {
  apiStatus.textContent = "Unavailable";
  stateCard.dataset.pressed = "unknown";
  stateValue.textContent = "Unavailable";
  levelLabel.textContent = "--";
  backendLabel.textContent = "Unavailable";
  updatedLabel.textContent = formatTime(new Date());
  hintLabel.textContent = message;
}

function addLog(label, date, level) {
  const item = document.createElement("li");
  item.innerHTML = `<span>${escapeHtml(label)}</span><time>${escapeHtml(formatTime(date))}</time><small>${escapeHtml(level || "--")}</small>`;
  logList.prepend(item);

  while (logList.children.length > 12) {
    logList.lastElementChild.remove();
  }
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

startDebug();
