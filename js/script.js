
(function ($) {
  "use strict";

  const $registrationForm = $("#registrationForm");
  if ($registrationForm.length) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
})(jQuery);
