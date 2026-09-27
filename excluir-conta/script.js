(() => {
  "use strict";

  const CONFIRMATION_WORD = "EXCLUIR";
  const config = window.RAIZ_ACCOUNT_DELETION_CONFIG ?? {};
  const form = document.querySelector("#account-form");
  const emailInput = document.querySelector("#email");
  const passwordInput = document.querySelector("#password");
  const togglePassword = document.querySelector("#toggle-password");
  const continueButton = document.querySelector("#continue-button");
  const formMessage = document.querySelector("#form-message");
  const dialog = document.querySelector("#confirmation-dialog");
  const confirmationInput = document.querySelector("#confirmation-text");
  const confirmButton = document.querySelector("#confirm-delete");
  const cancelButton = document.querySelector("#cancel-delete");
  const closeButton = document.querySelector("#close-dialog");
  const dialogMessage = document.querySelector("#dialog-message");
  const authenticatedEmail = document.querySelector("#authenticated-email");
  const formView = document.querySelector("#form-view");
  const successView = document.querySelector("#success-view");

  let client = null;
  let authenticatedSession = null;
  let isDeleting = false;

  const setMessage = (element, message = "") => {
    element.textContent = message;
  };

  const setFormBusy = (busy) => {
    emailInput.disabled = busy;
    passwordInput.disabled = busy;
    togglePassword.disabled = busy;
    continueButton.disabled = busy;
    continueButton.querySelector("span:first-child").textContent = busy ? "Confirmando..." : "Continuar";
  };

  const setDeleteBusy = (busy) => {
    isDeleting = busy;
    confirmationInput.disabled = busy;
    cancelButton.disabled = busy;
    closeButton.disabled = busy;
    confirmButton.disabled = busy || confirmationInput.value !== CONFIRMATION_WORD;
    confirmButton.textContent = busy ? "Excluindo..." : "Excluir conta";
  };

  const isConfigured = () => {
    return Boolean(
      window.supabase?.createClient &&
      typeof config.supabaseUrl === "string" &&
      /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl) &&
      typeof config.supabasePublishableKey === "string" &&
      config.supabasePublishableKey.length > 20 &&
      !config.supabasePublishableKey.includes("COLE_AQUI"),
    );
  };

  const getClient = () => {
    if (!client) {
      client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
    }
    return client;
  };

  const clearAuthenticatedState = async () => {
    authenticatedSession = null;
    confirmationInput.value = "";
    authenticatedEmail.textContent = "";
    setMessage(dialogMessage);
    confirmButton.disabled = true;

    if (client) {
      try {
        await client.auth.signOut({ scope: "local" });
      } catch {
        // A sessão não é persistida; a limpeza em memória abaixo é suficiente para esta página.
      }
    }
  };

  const errorMessageForSignIn = (error) => {
    const status = Number(error?.status ?? 0);
    if (status === 400 || status === 401) return "E-mail ou senha não conferem. Revise e tente novamente.";
    if (status === 429) return "Muitas tentativas seguidas. Aguarde um pouco e tente novamente.";
    return "Não foi possível confirmar sua identidade agora. Tente novamente.";
  };

  const errorMessageForDeletion = (status, code) => {
    if (status === 401 || code === "UNAUTHENTICATED") return "Sua confirmação expirou. Feche esta janela e entre novamente.";
    if (status === 403 || code === "ADMIN_ACCOUNT_PROTECTED") return "Esta conta não pode ser excluída por esta página.";
    return "Não foi possível excluir sua conta agora. Tente novamente.";
  };

  togglePassword.addEventListener("click", () => {
    const willShow = passwordInput.type === "password";
    passwordInput.type = willShow ? "text" : "password";
    togglePassword.textContent = willShow ? "Ocultar" : "Mostrar";
    togglePassword.setAttribute("aria-label", willShow ? "Ocultar senha" : "Mostrar senha");
    togglePassword.setAttribute("aria-pressed", String(willShow));
    passwordInput.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(formMessage);

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email || !password) {
      setMessage(formMessage, "Informe seu e-mail e sua senha para continuar.");
      return;
    }

    if (!isConfigured()) {
      setMessage(formMessage, "Esta página ainda não está disponível. Tente novamente mais tarde.");
      return;
    }

    setFormBusy(true);
    try {
      const { data, error } = await getClient().auth.signInWithPassword({ email, password });
      if (error || !data.session || !data.user) throw error ?? new Error("AUTHENTICATION_FAILED");

      authenticatedSession = data.session;
      passwordInput.value = "";
      passwordInput.type = "password";
      togglePassword.textContent = "Mostrar";
      togglePassword.setAttribute("aria-pressed", "false");
      authenticatedEmail.textContent = data.user.email ?? email;
      confirmationInput.value = "";
      confirmButton.disabled = true;
      dialog.showModal();
      requestAnimationFrame(() => confirmationInput.focus());
    } catch (error) {
      passwordInput.value = "";
      setMessage(formMessage, errorMessageForSignIn(error));
      passwordInput.focus();
    } finally {
      setFormBusy(false);
    }
  });

  confirmationInput.addEventListener("input", () => {
    setMessage(dialogMessage);
    confirmButton.disabled = isDeleting || confirmationInput.value !== CONFIRMATION_WORD;
  });

  const cancelConfirmation = async () => {
    if (isDeleting) return;
    await clearAuthenticatedState();
  };

  cancelButton.addEventListener("click", cancelConfirmation);
  closeButton.addEventListener("click", cancelConfirmation);
  dialog.addEventListener("cancel", (event) => {
    if (isDeleting) {
      event.preventDefault();
      return;
    }
    void clearAuthenticatedState();
  });

  confirmButton.addEventListener("click", async () => {
    if (isDeleting || confirmationInput.value !== CONFIRMATION_WORD || !authenticatedSession?.access_token) return;

    setMessage(dialogMessage);
    setDeleteBusy(true);

    try {
      const functionName = typeof config.functionName === "string" ? config.functionName : "delete-account";
      const response = await fetch(`${config.supabaseUrl}/functions/v1/${encodeURIComponent(functionName)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authenticatedSession.access_token}`,
          apikey: config.supabasePublishableKey,
          "Content-Type": "application/json",
        },
        body: "{}",
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok || payload.success !== true) {
        throw Object.assign(new Error("ACCOUNT_DELETION_FAILED"), {
          status: response.status,
          code: typeof payload.code === "string" ? payload.code : "",
        });
      }

      authenticatedSession = null;
      dialog.close();
      emailInput.value = "";
      passwordInput.value = "";
      formView.hidden = true;
      successView.hidden = false;
      successView.querySelector("h2").focus?.();
    } catch (error) {
      setMessage(dialogMessage, errorMessageForDeletion(Number(error?.status ?? 0), error?.code));
      setDeleteBusy(false);
    }
  });
})();
