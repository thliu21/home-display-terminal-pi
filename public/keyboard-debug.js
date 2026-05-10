const watchedKeys = ["A", "B", "C", "D", "E", "F"];
const pressedKeys = new Set();
const keyEventCounts = new Map(watchedKeys.map((key) => [key, 0]));

const focusStatus = document.querySelector("#keyboard-focus-status");
const localTime = document.querySelector("#keyboard-local-time");
const activeKeysLabel = document.querySelector("#keyboard-active-keys");
const activeCountLabel = document.querySelector("#keyboard-active-count");
const lastEventLabel = document.querySelector("#keyboard-last-event");
const updatedLabel = document.querySelector("#keyboard-updated");
const hintLabel = document.querySelector("#keyboard-hint");
const logList = document.querySelector("#keyboard-log");
const clearButton = document.querySelector("#keyboard-clear-log");
const keyButtons = [...document.querySelectorAll("[data-key]")];
const countCards = [...document.querySelectorAll("[data-count-key]")];

function startKeyboardDebug() {
  updateClock();
  renderState("Ready");
  setInterval(updateClock, 1000);

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", clearPressedKeys);
  window.addEventListener("focus", () => {
    focusStatus.textContent = "Ready";
  });

  clearButton.addEventListener("click", () => {
    logList.innerHTML = "";
    watchedKeys.forEach((key) => keyEventCounts.set(key, 0));
    renderState("Cleared");
  });
}

function handleKeyDown(event) {
  const key = normalizeKey(event);
  if (!watchedKeys.includes(key)) return;

  event.preventDefault();
  const wasPressed = pressedKeys.has(key);
  pressedKeys.add(key);

  if (!event.repeat || !wasPressed) {
    keyEventCounts.set(key, keyEventCounts.get(key) + 1);
    addLog("Down", key, event.repeat);
  }

  renderState(event.repeat ? `Repeat ${key}` : `Down ${key}`);
}

function handleKeyUp(event) {
  const key = normalizeKey(event);
  if (!watchedKeys.includes(key)) return;

  event.preventDefault();
  pressedKeys.delete(key);
  keyEventCounts.set(key, keyEventCounts.get(key) + 1);
  addLog("Up", key, false);
  renderState(`Up ${key}`);
}

function normalizeKey(event) {
  if (event.code && /^Key[A-F]$/.test(event.code)) return event.code.slice(3);
  return String(event.key || "").toUpperCase();
}

function clearPressedKeys() {
  if (!pressedKeys.size) return;
  pressedKeys.clear();
  focusStatus.textContent = "Focus lost";
  renderState("Released all");
}

function renderState(lastEvent) {
  const sortedKeys = [...pressedKeys].sort();
  const now = new Date();

  activeKeysLabel.textContent = sortedKeys.length ? sortedKeys.join(" + ") : "None";
  activeCountLabel.textContent = String(sortedKeys.length);
  lastEventLabel.textContent = lastEvent;
  updatedLabel.textContent = formatTime(now);
  focusStatus.textContent = document.hasFocus() ? "Listening" : "Click page";
  hintLabel.textContent = sortedKeys.length
    ? `Currently held: ${sortedKeys.join(" + ")}`
    : "No panel key is held. Press one or more buttons to test combined input.";

  keyButtons.forEach((button) => {
    const key = button.dataset.key;
    button.classList.toggle("keyboard-key-active", pressedKeys.has(key));
  });

  countCards.forEach((card) => {
    const key = card.dataset.countKey;
    card.querySelector("strong").textContent = String(keyEventCounts.get(key));
  });
}

function addLog(action, key, repeat) {
  const item = document.createElement("li");
  item.innerHTML = `<span>${escapeHtml(action)} ${escapeHtml(key)}</span><time>${escapeHtml(formatTime(new Date()))}</time><small>${repeat ? "repeat" : activeChordLabel()}</small>`;
  logList.prepend(item);

  while (logList.children.length > 18) {
    logList.lastElementChild.remove();
  }
}

function activeChordLabel() {
  const keys = [...pressedKeys].sort();
  return keys.length ? keys.join("+") : "--";
}

function updateClock() {
  localTime.textContent = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
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

startKeyboardDebug();
