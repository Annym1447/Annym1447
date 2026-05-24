// ─── Estado ───────────────────────────────────────────────────────────────────
let humorSeleccionado = "😊";
let colorPaletteOpen  = false;
let moodPanelOpen     = false;
let fontPanelOpen     = false;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

  // Fecha actual
  document.getElementById("entry-date").textContent =
    new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Contador de caracteres
  const textarea = document.getElementById("entry-text");
  textarea.addEventListener("input", () => {
    document.getElementById("char-count").textContent = `${textarea.value.length} / 3000`;
  });

  // ── Herramienta: color de fondo ──────────────────────────────────────────
  document.getElementById("tool-color").addEventListener("click", (e) => {
    e.stopPropagation();
    colorPaletteOpen = !colorPaletteOpen;
    document.getElementById("color-palette").classList.toggle("open", colorPaletteOpen);
    cerrarOtrosPaneles("color");
  });

  document.querySelectorAll(".color-dot").forEach(btn => {
    btn.addEventListener("click", () => {
      const canvas = document.getElementById("canvas-area");
      const textarea = document.getElementById("entry-text");
      canvas.style.setProperty("--bg-canvas",  btn.dataset.bg);
      canvas.style.setProperty("--grid-color", btn.dataset.grid);
      // texto oscuro o claro según fondo
      const esDark = btn.dataset.bg === "#1a1a2e";
      textarea.classList.toggle("dark-mode", esDark);
      document.getElementById("char-count").style.color = esDark ? "#555" : "#bbb";
      document.getElementById("entry-date").style.color  = esDark ? "#666" : "#aaa";
      document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("color-palette").classList.remove("open");
      colorPaletteOpen = false;
    });
  });

  // ── Herramienta: humor ───────────────────────────────────────────────────
  document.getElementById("tool-humor").addEventListener("click", (e) => {
    e.stopPropagation();
    moodPanelOpen = !moodPanelOpen;
    document.getElementById("mood-panel").classList.toggle("open", moodPanelOpen);
    cerrarOtrosPaneles("mood");
  });

  document.querySelectorAll(".mood-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      humorSeleccionado = btn.dataset.mood;
      document.getElementById("mood-display").textContent  = humorSeleccionado;
      document.getElementById("tool-humor").textContent    = humorSeleccionado;
      document.getElementById("mood-panel").classList.remove("open");
      moodPanelOpen = false;
    });
  });

  // ── Herramienta: fuente ──────────────────────────────────────────────────
  document.getElementById("tool-texto").addEventListener("click", (e) => {
    e.stopPropagation();
    fontPanelOpen = !fontPanelOpen;
    document.getElementById("font-panel").classList.toggle("open", fontPanelOpen);
    cerrarOtrosPaneles("font");
  });

  document.querySelectorAll(".font-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("entry-text").style.fontFamily = btn.dataset.font;
      document.querySelectorAll(".font-opt").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("font-panel").classList.remove("open");
      fontPanelOpen = false;
    });
  });

  // Cierra paneles al tocar fuera
  document.addEventListener("click", () => {
    document.getElementById("color-palette").classList.remove("open");
    document.getElementById("mood-panel").classList.remove("open");
    document.getElementById("font-panel").classList.remove("open");
    colorPaletteOpen = moodPanelOpen = fontPanelOpen = false;
  });

  // ── Guardar ──────────────────────────────────────────────────────────────
  document.getElementById("save-btn").addEventListener("click", guardarEntrada);

  // Activar tool escribir por defecto
  document.getElementById("tool-escribir").addEventListener("click", () => {
    document.getElementById("entry-text").focus();
  });

  // Marcar color blanco como activo por defecto
  document.querySelector(".color-dot").classList.add("active");
});

// ─── Guardar entrada ──────────────────────────────────────────────────────────
async function guardarEntrada() {
  const texto = document.getElementById("entry-text").value.trim();
  if (!texto) { mostrarToast("Escribe algo primero ✏️"); return; }

  const res = await fetch("/api/entradas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto, humor: humorSeleccionado }),
  });

  if (res.ok) {
    mostrarToast("¡Entrada guardada! 🎉");
    setTimeout(() => { window.location.href = "/"; }, 1500);
  } else {
    mostrarToast("Error al guardar");
  }
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
function cerrarOtrosPaneles(excepto) {
  if (excepto !== "color") { document.getElementById("color-palette").classList.remove("open"); colorPaletteOpen = false; }
  if (excepto !== "mood")  { document.getElementById("mood-panel").classList.remove("open");   moodPanelOpen    = false; }
  if (excepto !== "font")  { document.getElementById("font-panel").classList.remove("open");   fontPanelOpen    = false; }
}

function mostrarToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}
