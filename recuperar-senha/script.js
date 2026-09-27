(() => {
  "use strict";

  const SUPABASE_URL = "https://umcscokdtviwklxcrwkx.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_PeG0S6IGYgnzwb5oE_wDYg_Dc7uAauN";

  const views = {
    request: document.querySelector("#request-view"),
    sent: document.querySelector("#email-sent-view"),
    update: document.querySelector("#update-view"),
    success: document.querySelector("#success-view"),
    invalid: document.querySelector("#invalid-link-view"),
  };
  const requestForm = document.querySelector("#request-form");
  const requestButton = document.querySelector("#request-button");
  const requestMessage = document.querySelector("#request-message");
  const emailInput = document.querySelector("#email");
  const sentEmail = document.querySelector("#sent-email");
  const sendAgainButton = document.querySelector("#send-again-button");
  const updateForm = document.querySelector("#update-form");
  const updateButton = document.querySelector("#update-button");
  const updateMessage = document.querySelector("#update-message");
  const passwordInput = document.querySelector("#password");
  const passwordConfirmationInput = document.querySelector("#password-confirmation");
  const newLinkButton = document.querySelector("#new-link-button");

  let client = null;
  let hasRecoverySession = false;

  const showView = (name) => {
    Object.entries(views).forEach(([viewName, element]) => {
      element.hidden = viewName !== name;
    });
  };

  const setMessage = (element, message = "") => {
    element.textContent = message;
  };

  const getClient = () => {
    if (!client && window.supabase?.createClient) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: "implicit",
        },
      });
    }
    return client;
  };

  const recoveryRedirectUrl = () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    return url.toString();
  };

  const setRequestBusy = (busy) => {
    emailInput.disabled = busy;
    requestButton.disabled = busy;
    requestButton.querySelector("span:first-child").textContent = busy ? "Enviando..." : "Enviar link de recuperação";
  };

  const setUpdateBusy = (busy) => {
    passwordInput.disabled = busy;
    passwordConfirmationInput.disabled = busy;
    document.querySelectorAll(".password-toggle").forEach((button) => { button.disabled = busy; });
    updateButton.disabled = busy;
    updateButton.querySelector("span:first-child").textContent = busy ? "Salvando..." : "Salvar nova senha";
  };

  const cleanRecoveryUrl = () => {
    window.history.replaceState({}, document.title, recoveryRedirectUrl());
  };

  const openUpdateView = () => {
    hasRecoverySession = true;
    showView("update");
    cleanRecoveryUrl();
    requestAnimationFrame(() => passwordInput.focus());
  };

  const openInvalidLinkView = () => {
    hasRecoverySession = false;
    showView("invalid");
    cleanRecoveryUrl();
  };

  const initializeRecoveryState = async () => {
    const supabaseClient = getClient();
    if (!supabaseClient) {
      setMessage(requestMessage, "Não foi possível carregar a recuperação de senha. Atualize a página e tente novamente.");
      requestButton.disabled = true;
      return;
    }

    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const hasRecoveryCallback = url.searchParams.has("code") || hash.get("type") === "recovery" || hash.has("access_token");
    const hasCallbackError = url.searchParams.has("error") || hash.has("error") || hash.has("error_code");

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) openUpdateView();
    });

    if (hasCallbackError) {
      openInvalidLinkView();
      return;
    }

    try {
      if (url.searchParams.has("code")) {
        const { error } = await supabaseClient.auth.exchangeCodeForSession(url.searchParams.get("code"));
        if (error) throw error;
      } else if (hash.has("access_token") && hash.has("refresh_token")) {
        const { error } = await supabaseClient.auth.setSession({
          access_token: hash.get("access_token"),
          refresh_token: hash.get("refresh_token"),
        });
        if (error) throw error;
      }

      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;

      if (hasRecoveryCallback) {
        if (data.session) openUpdateView();
        else openInvalidLinkView();
      }
    } catch {
      openInvalidLinkView();
    }
  };

  document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.target);
      const willShow = input.type === "password";
      input.type = willShow ? "text" : "password";
      button.textContent = willShow ? "Ocultar" : "Mostrar";
      button.setAttribute("aria-pressed", String(willShow));
      input.focus();
    });
  });

  requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(requestMessage);

    const email = emailInput.value.trim().toLowerCase();
    if (!email || !emailInput.validity.valid) {
      setMessage(requestMessage, "Informe um endereço de e-mail válido.");
      emailInput.focus();
      return;
    }

    const supabaseClient = getClient();
    if (!supabaseClient) {
      setMessage(requestMessage, "Não foi possível iniciar a recuperação agora. Tente novamente.");
      return;
    }

    setRequestBusy(true);
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: recoveryRedirectUrl(),
      });
      if (error) throw error;
      sentEmail.textContent = email;
      showView("sent");
    } catch (error) {
      const status = Number(error?.status ?? 0);
      if (status === 429) setMessage(requestMessage, "Muitas tentativas seguidas. Aguarde um minuto e tente novamente.");
      else setMessage(requestMessage, "Não foi possível enviar o link agora. Tente novamente.");
    } finally {
      setRequestBusy(false);
    }
  });

  updateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(updateMessage);

    const password = passwordInput.value;
    const confirmation = passwordConfirmationInput.value;
    if (password.length < 8) {
      setMessage(updateMessage, "A nova senha precisa ter pelo menos 8 caracteres.");
      passwordInput.focus();
      return;
    }
    if (password !== confirmation) {
      setMessage(updateMessage, "As senhas não coincidem. Digite novamente.");
      passwordConfirmationInput.focus();
      return;
    }
    if (!hasRecoverySession) {
      openInvalidLinkView();
      return;
    }

    setUpdateBusy(true);
    try {
      const { error } = await getClient().auth.updateUser({ password });
      if (error) throw error;
      await getClient().auth.signOut({ scope: "local" });
      passwordInput.value = "";
      passwordConfirmationInput.value = "";
      hasRecoverySession = false;
      showView("success");
    } catch (error) {
      const status = Number(error?.status ?? 0);
      if (status === 401 || status === 403) openInvalidLinkView();
      else setMessage(updateMessage, "Não foi possível salvar sua nova senha. Tente novamente.");
    } finally {
      setUpdateBusy(false);
    }
  });

  sendAgainButton.addEventListener("click", () => {
    showView("request");
    emailInput.select();
  });

  newLinkButton.addEventListener("click", () => {
    showView("request");
    emailInput.focus();
  });

  void initializeRecoveryState();
})();
