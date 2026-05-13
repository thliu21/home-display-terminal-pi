import { appViews, rotationViews, screenTitles } from "./constants.js";

export function createNavigationController({ elements, getRotationSettings, onCaltrainActive }) {
  const { caltrainLayout, navButtons, screenTitle, screens } = elements;
  let activeView = "weather";
  let rotateTimer = null;
  let viewTransitionTimer = null;

  function showView(view, { force = false } = {}) {
    const nextView = appViews.includes(view) ? view : "weather";
    const previousView = activeView;
    if (nextView === previousView && !force) return;

    activeView = nextView;
    window.clearTimeout(viewTransitionTimer);
    const previousScreen = screens.find((screen) => screen.dataset.screen === previousView);
    const nextScreen = screens.find((screen) => screen.dataset.screen === nextView);

    screens.forEach((screen) => screen.classList.remove("screen-entering", "screen-exiting", "screen-leaving"));
    previousScreen?.classList.add("screen-leaving");
    nextScreen?.classList.add("screen-entering");

    window.requestAnimationFrame(() => {
      previousScreen?.classList.remove("screen-active", "screen-leaving");
      if (previousScreen !== nextScreen) previousScreen?.classList.add("screen-exiting");
      nextScreen?.classList.remove("screen-entering");
      nextScreen?.classList.add("screen-active");
    });
    viewTransitionTimer = window.setTimeout(() => {
      screens.forEach((screen) => screen.classList.remove("screen-exiting"));
    }, 280);
    navButtons.forEach((button) => {
      button.classList.toggle("nav-button-active", button.dataset.target === activeView);
    });
    screenTitle.textContent = screenTitles.get(activeView) || "Weather";
    if (activeView === "caltrain") {
      caltrainLayout.querySelectorAll(".train-table").forEach((table) => {
        delete table.dataset.centeredTrain;
      });
      onCaltrainActive();
    }
  }

  function showNextView() {
    const visibleViews = activeView === "settings" ? appViews : rotationViews;
    const index = visibleViews.indexOf(activeView);
    showView(visibleViews[(index + 1) % visibleViews.length]);
  }

  function showPreviousView() {
    const visibleViews = activeView === "settings" ? appViews : rotationViews;
    const index = visibleViews.indexOf(activeView);
    showView(visibleViews[(index - 1 + visibleViews.length) % visibleViews.length]);
  }

  function startRotation() {
    window.clearInterval(rotateTimer);
    const rotation = getRotationSettings();
    if (!rotation.enabled || !rotation.seconds) return;
    rotateTimer = setInterval(() => {
      if (rotationViews.includes(activeView)) showNextView();
    }, rotation.seconds * 1000);
  }

  function getActiveView() {
    return activeView;
  }

  return {
    getActiveView,
    showNextView,
    showPreviousView,
    showView,
    startRotation
  };
}

export function getInitialView(config) {
  const requestedView = new URLSearchParams(window.location.search).get("view");
  if (requestedView === "clocks") return "weather";
  if (appViews.includes(requestedView)) return requestedView;
  return appViews.includes(config.defaultView) ? config.defaultView : "weather";
}
