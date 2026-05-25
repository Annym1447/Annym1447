/**
 * auth-modal.js  —  MoodSketch
 * Maneja el modal de usuario: registro, login y edición de perfil.
 * Depende de auth-modal.css y del botón .nav-user-btn en el navbar.
 *
 * Uso: <script src="/static/js/auth-modal.js"></script>
 */

(function () {
  "use strict";

  // ── Estado ──────────────────────────────────────────────────────────────────
  let currentUser = null;

  // ── Avatares disponibles ─────────────────────────────────────────────────────
  const AVATARS = ["😊","😎","🥳","🤩","😴","🥺","😤","🤔","🌟","🦋","🐱","🐶","🌈","🎨","🚀","🌙"];

  // ── HTML del modal (se inyecta en el <body>) ─────────────────────────────────
  const MODAL_HTML = `
<div class="auth-overlay" id="authOverlay" role="dialog" aria-modal="true" aria-label="Panel de usuario">
  <div class="auth-modal" id="authModal">
    <div class="modal-handle"></div>

    <!-- Tabs: solo visibles cuando NO hay sesión -->
    <div class="auth-tabs" id="authTabs">
      <button class="auth-tab active" data-tab="login">Iniciar sesión</button>
      <button class="auth-tab" data-tab="register">Registrarse</button>
      <button class="auth-tab" data-tab="profile" style="display:none">Mi perfil</button>
    </div>

    <!-- ══ Cuerpo scrollable ══════════════════════════════════════════════ -->
    <div class="auth-body">

      <!-- ── Mensaje de error / éxito global ── -->
      <div class="auth-error"   id="authError"></div>
      <div class="auth-success" id="authSuccess"></div>

      <!-- ════════════ PANEL: LOGIN ════════════ -->
      <section id="panelLogin">
        <div class="auth-field">
          <label class="auth-label">Correo electrónico</label>
          <input class="auth-input" id="loginEmail" type="email"
                 placeholder="tu@correo.com" autocomplete="email">
        </div>
        <div class="auth-field" style="margin-top:12px">
          <label class="auth-label">Contraseña</label>
          <input class="auth-input" id="loginPass" type="password"
                 placeholder="••••••••" autocomplete="current-password">
        </div>
        <button class="auth-btn auth-btn-primary" id="btnLogin" style="margin-top:20px">
          Entrar
        </button>
        <p style="text-align:center;margin-top:12px;font-size:12px;color:#6060aa;font-weight:700">
          ¿No tienes cuenta?
          <span style="color:#ff3d8b;cursor:pointer" id="goRegister">Regístrate gratis</span>
        </p>
      </section>

      <!-- ════════════ PANEL: REGISTER ════════════ -->
      <section id="panelRegister" style="display:none">
        <div class="avatar-selector">
          <span class="avatar-big" id="regAvatarBig" title="Elige tu avatar">😊</span>
          <p class="avatar-hint">Toca para elegir tu avatar</p>
          <div class="avatar-row" id="regAvatarRow"></div>
        </div>
        <div class="auth-divider"></div>
        <div class="auth-field">
          <label class="auth-label">Nombre</label>
          <input class="auth-input" id="regNombre" type="text"
                 placeholder="¿Cómo te llamas?" autocomplete="name">
        </div>
        <div class="auth-field" style="margin-top:12px">
          <label class="auth-label">Correo electrónico</label>
          <input class="auth-input" id="regEmail" type="email"
                 placeholder="tu@correo.com" autocomplete="email">
        </div>
        <div class="auth-field" style="margin-top:12px">
          <label class="auth-label">Contraseña (mín. 6 caracteres)</label>
          <input class="auth-input" id="regPass" type="password"
                 placeholder="••••••••" autocomplete="new-password">
        </div>
        <button class="auth-btn auth-btn-primary" id="btnRegister" style="margin-top:20px">
          Crear cuenta
        </button>
        <p style="text-align:center;margin-top:12px;font-size:12px;color:#6060aa;font-weight:700">
          ¿Ya tienes cuenta?
          <span style="color:#ff3d8b;cursor:pointer" id="goLogin">Iniciar sesión</span>
        </p>
      </section>

      <!-- ════════════ PANEL: PERFIL ════════════ -->
      <section id="panelProfile" style="display:none">
        <div class="profile-header">
          <span class="avatar-big" id="profAvatarBig" title="Elige tu avatar">😊</span>
          <div class="avatar-row" id="profAvatarRow"></div>
          <p class="profile-name"  id="profName">—</p>
          <p class="profile-email" id="profEmail">—</p>
        </div>
        <div class="auth-divider"></div>

        <!-- Datos básicos -->
        <p class="auth-section-title">Información personal</p>
        <div class="auth-field">
          <label class="auth-label">Nombre</label>
          <input class="auth-input" id="profNombre" type="text" placeholder="Tu nombre">
        </div>
        <div class="auth-field" style="margin-top:12px">
          <label class="auth-label">Bio corta</label>
          <textarea class="auth-input" id="profBio" placeholder="Cuéntanos algo sobre ti…"></textarea>
        </div>
        <button class="auth-btn auth-btn-primary" id="btnSaveProfile" style="margin-top:16px">
          Guardar cambios
        </button>

        <div class="auth-divider" style="margin-top:20px"></div>

        <!-- Amigos -->
        <p class="auth-section-title">👥 Amigos</p>
        <!-- Mi código -->
        <div style="background:#0d0d2b;border:1.5px solid #2a2a6a;border-radius:14px;padding:14px 16px;margin-bottom:12px">
          <p style="font-size:11px;font-weight:800;color:#6060aa;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Tu código de invitación</p>
          <div style="display:flex;align-items:center;gap:10px">
            <span id="profCodigo" style="font-size:22px;font-weight:900;color:#00e5b0;letter-spacing:.15em;font-family:'Courier New',monospace;flex:1">—</span>
            <button id="btnCopiarCodigo" style="background:#1a1a5a;border:1px solid #2a2a7a;border-radius:10px;color:#00e5b0;font-size:13px;font-weight:800;font-family:'Nunito',sans-serif;padding:7px 14px;cursor:pointer;white-space:nowrap">📋 Copiar</button>
          </div>
          <p style="font-size:11px;color:#6060aa;font-weight:600;margin-top:6px">Compártelo para que te agreguen como amigo</p>
        </div>
        <!-- Agregar amigo -->
        <div class="auth-field">
          <label class="auth-label">Pegar código de un amigo</label>
          <div style="display:flex;gap:8px">
            <input class="auth-input" id="inputAgregarAmigo" type="text"
                   placeholder="Ej: A3F8C21D" maxlength="12"
                   style="text-transform:uppercase;letter-spacing:.1em;font-weight:700">
            <button id="btnAgregarAmigo" style="background:#ff3d8b;border:none;border-radius:12px;color:#fff;font-family:'Nunito',sans-serif;font-size:14px;font-weight:900;padding:0 18px;cursor:pointer;white-space:nowrap;transition:background .15s">➕</button>
          </div>
          <div id="agregarAmigoMsg" style="font-size:12px;font-weight:700;margin-top:8px;padding:8px 12px;border-radius:10px;display:none"></div>
        </div>

        <div class="auth-divider" style="margin-top:20px"></div>

        <!-- Cambiar credenciales -->
        <p class="auth-section-title">Cambiar correo o contraseña</p>
        <div class="auth-field">
          <label class="auth-label">Contraseña actual <span style="color:#ff3d8b">*</span></label>
          <input class="auth-input" id="credPassActual" type="password"
                 placeholder="Requerida para confirmar cambios" autocomplete="current-password">
        </div>
        <div class="auth-field" style="margin-top:12px">
          <label class="auth-label">Nuevo correo electrónico</label>
          <input class="auth-input" id="credNuevoEmail" type="email"
                 placeholder="Dejar vacío si no cambia" autocomplete="email">
        </div>
        <div class="auth-field" style="margin-top:12px">
          <label class="auth-label">Nueva contraseña</label>
          <input class="auth-input" id="credNuevaPass" type="password"
                 placeholder="Mín. 6 caracteres · dejar vacío si no cambia" autocomplete="new-password">
        </div>
        <div class="auth-field" style="margin-top:12px">
          <label class="auth-label">Repetir nueva contraseña</label>
          <input class="auth-input" id="credNuevaPass2" type="password"
                 placeholder="Repite la nueva contraseña" autocomplete="new-password">
        </div>
        <button class="auth-btn auth-btn-secondary" id="btnUpdateCredentials" style="margin-top:16px">
          Actualizar correo / contraseña
        </button>

        <div class="auth-divider" style="margin-top:16px"></div>
        <button class="auth-btn auth-btn-danger" id="btnLogout">
          Cerrar sesión
        </button>
      </section>

    </div><!-- /auth-body -->
  </div><!-- /auth-modal -->
</div><!-- /auth-overlay -->`;

  // ── Inyectar modal en el DOM ─────────────────────────────────────────────────
  function injectModal() {
    document.body.insertAdjacentHTML("beforeend", MODAL_HTML);
    buildAvatarRows();
    bindEvents();
  }

  // ── Construir filas de emojis ────────────────────────────────────────────────
  function buildAvatarRows() {
    ["regAvatarRow", "profAvatarRow"].forEach((rowId, i) => {
      const row = document.getElementById(rowId);
      const bigId = i === 0 ? "regAvatarBig" : "profAvatarBig";
      AVATARS.forEach(emoji => {
        const btn = document.createElement("button");
        btn.className   = "avatar-opt";
        btn.textContent = emoji;
        btn.type        = "button";
        btn.addEventListener("click", () => {
          row.querySelectorAll(".avatar-opt").forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
          document.getElementById(bigId).textContent = emoji;
        });
        row.appendChild(btn);
      });
    });
  }

  // ── Helpers de UI ────────────────────────────────────────────────────────────
  function showTab(tab) {
    ["login","register","profile"].forEach(t => {
      document.getElementById("panel" + capitalize(t)).style.display = t === tab ? "" : "none";
    });
    document.querySelectorAll(".auth-tab[data-tab]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    clearMessages();
  }

  function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

  function showError(msg) {
    const el = document.getElementById("authError");
    el.textContent = msg;
    el.classList.add("visible");
    document.getElementById("authSuccess").classList.remove("visible");
  }

  function showSuccess(msg) {
    const el = document.getElementById("authSuccess");
    el.textContent = msg;
    el.classList.add("visible");
    document.getElementById("authError").classList.remove("visible");
  }

  function clearMessages() {
    document.getElementById("authError").classList.remove("visible");
    document.getElementById("authSuccess").classList.remove("visible");
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    if (loading) {
      btn._label = btn.textContent;
      btn.innerHTML = '<span class="auth-spinner"></span>Cargando…';
    } else {
      btn.innerHTML = btn._label || btn.innerHTML;
    }
  }

  // ── Actualizar navbar ────────────────────────────────────────────────────────
  function updateNavBtn(user) {
    const btn    = document.getElementById("navUserBtn");
    const avatar = document.getElementById("navUserAvatar");
    if (!btn || !avatar) return;
    if (user) {
      avatar.textContent = user.avatar_emoji || "😊";
      btn.classList.add("logged-in");
      btn.title = `Hola, ${user.nombre}`;
    } else {
      avatar.textContent = "👤";
      btn.classList.remove("logged-in");
      btn.title = "Usuario";
    }
  }

  // ── Llenar panel perfil ──────────────────────────────────────────────────────
  function fillProfile(user) {
    document.getElementById("profAvatarBig").textContent = user.avatar_emoji || "😊";
    document.getElementById("profName").textContent      = user.nombre;
    document.getElementById("profEmail").textContent     = user.email;
    document.getElementById("profNombre").value          = user.nombre;
    document.getElementById("profBio").value             = user.bio || "";
    // Marcar avatar seleccionado
    const row = document.getElementById("profAvatarRow");
    row.querySelectorAll(".avatar-opt").forEach(btn => {
      btn.classList.toggle("selected", btn.textContent === (user.avatar_emoji || "😊"));
    });
    // Cargar código de invitación
    cargarCodigoInvitacion();
  }

  async function cargarCodigoInvitacion() {
    try {
      const { data } = await apiGet("/api/amigos/mi_codigo");
      const codigo = data.codigo || "—";
      const el = document.getElementById("profCodigo");
      if (el) el.textContent = codigo;

      // Botón copiar código
      const btnCopiar = document.getElementById("btnCopiarCodigo");
      if (btnCopiar) {
        btnCopiar.onclick = async () => {
          const link = `${location.origin}/amigos?unirse=${codigo}`;
          try { await navigator.clipboard.writeText(link); }
          catch (_) {
            const ta = document.createElement("textarea");
            ta.value = link; document.body.appendChild(ta);
            ta.select(); document.execCommand("copy");
            document.body.removeChild(ta);
          }
          btnCopiar.textContent = "✅ ¡Copiado!";
          setTimeout(() => btnCopiar.textContent = "📋 Copiar", 2000);
        };
      }

      // Botón agregar amigo
      const btnAgregar = document.getElementById("btnAgregarAmigo");
      const inputAmigo = document.getElementById("inputAgregarAmigo");
      const msgAmigo   = document.getElementById("agregarAmigoMsg");
      if (btnAgregar) {
        const doAgregar = async () => {
          const cod = inputAmigo.value.trim().toUpperCase();
          msgAmigo.style.display = "none";
          if (!cod) { mostrarMsgAmigo("Escribe un código", false); return; }
          btnAgregar.disabled = true;
          try {
            const { ok, data } = await apiPost("/api/amigos/aceptar", { codigo: cod });
            if (ok && data.ok) {
              mostrarMsgAmigo(`🎉 ¡Ahora eres amigo de ${data.amigo.nombre}!`, true);
              inputAmigo.value = "";
            } else {
              mostrarMsgAmigo(data.error || "Error al agregar", false);
            }
          } catch (_) {
            mostrarMsgAmigo("No se pudo conectar", false);
          } finally {
            btnAgregar.disabled = false;
          }
        };
        btnAgregar.onclick = doAgregar;
        inputAmigo.onkeydown = e => { if (e.key === "Enter") doAgregar(); };
      }
    } catch (_) {}
  }

  function mostrarMsgAmigo(texto, esOk) {
    const el = document.getElementById("agregarAmigoMsg");
    if (!el) return;
    el.textContent = texto;
    el.style.display = "block";
    el.style.color      = esOk ? "#00e5b0" : "#ff3d8b";
    el.style.background = esOk ? "rgba(0,229,176,.08)" : "rgba(255,61,139,.08)";
    el.style.border     = esOk ? "1px solid rgba(0,229,176,.2)" : "1px solid rgba(255,61,139,.2)";
  }

  // ── Abrir / Cerrar modal ─────────────────────────────────────────────────────
  function openModal() {
    const overlay = document.getElementById("authOverlay");
    overlay.classList.add("open");
    overlay.focus?.();

    if (currentUser) {
      // Mostrar tab perfil, ocultar login/register
      document.querySelectorAll(".auth-tab[data-tab='login'], .auth-tab[data-tab='register']")
              .forEach(t => t.style.display = "none");
      document.querySelector(".auth-tab[data-tab='profile']").style.display = "";
      fillProfile(currentUser);
      showTab("profile");
    } else {
      document.querySelectorAll(".auth-tab[data-tab='login'], .auth-tab[data-tab='register']")
              .forEach(t => t.style.display = "");
      document.querySelector(".auth-tab[data-tab='profile']").style.display = "none";
      showTab("login");
    }
  }

  function closeModal() {
    document.getElementById("authOverlay").classList.remove("open");
    clearMessages();
  }

  // ── API calls ────────────────────────────────────────────────────────────────
  async function apiPost(endpoint, body) {
    const r = await fetch(endpoint, {
      method:      "POST",
      headers:     { "Content-Type": "application/json" },
      credentials: "include",
      body:        JSON.stringify(body),
    });
    return r.json().then(data => ({ ok: r.ok, status: r.status, data }));
  }

  async function apiGet(endpoint) {
    const r = await fetch(endpoint, { credentials: "include" });
    return r.json().then(data => ({ ok: r.ok, status: r.status, data }));
  }

  // ── Verificar sesión al cargar ───────────────────────────────────────────────
  async function checkSession() {
    try {
      const { data } = await apiGet("/api/auth/me");
      if (data.user) {
        currentUser = data.user;
        updateNavBtn(currentUser);
      }
    } catch (_) { /* PHP no disponible, seguimos sin auth */ }
  }

  // ── Binding de eventos ───────────────────────────────────────────────────────
  function bindEvents() {
    const overlay = document.getElementById("authOverlay");

    // Cerrar al click fuera del modal
    overlay.addEventListener("click", e => {
      if (e.target === overlay) closeModal();
    });

    // Tabs
    document.querySelectorAll(".auth-tab[data-tab]").forEach(btn => {
      btn.addEventListener("click", () => showTab(btn.dataset.tab));
    });

    // Ir a registro / login desde links
    document.getElementById("goRegister")?.addEventListener("click", () => showTab("register"));
    document.getElementById("goLogin")?.addEventListener("click", () => showTab("login"));

    // ── Login ──────────────────────────────────────────────────────────────────
    document.getElementById("btnLogin").addEventListener("click", async () => {
      const btn   = document.getElementById("btnLogin");
      const email = document.getElementById("loginEmail").value.trim();
      const pass  = document.getElementById("loginPass").value;
      clearMessages();
      if (!email || !pass) { showError("Completa todos los campos"); return; }
      setLoading(btn, true);
      try {
        const { ok, data } = await apiPost("/api/auth/login", { email, password: pass });
        if (ok && data.user) {
          currentUser = data.user;
          updateNavBtn(currentUser);
          showSuccess(`¡Bienvenid@ de nuevo, ${data.user.nombre}! 🎉`);
          setTimeout(closeModal, 1400);
        } else {
          showError(data.error || "Error al iniciar sesión");
        }
      } catch (_) {
        showError("No se pudo conectar con el servidor");
      } finally {
        setLoading(btn, false);
      }
    });

    // Enter en login
    ["loginEmail","loginPass"].forEach(id => {
      document.getElementById(id).addEventListener("keydown", e => {
        if (e.key === "Enter") document.getElementById("btnLogin").click();
      });
    });

    // ── Registro ───────────────────────────────────────────────────────────────
    document.getElementById("btnRegister").addEventListener("click", async () => {
      const btn    = document.getElementById("btnRegister");
      const nombre = document.getElementById("regNombre").value.trim();
      const email  = document.getElementById("regEmail").value.trim();
      const pass   = document.getElementById("regPass").value;
      const avatar = document.getElementById("regAvatarBig").textContent;
      clearMessages();
      if (!nombre || !email || !pass) { showError("Completa todos los campos"); return; }
      if (pass.length < 6) { showError("La contraseña debe tener al menos 6 caracteres"); return; }
      setLoading(btn, true);
      try {
        const { ok, data } = await apiPost("/api/auth/register", {
          nombre, email, password: pass, avatar_emoji: avatar
        });
        if (ok && data.user) {
          currentUser = data.user;
          updateNavBtn(currentUser);
          showSuccess(`¡Cuenta creada! Bienvenid@, ${data.user.nombre} 🚀`);
          setTimeout(closeModal, 1400);
        } else {
          showError(data.error || "Error al registrarse");
        }
      } catch (_) {
        showError("No se pudo conectar con el servidor");
      } finally {
        setLoading(btn, false);
      }
    });

    // ── Guardar perfil ─────────────────────────────────────────────────────────
    document.getElementById("btnSaveProfile").addEventListener("click", async () => {
      const btn    = document.getElementById("btnSaveProfile");
      const nombre = document.getElementById("profNombre").value.trim();
      const bio    = document.getElementById("profBio").value.trim();
      const avatar = document.getElementById("profAvatarBig").textContent;
      clearMessages();
      if (!nombre) { showError("El nombre no puede estar vacío"); return; }
      setLoading(btn, true);
      try {
        const { ok, data } = await apiPost("/api/auth/profile", { nombre, bio, avatar_emoji: avatar });
        if (ok && data.user) {
          currentUser = data.user;
          updateNavBtn(currentUser);
          fillProfile(currentUser);
          showSuccess("¡Perfil actualizado! ✨");
        } else {
          showError(data.error || "Error al guardar");
        }
      } catch (_) {
        showError("No se pudo conectar con el servidor");
      } finally {
        setLoading(btn, false);
      }
    });

    // ── Logout ─────────────────────────────────────────────────────────────────
    document.getElementById("btnLogout").addEventListener("click", async () => {
      await apiPost("/api/auth/logout", {});
      currentUser = null;
      updateNavBtn(null);
      closeModal();
    });

    // ── Actualizar correo / contraseña ─────────────────────────────────────────
    document.getElementById("btnUpdateCredentials").addEventListener("click", async () => {
      const btn         = document.getElementById("btnUpdateCredentials");
      const passActual  = document.getElementById("credPassActual").value;
      const nuevoEmail  = document.getElementById("credNuevoEmail").value.trim();
      const nuevaPass   = document.getElementById("credNuevaPass").value;
      const nuevaPass2  = document.getElementById("credNuevaPass2").value;
      clearMessages();

      if (!passActual) {
        showError("Debes ingresar tu contraseña actual para confirmar los cambios");
        return;
      }
      if (!nuevoEmail && !nuevaPass) {
        showError("Ingresa un nuevo correo, una nueva contraseña, o ambos");
        return;
      }
      if (nuevaPass && nuevaPass !== nuevaPass2) {
        showError("Las contraseñas nuevas no coinciden");
        return;
      }
      if (nuevaPass && nuevaPass.length < 6) {
        showError("La nueva contraseña debe tener al menos 6 caracteres");
        return;
      }

      setLoading(btn, true);
      try {
        const { ok, data } = await apiPost("/api/auth/update_credentials", {
          password_actual: passActual,
          nuevo_email:     nuevoEmail  || undefined,
          nueva_password:  nuevaPass   || undefined,
        });
        if (ok && data.ok) {
          if (nuevoEmail) {
            currentUser.email = nuevoEmail;
            document.getElementById("profEmail").textContent = nuevoEmail;
            updateNavBtn(currentUser);
          }
          // Limpiar campos sensibles
          document.getElementById("credPassActual").value  = "";
          document.getElementById("credNuevoEmail").value  = "";
          document.getElementById("credNuevaPass").value   = "";
          document.getElementById("credNuevaPass2").value  = "";
          showSuccess("¡Datos actualizados correctamente! 🔐");
        } else {
          showError(data.error || "Error al actualizar");
        }
      } catch (_) {
        showError("No se pudo conectar con el servidor");
      } finally {
        setLoading(btn, false);
      }
    });
  }

  // ── Exponer función para que el navbar la llame ──────────────────────────────
  window.MoodAuth = { open: openModal, close: closeModal };

  // ── Init ─────────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    injectModal();
    checkSession();

    // Conectar botón de navbar si ya existe en el HTML
    const navBtn = document.getElementById("navUserBtn");
    if (navBtn) navBtn.addEventListener("click", openModal);
  });

})();
