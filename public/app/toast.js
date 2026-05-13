export function createToastController({ appToast }) {
  let toastTimer = null;

  function showToast(message) {
    if (!appToast) return;
    window.clearTimeout(toastTimer);
    appToast.textContent = message;
    appToast.hidden = false;
    toastTimer = window.setTimeout(() => {
      appToast.hidden = true;
    }, 1800);
  }

  return { showToast };
}
