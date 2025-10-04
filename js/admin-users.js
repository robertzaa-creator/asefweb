// js/admin-users.js
// =======================================================
//  Módulo: Gestión de Usuarios (Panel Admin ASEF)
// =======================================================

if (!window.__ADMIN_USERS_JS__) {
  window.__ADMIN_USERS_JS__ = true;

  (function () {
    const db = window.firebaseDb;
    const auth = window.firebaseAuth;

    class AdminUsers {
      constructor() {
        this.tbody = document.getElementById("usersTbody");
        this.form = document.getElementById("formInvite");
        this.result = document.getElementById("inviteResult");
        this.search = document.getElementById("userSearch");
        this.reload = document.getElementById("reloadUsers");
        this.users = [];
        this.init();
      }

      // ================== INIT ==================
      async init() {
        if (!db) return console.error("Firestore no inicializado.");
        await this.loadUsers();

        // Recargar lista
        this.reload?.addEventListener("click", () => this.loadUsers());
        // Buscar usuario
        this.search?.addEventListener("input", (e) => this.filterUsers(e));
        // Invitar usuario
        this.form?.addEventListener("submit", (e) => this.inviteUser(e));
      }

      // ================== CARGAR USUARIOS ==================
      async loadUsers() {
        if (!this.tbody) return;
        this.tbody.innerHTML =
          '<tr><td colspan="5" style="text-align:center;padding:15px">Cargando...</td></tr>';

        try {
          const snap = await db.collection("users").orderBy("email").get();
          if (snap.empty) {
            this.tbody.innerHTML =
              '<tr><td colspan="5">No hay usuarios registrados.</td></tr>';
            return;
          }

          this.users = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          this.renderTable(this.users);
        } catch (e) {
          console.error("Error al cargar usuarios:", e);
          this.tbody.innerHTML =
            '<tr><td colspan="5">Error al cargar usuarios.</td></tr>';
        }
      }

      // ================== RENDER TABLA ==================
      renderTable(list) {
        this.tbody.innerHTML = list
          .map((u) => {
            const status = u.status || "activo";
            const role = u.role || "member";
            const lastLogin = u.lastLoginAt
              ? u.lastLoginAt.toDate
                ? u.lastLoginAt.toDate().toLocaleString("es-AR")
                : u.lastLoginAt
              : "—";

            return `
            <tr data-id="${u.id}">
              <td>${u.name || "—"}</td>
              <td>${u.email || "—"}</td>
              <td>
                <span class="chip ${
                  status === "activo" ? "chip-green" : "chip-gray"
                }">${status}</span>
              </td>
              <td>${role === "admin" ? "Administrador" : "Miembro"}</td>
              <td class="actions">
                <button class="btn sm" data-action="toggle" title="Cambiar estado">
                  <i class="fa-solid fa-power-off"></i>
                </button>
                <button class="btn sm" data-action="role" title="Cambiar rol">
                  <i class="fa-solid fa-user-gear"></i>
                </button>
                <button class="btn sm danger" data-action="delete" title="Eliminar">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            </tr>`;
          })
          .join("");

        // Asignar eventos a botones
        this.tbody.querySelectorAll("button").forEach((btn) =>
          btn.addEventListener("click", (e) => this.handleAction(e))
        );
      }

      // ================== FILTRAR USUARIOS ==================
      filterUsers(e) {
        const q = e.target.value.toLowerCase();
        const filtered = this.users.filter(
          (u) =>
            u.email?.toLowerCase().includes(q) ||
            u.name?.toLowerCase().includes(q)
        );
        this.renderTable(filtered);
      }

      // ================== INVITAR NUEVO USUARIO ==================
      async inviteUser(e) {
        e.preventDefault();
        const formData = new FormData(this.form);
        const name = formData.get("name").trim();
        const email = formData.get("email").trim();
        const role = formData.get("role");

        if (!name || !email) return;

        try {
          await db.collection("users").add({
            name,
            email,
            role,
            status: "activo",
            invitedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          this.result.innerHTML = `<div class="msg success">Invitación creada para ${email}</div>`;
          this.form.reset();
          this.loadUsers();
        } catch (error) {
          console.error("Error al invitar usuario:", error);
          this.result.innerHTML = `<div class="msg error">Error al crear invitación</div>`;
        }
      }

      // ================== ACCIONES (toggle/role/delete) ==================
      async handleAction(e) {
        const btn = e.currentTarget;
        const tr = btn.closest("tr");
        const id = tr?.dataset.id;
        const action = btn.dataset.action;
        if (!id) return;

        const ref = db.collection("users").doc(id);
        const doc = await ref.get();
        const user = doc.data();

        switch (action) {
          case "toggle":
            const newStatus = user.status === "activo" ? "suspendido" : "activo";
            await ref.update({ status: newStatus });
            this.loadUsers();
            break;
          case "role":
            const newRole = user.role === "admin" ? "member" : "admin";
            await ref.update({ role: newRole });
            this.loadUsers();
            break;
          case "delete":
            if (confirm(`¿Eliminar usuario ${user.email}?`)) {
              await ref.delete();
              this.loadUsers();
            }
            break;
        }
      }
    }

    // Inicializar módulo
    document.addEventListener("DOMContentLoaded", () => {
      window.adminUsers = new AdminUsers();
    });
  })();
}
