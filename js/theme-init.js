// Runs in <head>, before the page is drawn, so a saved dark theme
// is applied immediately (no flash of the light theme on refresh).
// The toggle button itself is handled in js/script.js.
(function () {
  try {
    if (localStorage.getItem("canvasCoTheme") === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.setAttribute("data-bs-theme", "dark");
    }
  } catch (error) {
    // localStorage is blocked (e.g. strict privacy mode): keep the light theme.
  }
})();
