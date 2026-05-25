// ─── Estado ───────────────────────────────────────────────────────────────────
let humorSeleccionado = "😊";
let colorPaletteOpen  = false;
let moodPanelOpen     = false;
let fontPanelOpen     = false;
let modoActual        = "write"; // "write" | "draw"
let adjuntos          = [];      // [{nombre, mime_type, data (base64), url (objectURL)}]

// ─── Dibujo ───────────────────────────────────────────────────────────────────
let drawing     = false;
let drawTool    = "pen";   // "pen" | "eraser"
let drawColor   = "#ff3d8b";
let drawSize    = 4;
let lastX = 0, lastY = 0;

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
      const canvas  = document.getElementById("canvas-area");
      const textarea = document.getElementById("entry-text");
      canvas.style.setProperty("--bg-canvas",  btn.dataset.bg);
      canvas.style.setProperty("--grid-color", btn.dataset.grid);
      const esDark = btn.dataset.bg === "#1a1a2e";
      textarea.classList.toggle("dark-mode", esDark);
      document.getElementById("char-count").style.color = esDark ? "#555" : "#bbb";
      document.getElementById("entry-date").style.color  = esDark ? "#666" : "#aaa";
      // Adaptar toolbars de dibujo y adjuntos al modo oscuro
      document.querySelector(".draw-toolbar").classList.toggle("dark", esDark);
      document.querySelector(".attach-panel").classList.toggle("dark", esDark);
      document.querySelector(".attach-drop-zone").classList.toggle("dark", esDark);
      document.querySelectorAll(".draw-tool-btn").forEach(b => b.classList.toggle("dark", esDark));
      document.querySelectorAll(".attach-item").forEach(b => b.classList.toggle("dark", esDark));
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

  // ── Herramienta: modo escribir ───────────────────────────────────────────
  document.getElementById("tool-escribir").addEventListener("click", () => {
    setModo("write");
    document.getElementById("entry-text").focus();
  });

  // ── Herramienta: modo dibujo ─────────────────────────────────────────────
  document.getElementById("tool-dibujo").addEventListener("click", () => {
    setModo(modoActual === "draw" ? "write" : "draw");
  });

  // ── Herramienta: adjuntos ────────────────────────────────────────────────
  document.getElementById("tool-adjunto").addEventListener("click", (e) => {
    e.stopPropagation();
    const panel = document.getElementById("attach-panel");
    panel.classList.toggle("open");
    cerrarOtrosPaneles("attach");
  });

  // Drop zone click → file input
  document.getElementById("attach-drop-zone").addEventListener("click", () => {
    document.getElementById("file-input").click();
  });

  document.getElementById("file-input").addEventListener("change", (e) => {
    Array.from(e.target.files).forEach(procesarArchivo);
    e.target.value = "";
  });

  // Drag & drop
  const dropZone = document.getElementById("attach-drop-zone");
  dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    Array.from(e.dataTransfer.files).forEach(procesarArchivo);
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

  // Marcar color blanco como activo por defecto
  document.querySelector(".color-dot").classList.add("active");

  // ── Inicializar canvas de dibujo ─────────────────────────────────────────
  initDrawCanvas();
  iniciarHerramientasDibujo();
});

// ─── Cambio de modo escritura / dibujo ────────────────────────────────────────
function setModo(modo) {
  modoActual = modo;
  const canvasArea = document.getElementById("canvas-area");
  canvasArea.classList.toggle("draw-mode",  modo === "draw");
  canvasArea.classList.toggle("write-mode", modo === "write");
  document.getElementById("tool-dibujo").classList.toggle("draw-active", modo === "draw");
  document.getElementById("tool-escribir").classList.toggle("active", modo === "write");
  if (modo === "draw") ajustarCanvasTamano();
}

// ─── Canvas de dibujo ─────────────────────────────────────────────────────────
function initDrawCanvas() {
  const wrap = document.getElementById("draw-canvas-wrap");
  if (!wrap) return;

  // Crear canvas
  const canvas = document.createElement("canvas");
  canvas.id = "draw-canvas";
  wrap.insertBefore(canvas, wrap.firstChild);

  ajustarCanvasTamano();
  window.addEventListener("resize", ajustarCanvasTamano);
}

function ajustarCanvasTamano() {
  const wrap   = document.getElementById("draw-canvas-wrap");
  const canvas = document.getElementById("draw-canvas");
  if (!wrap || !canvas) return;
  // Guardar contenido actual
  const ctx  = canvas.getContext("2d");
  const snap = canvas.width > 0 ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
  canvas.width  = wrap.clientWidth  || wrap.offsetWidth;
  canvas.height = wrap.clientHeight || wrap.offsetHeight;
  if (snap && snap.width > 0) ctx.putImageData(snap, 0, 0);
}

function iniciarHerramientasDibujo() {
  const canvas = document.getElementById("draw-canvas");

  // Colores de dibujo
  document.querySelectorAll(".draw-color").forEach(dot => {
    dot.addEventListener("click", () => {
      drawColor = dot.dataset.color;
      drawTool  = "pen";
      document.querySelectorAll(".draw-color").forEach(d => d.classList.remove("active"));
      dot.classList.add("active");
      document.getElementById("btn-pen").classList.add("active");
      document.getElementById("btn-eraser").classList.remove("active");
    });
  });

  // Lápiz
  document.getElementById("btn-pen").addEventListener("click", () => {
    drawTool = "pen";
    document.getElementById("btn-pen").classList.add("active");
    document.getElementById("btn-eraser").classList.remove("active");
  });

  // Borrador
  document.getElementById("btn-eraser").addEventListener("click", () => {
    drawTool = "eraser";
    document.getElementById("btn-eraser").classList.add("active");
    document.getElementById("btn-pen").classList.remove("active");
  });

  // Tamaño
  const sizeInput = document.getElementById("draw-size");
  sizeInput.addEventListener("input", () => { drawSize = parseInt(sizeInput.value); });

  // Limpiar canvas
  document.getElementById("btn-clear-draw").addEventListener("click", () => {
    const c   = document.getElementById("draw-canvas");
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    mostrarToast("Canvas limpiado 🗑️");
  });

  // Activar primer color
  document.querySelector(".draw-color").classList.add("active");
  document.getElementById("btn-pen").classList.add("active");

  // Eventos de dibujo (mouse + touch)
  canvas.addEventListener("mousedown",  startDraw);
  canvas.addEventListener("mousemove",  doDraw);
  canvas.addEventListener("mouseup",    endDraw);
  canvas.addEventListener("mouseleave", endDraw);

  canvas.addEventListener("touchstart",  e => { e.preventDefault(); startDraw(e.touches[0]); }, { passive: false });
  canvas.addEventListener("touchmove",   e => { e.preventDefault(); doDraw(e.touches[0]); },   { passive: false });
  canvas.addEventListener("touchend",    endDraw);
}

function getCanvasXY(e) {
  const canvas = document.getElementById("draw-canvas");
  const rect   = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width  / rect.width),
    y: (e.clientY - rect.top)  * (canvas.height / rect.height),
  };
}

function startDraw(e) {
  drawing = true;
  const { x, y } = getCanvasXY(e);
  lastX = x; lastY = y;
  const canvas = document.getElementById("draw-canvas");
  const ctx    = canvas.getContext("2d");
  // Punto inicial
  ctx.beginPath();
  ctx.arc(x, y, (drawTool === "eraser" ? drawSize * 3 : drawSize) / 2, 0, Math.PI * 2);
  ctx.fillStyle = drawTool === "eraser" ? "rgba(0,0,0,1)" : drawColor;
  if (drawTool === "eraser") ctx.globalCompositeOperation = "destination-out";
  else ctx.globalCompositeOperation = "source-over";
  ctx.fill();
}

function doDraw(e) {
  if (!drawing) return;
  const { x, y } = getCanvasXY(e);
  const canvas   = document.getElementById("draw-canvas");
  const ctx      = canvas.getContext("2d");
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.strokeStyle = drawTool === "eraser" ? "rgba(0,0,0,1)" : drawColor;
  ctx.lineWidth   = drawTool === "eraser" ? drawSize * 3 : drawSize;
  ctx.lineCap     = "round";
  ctx.lineJoin    = "round";
  ctx.globalCompositeOperation = drawTool === "eraser" ? "destination-out" : "source-over";
  ctx.stroke();
  lastX = x; lastY = y;
}

function endDraw() { drawing = false; }

// ─── Adjuntos ─────────────────────────────────────────────────────────────────
function procesarArchivo(file) {
  if (adjuntos.length >= 5) { mostrarToast("Máximo 5 archivos 📎"); return; }
  if (file.size > 10 * 1024 * 1024) { mostrarToast("Archivo muy grande (máx 10 MB)"); return; }

  const reader = new FileReader();
  reader.onload = (ev) => {
    const data = ev.target.result.split(",")[1]; // base64 sin prefijo
    const url  = URL.createObjectURL(file);
    const id   = Date.now() + Math.random();
    adjuntos.push({ id, nombre: file.name, mime_type: file.type, data, url, isImage: file.type.startsWith("image/") });
    renderAdjuntos();
  };
  reader.readAsDataURL(file);
}

function renderAdjuntos() {
  const list   = document.getElementById("attach-list");
  const esDark = document.querySelector(".draw-toolbar")?.classList.contains("dark");
  list.innerHTML = "";
  adjuntos.forEach(adj => {
    const item = document.createElement("div");
    item.className = "attach-item" + (esDark ? " dark" : "");
    if (adj.isImage) {
      const img = document.createElement("img");
      img.src = adj.url;
      img.className = "attach-thumb";
      item.appendChild(img);
    } else {
      const ico = document.createElement("span");
      ico.style.fontSize = "22px";
      ico.textContent = archivoEmoji(adj.nombre);
      item.appendChild(ico);
    }
    const nombre = document.createElement("span");
    nombre.className = "attach-name";
    nombre.textContent = adj.nombre;
    item.appendChild(nombre);

    const rm = document.createElement("button");
    rm.className = "attach-remove";
    rm.textContent = "×";
    rm.addEventListener("click", () => {
      URL.revokeObjectURL(adj.url);
      adjuntos = adjuntos.filter(a => a.id !== adj.id);
      renderAdjuntos();
    });
    item.appendChild(rm);
    list.appendChild(item);
  });
  // Mostrar contador en botón
  document.getElementById("tool-adjunto").textContent = adjuntos.length > 0 ? adjuntos.length : "📎";
}

function archivoEmoji(nombre) {
  const ext = nombre.split(".").pop().toLowerCase();
  const map = { pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊", mp3: "🎵", wav: "🎵", mp4: "🎬", mov: "🎬", zip: "🗜️", rar: "🗜️" };
  return map[ext] || "📎";
}

// ─── Guardar entrada ──────────────────────────────────────────────────────────
async function guardarEntrada() {
  const texto = document.getElementById("entry-text").value.trim();
  if (!texto && modoActual === "write") { mostrarToast("Escribe algo primero ✏️"); return; }

  // Capturar dibujo si existe contenido
  let dibujo = null;
  const drawCanvas = document.getElementById("draw-canvas");
  if (drawCanvas) {
    const ctx  = drawCanvas.getContext("2d");
    const data = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height).data;
    const hasContent = data.some(v => v !== 0);
    if (hasContent) dibujo = drawCanvas.toDataURL("image/png");
  }

  const textoFinal = texto || "(sin texto)";

  const body = {
    texto:    textoFinal,
    humor:    humorSeleccionado,
    dibujo:   dibujo,
    adjuntos: adjuntos.map(({ nombre, mime_type, data }) => ({ nombre, mime_type, data })),
  };

  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) saveBtn.disabled = true;

  try {
    const res = await fetch("/api/entradas", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      mostrarToast("¡Entrada guardada! 🎉");
      setTimeout(() => { window.location.href = "/entradas"; }, 1500);
    } else {
      const err = await res.json().catch(() => ({}));
      mostrarToast("Error al guardar: " + (err.error || res.status));
    }
  } catch (e) {
    mostrarToast("Error de conexión 😕");
  } finally {
    if (saveBtn) saveBtn.disabled = false;
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
