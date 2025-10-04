// /js/auth.js
// =======================================================
//  Autenticación + redirecciones robustas (ASEF)
// =======================================================

// Detectar entorno y definir ROOT global dinámico
const ROOT =
  window.ROOT ||
  (location.pathname.includes("/asefweb/") ? "/asefweb/" : "/");
const goto = (path = "") =>
  location.assign(ROOT + String(path).replace(/^\/+/, ""));

// Evitar doble carga del script
if (!window.__AUTH_JS__) {
  window.__AUTH_JS__ = true;

  (function () {
    class AuthManager {
      constructor() {
        this.currentUser = null;
        this.loginModal = document.getElementById("loginModal");
        this.loginBtn = document.getElementById("loginBtn");
        this.init();
      }

      async init() {
        // Persistencia
        try {
          await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } catch (e) {
          console.warn("setPersistence warn:", e);
        }

        // Observador de sesión
        firebaseAuth.onAuthStateChanged(async (user) => {
          this.currentUser = user;
          this.updateUI();
          await this.guardProtectedPages(user);
        });

        // Botón login/logout (navbar)
        if (this.loginBtn) {
          this.loginBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (this.currentUser) this.signOut();
            else this.showLoginModal();
          });
        }

        // Formulario login
        const loginForm = document.getElementById("loginForm");
        if (loginForm) {
          loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            this.signIn();
          });
        }

        // Enlace registro → redirigir a contacto
        const registerLink = document.getElementById("registerLink");
        if (registerLink) {
          registerLink.addEventListener("click", (e) => {
            e.preventDefault();
            if (this.loginModal) this.hideLoginModal();
            goto("pages/contacto.html");
          });
        }

        // Botones logout globales
        [
          "#logoutBtn",
          "#logoutLink",
          "#logoutSidebar",
          'a[data-action="logout"]',
          'button[data-action="logout"]',
        ].forEach((sel) => {
          document.querySelectorAll(sel).forEach((el) => {
            el.addEventListener("click", (e) => {
              e.preventDefault();
              this.signOut();
            });
          });
        });
      }

      // ------------------ LOGIN ------------------
      async signIn() {
        const emailEl = document.getElementById("email");
        const passEl = document.getElementById("password");
        const email = emailEl ? emailEl.value.trim() : "";
        const password = passEl ? passEl.value : "";

        const submitBtn = document.querySelector('#loginForm button[type="submit"]');

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading"></span> Ingresando...';
          }

          await firebaseAuth.signInWithEmailAndPassword(email, password);
          const u = firebaseAuth.currentUser;

          // Guardar último ingreso
          try {
            await firebaseDb
              .collection("users")
              .doc(u.uid)
              .set(
                {
                  email: u.email || "",
                  lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
          } catch (e) {
            console.warn("patch lastLoginAt warn:", e);
          }

          if (this.loginModal) this.hideLoginModal();
          if (emailEl) emailEl.value = "";
          if (passEl) passEl.value = "";
          this.showNotification("¡Bienvenido!", "success");

          // Leer rol y redirigir correctamente
          const snap = await firebaseDb.collection("users").doc(u.uid).get();
          const data = snap.data();

          if (data?.role === "admin") {
            goto("pages/admin/dashboard.html");
          } else {
            goto("pages/socios/dashboard.html");
          }
        } catch (error) {
          console.error("Error signing in:", error);
          this.showNotification(this.getErrorMessage(error.code), "error");
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Ingresar";
          }
        }
      }

      // ------------------ LOGOUT ------------------
      async signOut() {
        try {
          await firebaseAuth.signOut();
          this.showNotification("Sesión cerrada correctamente", "success");
          setTimeout(() => goto(""), 400);
        } catch (error) {
          console.error("Error signing out:", error);
          this.showNotification("Error al cerrar sesión", "error");
        }
      }

      // ------------------ GUARDIAS ------------------
      async guardProtectedPages(user) {
        const path = location.pathname;
        const isSocios =
          /\/pages\/socios\//.test(path) || /\/pages\/recursos\.html$/.test(path);
        const isAdmin = /\/pages\/admin\//.test(path);

        if (!user && (isSocios || isAdmin)) {
          this.showNotification(
            "Debe iniciar sesión para acceder a esta página",
            "warning"
          );
          setTimeout(() => goto(""), 600);
          return;
        }

        if (user && (isSocios || isAdmin)) {
          try {
            const snap = await firebaseDb.collection("users").doc(user.uid).get();
            const data = snap.data();

            // Socio en admin
            if (isAdmin && data?.role !== "admin") {
              this.showNotification(
                "Acceso restringido: solo administradores",
                "error"
              );
              setTimeout(() => goto("pages/socios/dashboard.html"), 800);
            }

            // Admin en socios → opcional
            if (isSocios && data?.role === "admin") {
              this.showNotification(
                "Redirigiendo al panel de administración",
                "info"
              );
              setTimeout(() => goto("pages/admin/dashboard.html"), 800);
            }
          } catch (e) {
            console.warn("Guard check error:", e);
          }
        }
      }

      // ------------------ UI ------------------
      updateUI() {
        if (this.loginBtn) {
          if (this.currentUser) {
            this.loginBtn.innerHTML = '<i class="fas fa-user-check"></i> Salir';
            this.loginBtn.title = `Conectado como: ${this.currentUser.email}`;
          } else {
            this.loginBtn.innerHTML = '<i class="fas fa-user"></i> Acceder';
            this.loginBtn.title = "Acceder al área de socios";
          }
        }

        const emailFoot =
          document.querySelector(".members-foot #userEmail") ||
          document.getElementById("userEmail");
        if (emailFoot)
          emailFoot.textContent = this.currentUser?.email ?? "—";
      }

      // ------------------ Modal ------------------
      showLoginModal() {
        if (!this.loginModal) return;
        this.loginModal.style.display = "block";
        document.body.style.overflow = "hidden";
      }
      hideLoginModal() {
        if (!this.loginModal) return;
        this.loginModal.style.display = "none";
        document.body.style.overflow = "auto";
      }

      // ------------------ Utils ------------------
      getErrorMessage(code) {
        const m = {
          "auth/user-not-found": "Usuario no encontrado",
          "auth/wrong-password": "Contraseña incorrecta",
          "auth/email-already-in-use": "El email ya está registrado",
          "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
          "auth/invalid-email": "Email inválido",
          "auth/too-many-requests": "Demasiados intentos. Intente más tarde",
        };
        return m[code] || "Ha ocurrido un error";
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
          </div>
        `;
        if (!document.querySelector("#notification-styles")) {
          const s = document.createElement("style");
          s.id = "notification-styles";
          s.innerHTML = `
            .notification{position:fixed;top:100px;right:20px;z-index:1002;min-width:300px;padding:15px 20px;border-radius:8px;box-shadow:0 5px 15px rgba(0,0,0,.2);color:#fff;font-weight:500;animation:slideInRight .3s ease}
            .notification-success{background:#27ae60}.notification-error{background:#e74c3c}.notification-warning{background:#f39c12}.notification-info{background:#3498db}
            .notification-content{display:flex;align-items:center;gap:10px}
            @keyframes slideInRight{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
            @media(max-width:480px){.notification{right:10px;left:10px;min-width:auto}}
          `;
          document.head.appendChild(s);
        }
        document.body.appendChild(n);
        setTimeout(() => {
          n.style.animation = "slideInRight .3s ease reverse";
          setTimeout(() => n.remove(), 300);
        }, 4000);
      }
    }

    document.addEventListener("DOMContentLoaded", () => {
      window.authManager = new AuthManager();
    });
  })();
}
