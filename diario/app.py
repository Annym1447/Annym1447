from flask import Flask, request, jsonify, render_template, session, send_from_directory
from datetime import datetime
import sqlite3, os, hashlib, secrets, base64
 
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))
 
DB_PATH      = os.environ.get("DB_PATH", "moodsketch.db")
UPLOADS_DIR  = os.environ.get("UPLOADS_DIR", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB
 
# ─── Base de datos ────────────────────────────────────────────────────────────
 
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn
 
def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS usuarios (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre            TEXT    NOT NULL,
                email             TEXT    NOT NULL UNIQUE,
                password_hash     TEXT    NOT NULL,
                avatar_emoji      TEXT    NOT NULL DEFAULT '😊',
                bio               TEXT    DEFAULT '',
                codigo_invitacion TEXT    UNIQUE,
                creado_en         TEXT    NOT NULL DEFAULT (datetime('now'))
            );
 
            CREATE TABLE IF NOT EXISTS amigos (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                amigo_id   INTEGER NOT NULL,
                creado_en  TEXT    NOT NULL DEFAULT (datetime('now')),
                UNIQUE(usuario_id, amigo_id),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (amigo_id)   REFERENCES usuarios(id) ON DELETE CASCADE
            );
 
            CREATE TABLE IF NOT EXISTS entradas (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER,
                texto      TEXT    NOT NULL,
                humor      TEXT,
                dibujo     TEXT,
                fecha      TEXT    NOT NULL,
                hora       TEXT    NOT NULL,
                creado_en  TEXT    NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
            );
 
            CREATE TABLE IF NOT EXISTS adjuntos (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                entrada_id INTEGER NOT NULL,
                nombre     TEXT    NOT NULL,
                mime_type  TEXT    NOT NULL,
                ruta       TEXT    NOT NULL,
                creado_en  TEXT    NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (entrada_id) REFERENCES entradas(id) ON DELETE CASCADE
            );
        """)
 
init_db()
# Migración: añadir columna y tabla si no existen (DB ya creada antes del deploy)
def migrate_db():
    with get_db() as conn:
        cols = [r[1] for r in conn.execute("PRAGMA table_info(usuarios)").fetchall()]
        if "codigo_invitacion" not in cols:
            conn.execute("ALTER TABLE usuarios ADD COLUMN codigo_invitacion TEXT")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS amigos (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                amigo_id   INTEGER NOT NULL,
                creado_en  TEXT    NOT NULL DEFAULT (datetime('now')),
                UNIQUE(usuario_id, amigo_id),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (amigo_id)   REFERENCES usuarios(id) ON DELETE CASCADE
            )
        """)
 
migrate_db()
 
def generar_codigo(usuario_id: int) -> str:
    """Genera o recupera el código de invitación único del usuario."""
    with get_db() as conn:
        row = conn.execute("SELECT codigo_invitacion FROM usuarios WHERE id=?", (usuario_id,)).fetchone()
        if row and row["codigo_invitacion"]:
            return row["codigo_invitacion"]
        # Generar código único de 8 chars alfanuméricos en mayúscula
        while True:
            codigo = secrets.token_hex(4).upper()
            existe = conn.execute("SELECT id FROM usuarios WHERE codigo_invitacion=?", (codigo,)).fetchone()
            if not existe:
                conn.execute("UPDATE usuarios SET codigo_invitacion=? WHERE id=?", (codigo, usuario_id))
                return codigo
 
 
# ─── Utilidades ───────────────────────────────────────────────────────────────
 
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000)
    return f"{salt}${h.hex()}"
 
def verify_password(password: str, stored: str) -> bool:
    try:
        salt, h = stored.split("$")
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000)
        return secrets.compare_digest(candidate.hex(), h)
    except Exception:
        return False
 
def current_user():
    return session.get("user")
 
def row_to_dict(row):
    return dict(row) if row else None
 
 
# ─── Páginas HTML ─────────────────────────────────────────────────────────────
 
@app.route("/")
def inicio():
    return render_template("inicio.html")
 
@app.route("/nueva")
def nueva_entrada():
    return render_template("editor.html")
 
@app.route("/entradas")
def ver_entradas():
    return render_template("entradas.html")
 
 
# ─── Auth API ─────────────────────────────────────────────────────────────────
 
@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    user = current_user()
    return jsonify({"user": user})
 
 
@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data   = request.get_json() or {}
    nombre = data.get("nombre", "").strip()
    email  = data.get("email",  "").strip().lower()
    pwd    = data.get("password", "")
    avatar = data.get("avatar_emoji", "😊")
 
    if not nombre or not email or not pwd:
        return jsonify({"error": "Todos los campos son obligatorios"}), 400
    if len(pwd) < 6:
        return jsonify({"error": "La contraseña debe tener al menos 6 caracteres"}), 400
    if "@" not in email:
        return jsonify({"error": "El correo no es válido"}), 400
 
    try:
        with get_db() as conn:
            existing = conn.execute("SELECT id FROM usuarios WHERE email = ?", (email,)).fetchone()
            if existing:
                return jsonify({"error": "Este correo ya está registrado"}), 409
 
            conn.execute(
                "INSERT INTO usuarios (nombre, email, password_hash, avatar_emoji) VALUES (?,?,?,?)",
                (nombre, email, hash_password(pwd), avatar)
            )
            row = conn.execute("SELECT * FROM usuarios WHERE email = ?", (email,)).fetchone()
            user = {"id": row["id"], "nombre": row["nombre"], "email": row["email"],
                    "avatar_emoji": row["avatar_emoji"], "bio": row["bio"] or ""}
            session["user"] = user
            return jsonify({"ok": True, "user": user}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
 
@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data  = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    pwd   = data.get("password", "")
 
    if not email or not pwd:
        return jsonify({"error": "Correo y contraseña son obligatorios"}), 400
 
    with get_db() as conn:
        row = conn.execute("SELECT * FROM usuarios WHERE email = ?", (email,)).fetchone()
 
    if not row or not verify_password(pwd, row["password_hash"]):
        return jsonify({"error": "Correo o contraseña incorrectos"}), 401
 
    user = {"id": row["id"], "nombre": row["nombre"], "email": row["email"],
            "avatar_emoji": row["avatar_emoji"], "bio": row["bio"] or ""}
    session["user"] = user
    return jsonify({"ok": True, "user": user})
 
 
@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    session.clear()
    return jsonify({"ok": True})
 
 
@app.route("/api/auth/profile", methods=["POST"])
def auth_profile():
    user = current_user()
    if not user:
        return jsonify({"error": "No autenticado"}), 401
 
    data   = request.get_json() or {}
    nombre = data.get("nombre", user["nombre"]).strip()
    bio    = data.get("bio", "").strip()
    avatar = data.get("avatar_emoji", user["avatar_emoji"])
 
    if not nombre:
        return jsonify({"error": "El nombre no puede estar vacío"}), 400
 
    with get_db() as conn:
        conn.execute(
            "UPDATE usuarios SET nombre=?, bio=?, avatar_emoji=? WHERE id=?",
            (nombre, bio, avatar, user["id"])
        )
 
    session["user"].update({"nombre": nombre, "bio": bio, "avatar_emoji": avatar})
    return jsonify({"ok": True, "user": session["user"]})
 
 
# ─── Entradas API ─────────────────────────────────────────────────────────────
 
@app.route("/api/entradas", methods=["GET"])
def listar_entradas():
    user   = current_user()
    humor  = request.args.get("humor",  "")
    buscar = request.args.get("buscar", "")
 
    query  = "SELECT * FROM entradas WHERE 1=1"
    params = []
 
    # Si hay sesión, solo las entradas del usuario
    if user:
        query += " AND usuario_id = ?"
        params.append(user["id"])
 
    if humor:
        query += " AND humor = ?"
        params.append(humor)
 
    if buscar:
        query += " AND texto LIKE ?"
        params.append(f"%{buscar}%")
 
    query += " ORDER BY creado_en DESC"
 
    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
 
    return jsonify([dict(r) for r in rows])
 
 
@app.route("/api/entradas", methods=["POST"])
def crear_entrada():
    user  = current_user()
    datos = request.get_json() or {}
    texto = datos.get("texto", "").strip()
 
    if not texto:
        return jsonify({"error": "El texto no puede estar vacío"}), 400
 
    ahora  = datetime.now()
    uid    = user["id"] if user else None
    dibujo = datos.get("dibujo")  # base64 PNG or None
 
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO entradas (usuario_id, texto, humor, dibujo, fecha, hora) VALUES (?,?,?,?,?,?)",
            (uid, texto, datos.get("humor"), dibujo,
             ahora.strftime("%d/%m/%Y"), ahora.strftime("%H:%M"))
        )
        entrada_id = cursor.lastrowid
 
        # Guardar adjuntos
        for adj in datos.get("adjuntos", []):
            nombre    = adj.get("nombre", "archivo")
            mime_type = adj.get("mime_type", "application/octet-stream")
            data_b64  = adj.get("data", "")
            # Guardar en disco
            ext   = nombre.rsplit(".", 1)[-1] if "." in nombre else "bin"
            fname = f"{secrets.token_hex(12)}.{ext}"
            fpath = os.path.join(UPLOADS_DIR, fname)
            with open(fpath, "wb") as f:
                f.write(base64.b64decode(data_b64))
            conn.execute(
                "INSERT INTO adjuntos (entrada_id, nombre, mime_type, ruta) VALUES (?,?,?,?)",
                (entrada_id, nombre, mime_type, fname)
            )
 
        row = conn.execute("SELECT * FROM entradas WHERE id = ?", (entrada_id,)).fetchone()
 
    return jsonify(dict(row)), 201
 
 
@app.route("/api/adjuntos/<path:fname>")
def servir_adjunto(fname):
    return send_from_directory(UPLOADS_DIR, fname)
 
 
@app.route("/api/entradas/<int:entrada_id>", methods=["DELETE"])
def eliminar_entrada(entrada_id):
    user = current_user()
    with get_db() as conn:
        if user:
            conn.execute("DELETE FROM entradas WHERE id=? AND usuario_id=?", (entrada_id, user["id"]))
        else:
            conn.execute("DELETE FROM entradas WHERE id=?", (entrada_id,))
    return jsonify({"ok": True})
 
 
@app.route("/api/stats", methods=["GET"])
def estadisticas():
    user = current_user()
    with get_db() as conn:
        if user:
            rows = conn.execute(
                "SELECT humor, fecha FROM entradas WHERE usuario_id=?", (user["id"],)
            ).fetchall()
        else:
            rows = conn.execute("SELECT humor, fecha FROM entradas").fetchall()
 
    total = len(rows)
    dias  = len(set(r["fecha"] for r in rows))
    conteo = {}
    for r in rows:
        if r["humor"]:
            conteo[r["humor"]] = conteo.get(r["humor"], 0) + 1
    humor_top = max(conteo, key=conteo.get) if conteo else None
 
    return jsonify({"total": total, "dias": dias, "humor_top": humor_top})
 
 
 
# ─── Página amigos ────────────────────────────────────────────────────────────
 
@app.route("/amigos")
def pagina_amigos():
    return render_template("amigos.html")
 
 
# ─── Amigos API ───────────────────────────────────────────────────────────────
 
@app.route("/api/amigos/mi_codigo", methods=["GET"])
def amigos_mi_codigo():
    user = current_user()
    if not user:
        return jsonify({"error": "No autenticado"}), 401
    codigo = generar_codigo(user["id"])
    return jsonify({"codigo": codigo})
 
 
@app.route("/api/amigos/aceptar", methods=["POST"])
def amigos_aceptar():
    user = current_user()
    if not user:
        return jsonify({"error": "No autenticado"}), 401
 
    data   = request.get_json() or {}
    codigo = data.get("codigo", "").strip().upper()
    if not codigo:
        return jsonify({"error": "Código requerido"}), 400
 
    with get_db() as conn:
        destino = conn.execute(
            "SELECT id, nombre, avatar_emoji, bio FROM usuarios WHERE codigo_invitacion=?", (codigo,)
        ).fetchone()
        if not destino:
            return jsonify({"error": "Código inválido o no encontrado"}), 404
        if destino["id"] == user["id"]:
            return jsonify({"error": "No puedes agregarte a ti mismo 😅"}), 400
 
        ya_amigo = conn.execute(
            "SELECT id FROM amigos WHERE usuario_id=? AND amigo_id=?", (user["id"], destino["id"])
        ).fetchone()
        if ya_amigo:
            return jsonify({"error": "Ya son amigos 🤝"}), 409
 
        # Relación bidireccional
        conn.execute("INSERT OR IGNORE INTO amigos (usuario_id, amigo_id) VALUES (?,?)", (user["id"], destino["id"]))
        conn.execute("INSERT OR IGNORE INTO amigos (usuario_id, amigo_id) VALUES (?,?)", (destino["id"], user["id"]))
 
    return jsonify({"ok": True, "amigo": {
        "id": destino["id"],
        "nombre": destino["nombre"],
        "avatar_emoji": destino["avatar_emoji"] or "😊",
    }})
 
 
@app.route("/api/amigos/listar", methods=["GET"])
def amigos_listar():
    user = current_user()
    if not user:
        return jsonify({"error": "No autenticado"}), 401
 
    with get_db() as conn:
        rows = conn.execute("""
            SELECT u.id, u.nombre, u.avatar_emoji, u.bio, a.creado_en
            FROM amigos a
            JOIN usuarios u ON u.id = a.amigo_id
            WHERE a.usuario_id = ?
            ORDER BY a.creado_en DESC
        """, (user["id"],)).fetchall()
 
    return jsonify({"amigos": [dict(r) for r in rows]})
 
 
@app.route("/api/amigos/eliminar", methods=["POST"])
def amigos_eliminar():
    user = current_user()
    if not user:
        return jsonify({"error": "No autenticado"}), 401
 
    data     = request.get_json() or {}
    amigo_id = data.get("amigo_id")
    if not amigo_id:
        return jsonify({"error": "amigo_id requerido"}), 400
 
    with get_db() as conn:
        conn.execute("DELETE FROM amigos WHERE usuario_id=? AND amigo_id=?", (user["id"], amigo_id))
        conn.execute("DELETE FROM amigos WHERE usuario_id=? AND amigo_id=?", (amigo_id, user["id"]))
 
    return jsonify({"ok": True})
 
 
@app.route("/api/amigos/<int:amigo_id>/entradas", methods=["GET"])
def amigos_entradas(amigo_id):
    user = current_user()
    if not user:
        return jsonify({"error": "No autenticado"}), 401
 
    with get_db() as conn:
        # Verificar que realmente son amigos
        es_amigo = conn.execute(
            "SELECT id FROM amigos WHERE usuario_id=? AND amigo_id=?", (user["id"], amigo_id)
        ).fetchone()
        if not es_amigo:
            return jsonify({"error": "No son amigos"}), 403
 
        rows = conn.execute(
            "SELECT id, texto, humor, dibujo, fecha, hora, creado_en FROM entradas WHERE usuario_id=? ORDER BY creado_en DESC",
            (amigo_id,)
        ).fetchall()
 
    return jsonify({"entradas": [dict(r) for r in rows]})
 
# ─── Arranque ─────────────────────────────────────────────────────────────────
 
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
