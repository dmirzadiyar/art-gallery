
(function ($) {
  "use strict";

  // Shared helpers used by several features below.
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // localStorage can throw (private mode, blocked storage), so every access is wrapped in try/catch.
  function readStorage(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch (error) { console.warn("Could not save to localStorage.", error); }
  }
  function removeStorage(key) {
    try { localStorage.removeItem(key); } catch (error) { console.warn("Could not remove from localStorage.", error); }
  }

  /* =========================================================
     1. LIGHT / DARK THEME TOGGLE
     - The choice is saved in localStorage under "canvasCoTheme".
     - js/theme-init.js applies the saved theme in <head> on every page,
       so it survives a refresh and is the same on all pages.
     - Colors come from CSS variables in css/style.css
       (:root for light, :root[data-theme="dark"] for dark).
     ========================================================= */
  const themeKey = "canvasCoTheme";

  function applyTheme(theme) {
    const isDark = theme === "dark";
    // data-theme switches our own CSS variables; data-bs-theme switches Bootstrap components (modal, alerts...).
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-bs-theme", isDark ? "dark" : "light");
    const label = isDark ? "Switch to light theme" : "Switch to dark theme";
    $("#themeToggle").attr({ "aria-label": label, title: label });
  }

  $("#themeToggle").on("click", function () {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    writeStorage(themeKey, next);
  });

  applyTheme(readStorage(themeKey) === "dark" ? "dark" : "light");

  /* =========================================================
     2. SIGN-IN STATE (shared by every page)
     - Only non-sensitive data is saved: { name, email, signedInAt }.
       The password is validated but NEVER stored.
     - The header shows "Sign in" or "Hi, <name>" + "Sign out" on every page.
     ========================================================= */
  const userKey = "canvasCoUser";

  function getUser() {
    try {
      const user = JSON.parse(readStorage(userKey));
      return user && user.name && user.email ? user : null;
    } catch (error) {
      return null; // saved value is not valid JSON
    }
  }
  function firstName(fullName) {
    return String(fullName).trim().split(/\s+/)[0];
  }

  // Fills the contact form with the signed-in user's name and email (only empty fields).
  function prefillContactForm(user) {
    if (!user) return;
    if (!$("#fullName").val()) $("#fullName").val(user.name);
    if (!$("#email").val()) $("#email").val(user.email);
  }

  function renderAccount() {
    const user = getUser();
    const onSignInPage = $("#signInForm").length > 0;
    const $area = $("#accountArea").empty();

    // Build elements with .text() instead of HTML strings, so a name like "<script>" is shown as plain text.
    if (user) {
      $area.append(
        $("<span>", { class: "account-greeting", text: "Hi, " + firstName(user.name) }),
        $("<button>", { type: "button", class: "account-signout sign-out-button", text: "Sign out" })
      );
    } else {
      $area.append($("<a>", { class: "account-link" + (onSignInPage ? " active" : ""), href: "signin.html", text: "Sign in" }));
    }

    // Sign-in page: show the form OR the profile card.
    if (onSignInPage) {
      $("#signInPanel").prop("hidden", Boolean(user));
      $("#profilePanel").prop("hidden", !user);
      if (user) {
        $("#profileName").text(firstName(user.name));
        $("#profileFullName").text(user.name);
        $("#profileEmail").text(user.email);
        const since = new Date(user.signedInAt);
        $("#profileSince").text(isNaN(since) ? "—" : since.toLocaleString());
      }
    }

    prefillContactForm(user);
  }

  function signOut() {
    removeStorage(userKey);
    renderAccount();
    if ($("#signInForm").length) {
      $("#signInAlert").removeClass("alert-success").addClass("alert-info").text("You have signed out.").prop("hidden", false);
    }
  }

  // Delegated handler: works for the header button and the profile-card button, even after re-rendering.
  $(document).on("click", ".sign-out-button", signOut);

  // If the user signs in or out in another tab, update this tab too.
  $(window).on("storage", function (event) {
    if (event.originalEvent.key === userKey) renderAccount();
  });

  renderAccount();

  const $registrationForm = $("#registrationForm");
  if ($registrationForm.length) {
    function setFeedback(input, feedback, valid, message) {
      const $input = $(input);
      $input.toggleClass("is-valid", valid).toggleClass("is-invalid", !valid);
      $(feedback).text(message).toggleClass("feedback-success", valid).toggleClass("feedback-error", !valid);
    }

    function passwordStrength(password) {
      if (!password) return { label: "Password strength: not entered", level: 0 };
      let score = 0;
      if (password.length >= 8) score++;
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
      if (/\d/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;
      if (score <= 1) return { label: "Weak password", level: 1 };
      if (score <= 2) return { label: "Medium password", level: 2 };
      return { label: "Strong password", level: 3 };
    }

    function validateName() {
      const value = $("#fullName").val().trim();
      const valid = value.length >= 2;
      setFeedback("#fullName", "#nameFeedback", valid, valid ? "✓ Name looks good." : "Please enter at least 2 characters.");
      return valid;
    }
    function validateEmail() {
      const value = $("#email").val().trim();
      const valid = emailPattern.test(value);
      setFeedback("#email", "#emailFeedback", valid, valid ? "✓ Valid email address." : "Enter a valid email address.");
      return valid;
    }
    function validatePassword() {
      const value = $("#password").val();
      const strength = passwordStrength(value);
      $("#passwordStrength").text(strength.label).attr("data-strength", strength.level);
      $("#passwordMeterBar").css("width", (strength.level * 33.333) + "%").attr("data-strength", strength.level);
      const valid = value.length >= 8;
      $("#password").toggleClass("is-valid", valid && strength.level >= 2).toggleClass("is-invalid", value.length > 0 && !(valid && strength.level >= 2));
      $("#passwordRuleFeedback").text(!value ? "Use at least 8 characters, including different character types." :
        (value.length < 8 ? "Password must contain at least 8 characters." :
        (strength.level < 2 ? "Increase password strength to at least Medium." : "✓ Password meets the minimum strength.")))
        .toggleClass("feedback-success", valid && strength.level >= 2)
        .toggleClass("feedback-error", value.length > 0 && !(valid && strength.level >= 2));
      validatePasswordMatch();
      return valid && strength.level >= 2;
    }
    function validatePasswordMatch() {
      const password = $("#password").val();
      const confirm = $("#confirmPassword").val();
      if (!confirm) {
        $("#confirmPassword").removeClass("is-valid is-invalid");
        $("#passwordFeedback").text("");
        return false;
      }
      const valid = password.length >= 8 && password === confirm;
      setFeedback("#confirmPassword", "#passwordFeedback", valid, valid ? "✓ Passwords match." : "Passwords do not match.");
      return valid;
    }
    function validateMessage() {
      const value = $("#message").val().trim();
      const valid = value.length >= 5;
      setFeedback("#message", "#messageFeedback", valid, valid ? "✓ Message added." : "Message must contain at least 5 characters.");
      return valid;
    }

    $("#fullName").on("input blur", validateName);
    $("#email").on("input blur", validateEmail);
    $("#password").on("input", validatePassword);
    $("#confirmPassword").on("input", validatePasswordMatch);
    $("#message").on("input blur", validateMessage);

    $registrationForm.on("submit", function (event) {
      event.preventDefault();
      const valid = validateName() & validateEmail() & validatePassword() & validatePasswordMatch() & validateMessage() & $("#consent").is(":checked");
      if (!valid) {
        $("#formAlert").removeClass("alert-success").addClass("alert-danger").text("Please correct the highlighted fields and accept the contact consent before submitting.").prop("hidden", false);
        const $firstInvalid = $registrationForm.find(".is-invalid").first();
        if ($firstInvalid.length) $firstInvalid.trigger("focus");
        return;
      }
      $("#formAlert").removeClass("alert-danger").addClass("alert-success").text("Validation successful! Your demo registration form is complete. No data was transmitted.").prop("hidden", false);
      this.reset();
      $registrationForm.find(".is-valid, .is-invalid").removeClass("is-valid is-invalid");
      $("#passwordStrength").text("Password strength: not entered").attr("data-strength", 0);
      $("#passwordMeterBar").css("width", "0%");
      $("#passwordRuleFeedback").text("Use at least 8 characters, including different character types.").removeClass("feedback-success feedback-error");
      $(".field-feedback").text("").removeClass("feedback-success feedback-error");
      prefillContactForm(getUser());
    });
  }

  const $galleryItems = $(".gallery-item");
  if ($galleryItems.length) {
    let activeCategory = "all";
    function filterGallery() {
      const query = ($("#artworkSearch").val() || "").toLowerCase().trim();
      let visible = 0;
      $galleryItems.each(function () {
        const $item = $(this);
        const category = String($item.data("category")).toLowerCase();
        const text = $item.text().toLowerCase() + " " + ($item.find("img").attr("alt") || "").toLowerCase();
        const matchesCategory = activeCategory === "all" || category === activeCategory;
        const matchesSearch = text.includes(query);
        const show = matchesCategory && matchesSearch;
        $item.toggle(show);
        if (show) visible++;
      });
      $("#galleryCount").text(String(visible).padStart(2, "0"));
      $("#galleryEmpty").prop("hidden", visible !== 0);
    }
    $("#artworkSearch").on("input keyup", filterGallery);
    $(".filter-buttons").on("click", "button[data-filter]", function () {
      activeCategory = String($(this).data("filter")).toLowerCase();
      $(".filter-buttons button").removeClass("active btn-dark").addClass("btn-outline-dark");
      $(this).addClass("active btn-dark").removeClass("btn-outline-dark");
      filterGallery();
    });
  }

  const $tableBody = $("#artworkTableBody");
  if ($tableBody.length) {
    const storageKey = "canvasCoArtworkRecords";
    const initialRecords = [
      { id: 1, title: "Electric Garden", artist: "A. Rivera", category: "Abstract", year: 2024 },
      { id: 2, title: "Quiet Presence", artist: "M. Chen", category: "Portrait", year: 2023 },
      { id: 3, title: "Open Forms", artist: "J. Okafor", category: "Mixed media", year: 2025 },
      { id: 4, title: "After the Rain", artist: "S. Patel", category: "Abstract", year: 2022 },
      { id: 5, title: "Color in Motion", artist: "L. Morgan", category: "Contemporary", year: 2025 },
      { id: 6, title: "Old Soul", artist: "N. Williams", category: "Classical", year: 2021 }
    ];
    let records;
    try {
      const saved = localStorage.getItem(storageKey);
      records = saved ? JSON.parse(saved) : initialRecords;
      if (!Array.isArray(records)) records = initialRecords;
    } catch (error) {
      records = initialRecords;
    }
    const modalElement = document.getElementById("artworkModal");
    const artworkModal = window.bootstrap ? new bootstrap.Modal(modalElement) : null;

    function saveRecords() {
      try { localStorage.setItem(storageKey, JSON.stringify(records)); }
      catch (error) { console.warn("Could not save artwork records in this browser.", error); }
    }
    function escapeHTML(value) {
      return String(value).replace(/[&<>"']/g, function (character) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character];
      });
    }
    function renderRecords() {
      $tableBody.empty();
      records.forEach(function (record) {
        $tableBody.append(
          `<tr>
            <td>${escapeHTML(record.title)}</td>
            <td>${escapeHTML(record.artist)}</td>
            <td><span class="category-chip">${escapeHTML(record.category)}</span></td>
            <td>${escapeHTML(record.year)}</td>
            <td class="crud-actions">
              <button type="button" class="btn btn-sm btn-outline-dark edit-record" data-id="${record.id}">Edit</button>
              <button type="button" class="btn btn-sm btn-outline-danger delete-record" data-id="${record.id}">Delete</button>
            </td>
          </tr>`
        );
      });
      $("#recordCount").text(records.length + (records.length === 1 ? " record" : " records"));
    }
    function openForm(record) {
      $("#artworkForm")[0].reset();
      $("#artworkId").val(record ? record.id : "");
      $("#artworkTitle").val(record ? record.title : "");
      $("#artworkArtist").val(record ? record.artist : "");
      $("#artworkCategory").val(record ? record.category : "Abstract");
      $("#artworkYear").val(record ? record.year : 2026);
      $("#artworkModalTitle").text(record ? "Edit artwork" : "Add artwork");
      if (artworkModal) artworkModal.show();
    }

    $("#addArtworkBtn").on("click", function () { openForm(null); });
    $tableBody.on("click", ".edit-record", function () {
      const record = records.find(item => item.id === Number($(this).data("id")));
      if (record) openForm(record);
    });
    $tableBody.on("click", ".delete-record", function () {
      const id = Number($(this).data("id"));
      const record = records.find(item => item.id === id);
      if (record && window.confirm(`Delete "${record.title}" from the collection?`)) {
        records = records.filter(item => item.id !== id);
        saveRecords();
        renderRecords();
      }
    });
    $("#artworkForm").on("submit", function (event) {
      event.preventDefault();
      if (!this.checkValidity()) { this.reportValidity(); return; }
      const id = Number($("#artworkId").val());
      const updated = {
        id: id || Date.now(),
        title: $("#artworkTitle").val().trim(),
        artist: $("#artworkArtist").val().trim(),
        category: $("#artworkCategory").val(),
        year: Number($("#artworkYear").val())
      };
      if (id) records = records.map(record => record.id === id ? updated : record);
      else records.push(updated);
      saveRecords();
      renderRecords();
      if (artworkModal) artworkModal.hide();
    });
    renderRecords();
  }

  const $lightbox = $("#artLightbox");
  if ($lightbox.length) {
    let currentIndex = 0;
    function visibleImages() {
      return $(".gallery-item:visible .lightbox-image:visible").toArray();
    }
    function showLightboxImage(index) {
      const images = visibleImages();
      if (!images.length) return;
      currentIndex = (index + images.length) % images.length;
      const image = images[currentIndex];
      const $image = $(image);
      $("#lightboxImage").attr("src", $image.attr("src")).attr("alt", $image.attr("alt") || "");
      const caption = $image.closest(".gallery-item").find(".gallery-caption h3").text();
      $("#lightboxCaption").text(caption);
      $("#lightboxImage").stop(true, true).css({ opacity: 0, transform: "scale(.97)" }).animate({ opacity: 1 }, 220);
      $("#lightboxImage").css("transform", "scale(1)");
    }
    function openLightbox(image) {
      const images = visibleImages();
      const index = images.indexOf(image);
      showLightboxImage(index < 0 ? 0 : index);
      $lightbox.attr("aria-hidden", "false").css("display", "flex").hide().stop(true, true).fadeIn(220);
      $("body").addClass("lightbox-open");
    }
    function closeLightbox() {
      $lightbox.stop(true, true).fadeOut(200, function () {
        $lightbox.attr("aria-hidden", "true");
        $("#lightboxImage").attr("src", "");
      });
      $("body").removeClass("lightbox-open");
    }
    $galleryItems.on("click", ".lightbox-image", function () { openLightbox(this); });
    $galleryItems.on("keydown", ".lightbox-image", function (event) {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openLightbox(this); }
    });
    $(".lightbox-close").on("click", closeLightbox);
    $(".lightbox-prev").on("click", function () { showLightboxImage(currentIndex - 1); });
    $(".lightbox-next").on("click", function () { showLightboxImage(currentIndex + 1); });
    $lightbox.on("click", function (event) { if (event.target === this) closeLightbox(); });
    $(document).on("keydown", function (event) {
      if ($lightbox.is(":visible")) {
        if (event.key === "Escape") closeLightbox();
        if (event.key === "ArrowLeft") showLightboxImage(currentIndex - 1);
        if (event.key === "ArrowRight") showLightboxImage(currentIndex + 1);
      }
    });
  }
  /* =========================================================
     3. SIGN-IN FORM (signin.html)
     ========================================================= */
  const $signInForm = $("#signInForm");
  if ($signInForm.length) {
    // Marks a field as valid/invalid and writes a message under it.
    function showFieldResult(input, feedback, valid, message) {
      $(input).toggleClass("is-valid", valid).toggleClass("is-invalid", !valid);
      $(feedback).text(message).toggleClass("feedback-success", valid).toggleClass("feedback-error", !valid);
    }
    function checkSignInName() {
      const valid = $("#signInName").val().trim().length >= 2;
      showFieldResult("#signInName", "#signInNameFeedback", valid, valid ? "✓ Looks good." : "Please enter your name (at least 2 characters).");
      return valid;
    }
    function checkSignInEmail() {
      const valid = emailPattern.test($("#signInEmail").val().trim());
      showFieldResult("#signInEmail", "#signInEmailFeedback", valid, valid ? "✓ Valid email address." : "Enter a valid email address, e.g. name@example.com.");
      return valid;
    }
    function checkSignInPassword() {
      const valid = $("#signInPassword").val().length >= 8;
      showFieldResult("#signInPassword", "#signInPasswordFeedback", valid, valid ? "✓ Password accepted." : "Password must contain at least 8 characters.");
      return valid;
    }

    // Check a field when the user leaves it; after that, re-check while they fix it.
    [["#signInName", checkSignInName], ["#signInEmail", checkSignInEmail], ["#signInPassword", checkSignInPassword]].forEach(function (pair) {
      const selector = pair[0];
      const check = pair[1];
      $(selector).on("blur", check).on("input", function () {
        if ($(this).hasClass("is-invalid") || $(this).hasClass("is-valid")) check();
      });
    });

    $signInForm.on("submit", function (event) {
      event.preventDefault();
      // Run all three checks (not stopping at the first error) so every field gets feedback.
      const results = [checkSignInName(), checkSignInEmail(), checkSignInPassword()];
      const $alert = $("#signInAlert").removeClass("alert-success alert-info alert-danger");

      if (results.includes(false)) {
        $alert.addClass("alert-danger").text("Please fix the highlighted fields.").prop("hidden", false);
        $signInForm.find(".is-invalid").first().trigger("focus");
        return;
      }

      // Save only non-sensitive information. The password is never stored.
      const user = {
        name: $("#signInName").val().trim(),
        email: $("#signInEmail").val().trim().toLowerCase(),
        signedInAt: new Date().toISOString()
      };
      writeStorage(userKey, JSON.stringify(user));

      if (!getUser()) {
        $alert.addClass("alert-danger").text("Your browser blocked saving the sign-in (localStorage is disabled).").prop("hidden", false);
        return;
      }

      this.reset();
      $signInForm.find(".is-valid, .is-invalid").removeClass("is-valid is-invalid");
      $signInForm.find(".field-feedback").text("").removeClass("feedback-success feedback-error");
      $alert.prop("hidden", true);
      renderAccount();
      $("#profilePanel").hide().fadeIn(300);
    });
  }

  /* =========================================================
     4. FAQ ACCORDION (about.html) — jQuery .slideToggle()
     ========================================================= */
  $(".faq-question").on("click", function () {
    const $question = $(this);
    const isOpen = $question.attr("aria-expanded") === "true";

    // Update the state for screen readers, the + / − indicator and the styling.
    $question.attr("aria-expanded", String(!isOpen));
    $question.find(".faq-icon").text(isOpen ? "+" : "−");
    $question.closest(".faq-item").toggleClass("is-open", !isOpen);

    // .stop(true, true) finishes any running animation first, so fast double-clicks stay in sync.
    $("#" + $question.attr("aria-controls")).stop(true, true).slideToggle(300);
  });

  /* =========================================================
     5. MUSEUM API (gallery.html)
     Live artworks from the Cleveland Museum of Art Open Access API:
     https://openaccess-api.clevelandart.org/ (free, no API key needed).
     User interaction: search box, topic buttons, artwork-type filter, "Load more".
     ========================================================= */
  const $museumResults = $("#museumResults");
  if ($museumResults.length) {
    const apiUrl = "https://openaccess-api.clevelandart.org/api/artworks/";
    const apiFields = "id,accession_number,title,creation_date,creators,type,technique,images,url";
    const perPage = 12;
    const requestTimeout = 12000; // ms

    let currentQuery = "impressionism";
    let currentPage = 1;
    let activeRequest = null; // AbortController of the request that is loading right now

    // Builds the request URL, e.g. ...artworks/?q=monet&has_image=1&limit=12&skip=0&fields=...
    function buildUrl() {
      const params = new URLSearchParams({
        q: currentQuery,
        has_image: 1,                        // only artworks that have a picture
        limit: perPage,
        skip: (currentPage - 1) * perPage,   // pagination: skip the results already shown
        fields: apiFields
      });
      const type = $("#museumType").val();
      if (type) params.append("type", type); // e.g. "Painting", "Print", "Sculpture"
      return apiUrl + "?" + params.toString();
    }

    function setStatus(message, isError) {
      $("#museumStatus").toggleClass("is-error", Boolean(isError)).text(message);
    }

    function showSkeletons(count) {
      for (let i = 0; i < count; i++) {
        $museumResults.append(
          '<div class="museum-card museum-skeleton" aria-hidden="true"><div class="museum-image"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>'
        );
      }
    }

    // Creates one artwork card. API text is inserted with .text()/.attr(), never as raw HTML.
    function createCard(artwork) {
      // creators[0].description looks like "Claude Monet (French, 1840–1926)": keep only the name.
      const creator = artwork.creators && artwork.creators[0] ? artwork.creators[0].description : "";
      const artist = creator ? creator.split(" (")[0] : "";

      const $frame = $("<div>", { class: "museum-image" });
      const $image = $("<img>", {
        src: artwork.images.web.url,
        alt: (artwork.title || "Untitled artwork") + (artist ? " by " + artist : ""),
        loading: "lazy"
      });
      // If an image fails to load, show a placeholder instead of a broken-image icon.
      $image.on("error", function () {
        $(this).remove();
        $frame.addClass("is-missing");
      });
      $frame.append($image);

      const details = [artist || "Unknown artist", artwork.creation_date].filter(Boolean).join(" · ");
      const $card = $("<article>", { class: "museum-card" }).append(
        $frame,
        $("<h3>", { text: artwork.title || "Untitled" }),
        $("<p>", { class: "museum-meta", text: details })
      );
      const kind = [artwork.type, artwork.technique].filter(Boolean).join(" — ");
      if (kind) $card.append($("<p>", { class: "museum-meta", text: kind }));
      $card.append($("<a>", {
        class: "text-link", href: artwork.url || "https://www.clevelandart.org/art/" + artwork.accession_number,
        target: "_blank", rel: "noopener noreferrer", text: "View at the museum ↗"
      }));
      return $card;
    }

    function showError(message, append) {
      const $retry = $("<button>", { type: "button", class: "btn btn-sm btn-outline-dark rounded-pill", text: "Try again" })
        .on("click", function () {
          if (append) currentPage++;
          loadArtworks(append);
        });
      setStatus(message, true);
      $("#museumStatus").append(" ", $retry);
    }

    // Fetches one page of results. append = true for "Load more", false for a new search.
    async function loadArtworks(append) {
      if (activeRequest) activeRequest.abort(); // a newer search replaces an older one still loading
      const controller = new AbortController();
      activeRequest = controller;
      let timedOut = false;
      const timer = setTimeout(function () { timedOut = true; controller.abort(); }, requestTimeout);

      if (!append) $museumResults.empty();
      showSkeletons(append ? 4 : 8);
      $museumResults.attr("aria-busy", "true");
      $("#museumLoadMore").prop("disabled", true);
      setStatus("Loading artworks…");

      try {
        const response = await fetch(buildUrl(), { signal: controller.signal });
        if (!response.ok) {
          throw new Error("The museum server responded with an error (status " + response.status + ").");
        }
        const json = await response.json(); // JSON: { info: { total: 47, ... }, data: [ {artwork}, ... ] }

        // Keep only records that really have a web image.
        const artworks = Array.isArray(json.data)
          ? json.data.filter(function (item) { return item.images && item.images.web && item.images.web.url; })
          : [];
        const total = json.info && json.info.total ? json.info.total : 0;

        $museumResults.find(".museum-skeleton").remove();

        if (!append && artworks.length === 0) {
          const typeText = $("#museumType").val() ? " (" + $("#museumType option:selected").text().toLowerCase() + ")" : "";
          setStatus("No artworks found for “" + currentQuery + "”" + typeText + ". Try another artist, style or subject.");
          $("#museumLoadMore").prop("hidden", true);
          return;
        }

        artworks.forEach(function (artwork) {
          $museumResults.append(createCard(artwork));
        });

        const shown = $museumResults.children(".museum-card").length;
        setStatus("Showing " + shown + " of " + total.toLocaleString() + " artworks for “" + currentQuery + "”.");
        $("#museumLoadMore").prop("hidden", currentPage * perPage >= total);
      } catch (error) {
        // Aborted because the user started a newer search: nothing to show.
        if (error.name === "AbortError" && !timedOut) return;

        $museumResults.find(".museum-skeleton").remove();
        if (append) currentPage--; // so "Try again" reloads the same page

        let message;
        if (timedOut) message = "The museum API took too long to respond.";
        else if (error instanceof TypeError) message = "Could not reach the museum API. Check your internet connection.";
        else message = error.message || "Something went wrong while loading artworks.";
        showError(message, append);
      } finally {
        clearTimeout(timer);
        if (activeRequest === controller) {
          activeRequest = null;
          $museumResults.attr("aria-busy", "false");
          $("#museumLoadMore").prop("disabled", false);
        }
      }
    }

    function selectTopic($button) {
      $(".museum-topics .btn").removeClass("active btn-dark").addClass("btn-outline-dark").attr("aria-pressed", "false");
      if ($button) $button.addClass("active btn-dark").removeClass("btn-outline-dark").attr("aria-pressed", "true");
    }

    // Search box
    $("#museumSearchForm").on("submit", function (event) {
      event.preventDefault();
      const query = $("#museumQuery").val().trim();
      if (!query) {
        setStatus("Type an artist, style or subject to search.", true);
        $("#museumQuery").trigger("focus");
        return;
      }
      currentQuery = query;
      currentPage = 1;
      selectTopic(null);
      loadArtworks(false);
    });

    // Topic buttons
    $(".museum-topics").on("click", "button[data-query]", function () {
      currentQuery = String($(this).data("query"));
      currentPage = 1;
      $("#museumQuery").val(currentQuery);
      selectTopic($(this));
      loadArtworks(false);
    });

    // Artwork-type filter: reload the current search with the chosen type
    $("#museumType").on("change", function () {
      currentPage = 1;
      loadArtworks(false);
    });

    // Pagination
    $("#museumLoadMore").on("click", function () {
      currentPage++;
      loadArtworks(true);
    });

    selectTopic($(".museum-topics button[data-query='" + currentQuery + "']"));
    loadArtworks(false);
  }
})(jQuery);
