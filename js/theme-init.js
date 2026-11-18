
(function () {
  try {
    if (localStorage.getItem("canvasCoTheme") === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.setAttribute("data-bs-theme", "dark");
    }
  } catch (error) {
  }
})();
