// js/admin.js
// =======================================================
//  Funciones del Panel de Administración ASEF
// =======================================================

if (!window.__ADMIN_JS__) {
  window.__ADMIN_JS__ = true;

  (function () {
    const db = window.firebaseDb;
    const auth = window.firebaseAuth;

    class AdminPanel {
      constructor() {
        this.user = null;
        this.init();
      }

      init() {
        auth.onAuthStateChanged(async (user) => {
          this.user = user;
          if (!user) return;

          // Cargar información de rol
          const snap = await db.collection("users").doc(user.uid).get();
          const data = snap.data();
          const role = data?.role || "member";

          const roleLabel = document.getElementById("adminRole");
          if (roleLabel) roleLabel.textContent = role.toUpperCase();

          // Carga condicional según la página actual
          const path = location.pathname;

          if (path.includes("dashboard.html")) {
            this.loadDashboard();
          } else if (path.includes("users.html")) {
            this.loadUsers();
          } else if (path.includes("sections.html")) {
            this.loadSections();
          }
        });
      }

      // ------------------ DASHBOARD ------------------
      async loadDashboard() {
        console.log("Dashboard cargado correctamente ✅");
      }

      // ------------------ USUARIOS ------------------
      async loadUsers() {
        const tbody = document.getElementById("usersTbody");
        if (!tbody) return;

        try {
          const snap = await db.collection("users").get();

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
              </tr>
            `;
          });
          tbody.innerHTML = html;

          // Eventos de acción (editar/eliminar)
          tbody.querySelectorAll("button[data-action]").forEach((btn) => {
            btn.addEventListener("click", (e) => this.handleUserAction(e));
          });
        } catch (err) {
          console.error("Error al cargar usuarios:", err);
          if (tbody)
            tbody.innerHTML = `<tr><td colspan="5">Error al cargar usuarios</td></tr>`;
        }

        // Recargar manual
        const reloadBtn = document.getElementById("reloadUsers");
        if (reloadBtn) reloadBtn.addEventListener("click", () => this.loadUsers());
      }

      async handleUserAction(e) {
        const btn = e.currentTarget;
        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === "delete") {
          const ok = confirm("¿Eliminar este usuario?");
          if (!ok) return;
          await db.collection("users").doc(id).delete();
          this.showNotification("Usuario eliminado", "success");
          this.loadUsers();
        }

        if (action === "edit") {
          this.showNotification("Función de edición en desarrollo", "info");
        }
      }

      // ------------------ SECCIONES ------------------
      async loadSections() {
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
              </tr>
            `;
          });
          tbody.innerHTML = html;
        } catch (err) {
          console.error("Error al cargar secciones:", err);
          tbody.innerHTML = `<tr><td colspan="3">Error al cargar secciones</td></tr>`;
        }
      }

      // ------------------ NOTIFICACIONES ------------------
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
          </div>
        `;
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 3500);
      }
    }

    document.addEventListener("DOMContentLoaded", () => {
      window.adminPanel = new AdminPanel();
    });
  })();
}
