// /js/admin.js

// =======================================================

//  Funciones del Panel de Administración ASEF

// =======================================================



if (!window.__ADMIN_JS__) {

    window.__ADMIN_JS__ = true;



    (function() {

        async function waitForFirebase() {
            let retries = 20;
            while ((!window.firebaseDb || !window.firebaseAuth) && retries > 0) {
                await new Promise(r => setTimeout(r, 200));
                retries--;
            }
            if (!window.firebaseDb) throw new Error("Firestore no inicializado");
            return {
                db: window.firebaseDb,
                auth: window.firebaseAuth
            };
        }



        class AdminPanel {

            constructor() {

                this.user = null;

                this.db = null;

                this.auth = null;

                this.init();

            }



            async init() {

                try {

                    const { db, auth } = await waitForFirebase();

                    this.db = db;

                    this.auth = auth;

                    console.log("[admin.js] ✅ Firebase listo para AdminPanel.");



                    auth.onAuthStateChanged(async(user) => {

                        this.user = user;

                        if (!user) return;



                        try {

                            const snap = await db.collection("users").doc(user.uid).get();

                            const data = snap.data();

                            const role = data ? .role || "member"; // ✅ limpio



                            const roleLabel = document.getElementById("adminRole");

                            if (roleLabel) roleLabel.textContent = role.toUpperCase();



                            const path = location.pathname;

                            if (path.includes("dashboard.html")) {

                                this.loadDashboard();

                            } else if (path.includes("users.html")) {

                                this.loadUsers();

                            } else if (path.includes("sections.html")) {

                                this.loadSections();

                            } else if (path.includes("documents.html")) {

                                this.loadDocuments();

                            } else if (path.includes("news.html")) {

                                this.loadNews();

                            }

                        } catch (err) {

                            console.error("[admin.js] Error leyendo datos del usuario:", err);

                        }

                    });

                } catch (err) {

                    console.error("[admin.js] ❌ Error inicializando AdminPanel:", err);

                }

            }



            async loadDashboard() {

                console.log("[admin.js] Dashboard cargado correctamente ✅");

            }



            async loadUsers() {

                const db = this.db;

                const tbody = document.getElementById("usersTbody");

                if (!tbody) return;



                try {

                    const snap = await db.collection("users").orderBy("createdAt", "desc").get();

                    if (snap.empty) {

                        tbody.innerHTML = `<tr><td colspan="5">No hay usuarios registrados</td></tr>`;

                        return;

                    }



                    let html = "";

                    snap.forEach((doc) => {

                        const u = doc.data();

                        html += `

              <tr>

                <td>${u.name || "-"}</td>

                <td>${u.email || "-"}</td>

                <td>${u.status || "Activo"}</td>

                <td>${u.role || "Miembro"}</td>

                <td>

                  <button class="btn sm" data-id="${doc.id}" data-action="edit">

                    <i class="fa-regular fa-pen-to-square"></i>

                  </button>

                  <button class="btn sm danger" data-id="${doc.id}" data-action="delete">

                    <i class="fa-regular fa-trash-can"></i>

                  </button>

                </td>

              </tr>`;

                    });

                    tbody.innerHTML = html;



                    tbody.querySelectorAll("button[data-action]").forEach((btn) => {

                        btn.addEventListener("click", (e) => this.handleUserAction(e));

                    });

                } catch (err) {

                    console.error("[admin.js] Error al cargar usuarios:", err);

                    tbody.innerHTML = `<tr><td colspan="5">Error al cargar usuarios</td></tr>`;

                }



                const reloadBtn = document.getElementById("reloadUsers");

                reloadBtn ? .addEventListener("click", () => this.loadUsers()); // ✅ limpio

            }



            async handleUserAction(e) {

                const btn = e.currentTarget;

                const id = btn.dataset.id;

                const action = btn.dataset.action;

                const db = this.db;



                if (action === "delete") {

                    const ok = confirm("¿Eliminar este usuario?");

                    if (!ok) return;

                    try {

                        await db.collection("users").doc(id).delete();

                        this.showNotification("Usuario eliminado correctamente.", "success");

                        this.loadUsers();

                    } catch (err) {

                        console.error("Error eliminando usuario:", err);

                        this.showNotification("Error al eliminar usuario.", "error");

                    }

                }



                if (action === "edit") {

                    this.showNotification("Funcionalidad de edición en desarrollo.", "info");

                }

            }



            async loadSections() {

                const db = this.db;

                const tbody = document.getElementById("sectionsTbody");

                if (!tbody) return;



                try {

                    const snap = await db.collection("sections").get();

                    if (snap.empty) {

                        tbody.innerHTML = `<tr><td colspan="3">No hay secciones creadas</td></tr>`;

                        return;

                    }



                    let html = "";

                    snap.forEach((doc) => {

                        const s = doc.data();

                        html += `

              <tr>

                <td>${s.name || "-"}</td>

                <td>${s.description || "-"}</td>

                <td>${s.visible ? "Visible" : "Oculta"}</td>

              </tr>`;

                    });

                    tbody.innerHTML = html;

                } catch (err) {

                    console.error("[admin.js] Error al cargar secciones:", err);

                    tbody.innerHTML = `<tr><td colspan="3">Error al cargar secciones</td></tr>`;

                }

            }



            async loadDocuments() {

                console.log("[admin.js] Documentos: módulo en preparación 📄");

            }



            async loadNews() {

                console.log("[admin.js] Noticias: módulo en preparación 📰");

            }



            showNotification(message, type = "info") {

                const n = document.createElement("div");

                n.className = `notification notification-${type}`;

                n.innerHTML = `

          <div class="notification-content">

            <i class="fas fa-${

              type === "success"

                ? "check-circle"

                : type === "error"

                ? "exclamation-circle"

                : type === "warning"

                ? "exclamation-triangle"

                : "info-circle"

            }"></i>

            <span>${message}</span>

          </div>`;

                document.body.appendChild(n);

                setTimeout(() => n.remove(), 3500);

            }

        }



        document.addEventListener("DOMContentLoaded", () => {

            window.adminPanel = new AdminPanel();

        });

    })();

}