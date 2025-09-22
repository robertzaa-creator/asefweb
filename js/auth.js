// js/auth.js
// Evita doble carga y fija raíz (local vs GitHub Pages)
const ROOT = location.pathname.includes('/asefweb/') ? '/asefweb/' : '/';

if (window.__AUTH_JS__) {
  console.warn('auth.js already loaded; skipping.');
} else {
  window.__AUTH_JS__ = true;

  (function () {
    class AuthManager {
      constructor() {
        this.currentUser = null;
        this.loginModal = document.getElementById('loginModal'); // existe sólo en index
        this.loginBtn   = document.getElementById('loginBtn');   // botón "Acceder/Salir" del navbar (index)
        this.init();
      }

      async init() {
        // Mantener sesión en la pestaña
        try {
          await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        } catch (e) {
          console.warn('setPersistence warn:', e);
        }

        // Estado de autenticación
        firebaseAuth.onAuthStateChanged(async (user) => {
          this.currentUser = user;
          this.updateUI();
        });

        // ====== NAVBAR (Acceder / Salir) ======
        if (this.loginBtn) {
          this.loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentUser) this.signOut();
            else this.showLoginModal();
          });
        }

        // ====== SIDEBAR (socios) — cerrar sesión si existe ======
        const logoutEl = document.getElementById('logoutBtn');
        if (logoutEl) {
          logoutEl.addEventListener('click', (e) => {
            e.preventDefault();
            this.signOut();
          });
        }

        // ====== FORM LOGIN ======
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
          loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.signIn();
          });
        }

        // ====== MODAL: wiring y bloqueos ======
        if (this.loginModal) {
          // estado accesibilidad por defecto
          this.loginModal.setAttribute('aria-hidden', 'true');

          // Botón X
          const closeBtn = this.loginModal.querySelector('.close');
          if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideLoginModal());
          }

          // 🔒 Bloquear clic en overlay (no cierra, no deja “pasar” el clic)
          this.loginModal.addEventListener('click', (e) => {
            if (e.target === this.loginModal) {
              e.preventDefault();
              e.stopImmediatePropagation();
              e.stopPropagation();
              return false;
            }
          }, true);

          // (Opcional) Bloquear ESC mientras el modal está abierto
          document.addEventListener('keydown', (e) => {
            if (this.loginModal.style.display === 'block' && e.key === 'Escape') {
              e.preventDefault();
              e.stopImmediatePropagation();
            }
          }, true);
        }

        // ====== “Registrarse” → Contacto (CIERRA modal y redirige) ======
        const regLink = document.getElementById('registerLink');
        if (regLink) {
          regLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.loginModal) this.hideLoginModal();
            window.location.href = ROOT + 'pages/contacto.html';
          });
        }

        // Si por algún motivo aparece el form de registro, lo anulamos
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
          signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.showNotification('El registro está deshabilitado. Solicite alta al administrador.', 'warning');
          });
        }
      }

      // ---- Login
      async signIn() {
        const emailEl = document.getElementById('email');
        const passEl  = document.getElementById('password');
        const email   = emailEl ? emailEl.value.trim() : '';
        const password = passEl ? passEl.value : '';

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
            await firebaseDb.collection('users').doc(u.uid).set({
              email: u.email || '',
              lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
          } catch (e) {
            console.warn('patch lastLoginAt warn:', e);
          }

          // Auditoría opcional
          try { window.members?.audit && (await window.members.audit('login', u)); } catch (_) {}

          if (this.loginModal) this.hideLoginModal();
          this.showNotification('¡Bienvenido!', 'success');

          if (emailEl) emailEl.value = '';
          if (passEl)  passEl.value  = '';
        } catch (error) {
          console.error('Error signing in:', error);
          this.showNotification(this.getErrorMessage(error.code), 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Ingresar';
          }
        }
      }

      // ---- Logout
      async signOut() {
        try {
          const u = firebaseAuth.currentUser;
          try { window.members?.audit && u && (await window.members.audit('logout', u)); } catch (_) {}

          await firebaseAuth.signOut();
          this.showNotification('Sesión cerrada correctamente', 'success');

          // Volver a la raíz (funciona en local y en GitHub Pages)
          setTimeout(() => { window.location.href = ROOT; }, 300);
        } catch (error) {
          console.error('Error signing out:', error);
          this.showNotification('Error al cerrar sesión', 'error');
        }
      }

      // ---- UI helpers (mínimos)
      updateUI() {
        // Navbar (index)
        if (this.loginBtn) {
          if (this.currentUser) {
            this.loginBtn.innerHTML = '<i class="fas fa-user-check"></i> Salir';
            this.loginBtn.title = `Conectado como: ${this.currentUser.email}`;
          } else {
            this.loginBtn.innerHTML = '<i class="fas fa-user"></i> Acceder';
            this.loginBtn.title = 'Acceder al área de socios';
          }
        }

        // Footer de las páginas de socios (si existe)
        const emailFoot = document.querySelector('.members-foot #userEmail') || document.getElementById('userEmail');
        if (emailFoot) emailFoot.textContent = this.currentUser?.email ?? '—';
      }

      // ---- Modal show/hide con accesibilidad
      showLoginModal() {
        if (!this.loginModal) return;
        this.loginModal.style.display = 'block';
        this.loginModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
      hideLoginModal() {
        if (!this.loginModal) return;
        this.loginModal.style.display = 'none';
        this.loginModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto';
      }

      // ---- Utilidades
      getErrorMessage(code) {
        const m = {
          'auth/user-not-found': 'Usuario no encontrado',
          'auth/wrong-password': 'Contraseña incorrecta',
          'auth/email-already-in-use': 'El email ya está registrado',
          'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
          'auth/invalid-email': 'Email inválido',
          'auth/too-many-requests': 'Demasiados intentos. Intente más tarde',
        };
        return m[code] || 'Ha ocurrido un error';
      }

      showNotification(message, type = 'info') {
        const n = document.createElement('div');
        n.className = `notification notification-${type}`;
        n.innerHTML = `
          <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
          </div>
        `;
        if (!document.querySelector('#notification-styles')) {
          const s = document.createElement('style');
          s.id = 'notification-styles';
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
          n.style.animation = 'slideInRight .3s ease reverse';
          setTimeout(() => n.remove(), 300);
        }, 4000);
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      window.authManager = new AuthManager();
    });
  })();
}
