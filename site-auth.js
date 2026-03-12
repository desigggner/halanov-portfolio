(function initSiteAuthPage() {
  var form = document.querySelector("[data-site-auth-form]");
  var message = document.querySelector("[data-site-auth-message]");
  var submitButton = document.querySelector("[data-site-auth-submit]");
  var nextFromQuery = new URLSearchParams(window.location.search).get("next");

  function resolveNextUrl() {
    if (
      nextFromQuery &&
      nextFromQuery.startsWith("/") &&
      !nextFromQuery.startsWith("//") &&
      !nextFromQuery.startsWith("/auth") &&
      !nextFromQuery.startsWith("/api/")
    ) {
      return nextFromQuery;
    }

    return "/";
  }

  function setMessage(text, isError) {
    message.textContent = text || "";
    message.classList.toggle("is-error", Boolean(isError));
  }

  if (!form || !message || !submitButton) {
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    setMessage("");
    submitButton.disabled = true;

    var formData = new FormData(form);

    try {
      var response = await fetch("/api/site-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          login: String(formData.get("login") || "").trim(),
          password: String(formData.get("password") || "").trim(),
        }),
      });
      var payload = await response.json().catch(function () {
        return {};
      });

      if (!response.ok || !payload.ok) {
        setMessage(payload.error || "Не удалось войти.", true);
        submitButton.disabled = false;
        return;
      }

      window.location.assign(resolveNextUrl());
    } catch (error) {
      setMessage("Не удалось выполнить вход. Попробуй ещё раз.", true);
      submitButton.disabled = false;
    }
  });
})();
