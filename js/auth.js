// js/auth.js
// Helper base path: "/" en local, "/asefweb/" en GitHub Pages
function getBasePath() {
  const repo = '/asefweb/'; // <-- NOMBRE DE TU REPO
  return location.pathname.includes(repo) ? repo : '/';
}
function go(path) { window.location.href = getBasePath() + path.replace(/^\//, ''); }

// Authentication Management
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.loginModal = document.getElementById('loginModal');
    this.loginBtn = document.getElementById('loginBtn');
    this.init();
  }

  async init() {
    try {
      await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
    } catch (e) { console.warn('No se pudo setear persistence SESSION:', e); }

    const regLink = document.getElementById('registerLink');
    if (regLink) regLink.addEventListener('click', (e) => {
      e.preventDefault(); this.showNotification('El registro está deshabilitado. Solicite alta al administrador.', 'warning');
    });
    const signupForm = document.getElementById('signupForm');
    if (signupForm) signupForm.addEventListener('submit', (e) => {
      e.preventDefault(); this.showNotification('El registro está deshabilitado. Solicite alta al administrador.', 'warning');
    });

    firebaseAuth.onAuthStateChanged(async (user) => {
      this.currentUser = user;

      if (user) {
        const ok = await this.ensureMemberOrSignOut(user);
        if (!ok) return;

        // auditoría (si members.js no está, usamos fallback)
        try {
          if (window.members?.audit) await window.members.audit('login', user);
          else await this.audit('login', user);
        } catch (_) {}
      } else {
        const protectedPages = [
          '/pages/recursos.html',
          '/pages/socios/dashboard.html',
          '/pages/socios/sections.html',
          '/pages/socios/profile.html'
        ];
        if (protectedPages.some(p => location.pathname.includes(p))) {
          go('index.html');
        }
      }
      this.updateUI();
    });

    this.setupEventListeners();
    this.protectMemberContent();
  }

  setupEventListeners() {
    if (this.loginBtn) {
      this.loginBtn.addEventListener('click', () => {
        if (this.currentUser) this.signOut();
        else this.showLoginModal();
      });
    }

    if (this.loginModal) {
      const closeBtn = this.loginModal.querySelector('.close');
      if (closeBtn) closeBtn.addEventListener('click', () => this.hideLoginModal());
      window.addEventListener('click', (event) => { if (event.target === this.loginModal) this.hideLoginModal(); });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', (e) => { e.preventDefault(); this.signIn(); });

    const registerLink = document.getElementById('registerLink');
    if (registerLink) registerLink.addEventListener('click', (e) => { e.preventDefault(); this.showRegisterForm(); });
    const loginLink = document.getElementById('loginLink');
    if (loginLink) loginLink.addEventListener('click', (e) => { e.preventDefault(); this.showLoginForm(); });

    // Sidebar "Cerrar sesión"
    const logoutSelectors = ['#logoutBtn', '#logoutLink', '#logoutSidebar', 'a[data-action="logout"]', 'button[data-action="logout"]'];
    document.querySelectorAll(logoutSelectors.join(',')).forEach(el => {
      el.addEventListener('click', (e) => { e.preventDefault(); this.signOut(); });
    });

    const sociosLink = document.getElementById('socios-link');
    if (sociosLink) {
      sociosLink.addEventListener('click', (e) => {
        if (!this.currentUser) {
          e.preventDefault();
          this.showLoginModal();
          this.showNotification('Debe iniciar sesión para ingresar al Área de Socios', 'info');
        }
      });
    }
  }

  showLoginModal() { if (!this.loginModal) return; this.loginModal.style.display = 'block'; document.body.style.overflow = 'hidden'; }
  hideLoginModal() { if (!this.loginModal) return; this.loginModal.style.display = 'none'; document.body.style.overflow = 'auto'; this.showLoginForm(); }
  showRegisterForm() { const lf = document.getElementById('loginForm'); const rf = document.getElementById('registerForm'); if (lf && rf) { lf.style.display = 'none'; rf.style.display = 'block'; } }
  showLoginForm() { const lf = document.getElementById('loginForm'); const rf = document.getElementById('registerForm'); if (lf && rf) { lf.style.display = 'block'; rf.style.display = 'none'; } }

  async signIn() {
    const emailEl = document.getElementById('email');
    const passEl  = document.getElementById('password');
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    const email = emailEl ? emailEl.value : ''; const password = passEl ? passEl.value : '';

    try {
      if (submitBtn) { submitBtn.innerHTML = '<span class="loading"></span> Ingresando...'; submitBtn.disabled = true; }
      await firebaseAuth.signInWithEmailAndPassword(email, password);

      if (!(await this.ensureMemberOrSignOut(firebaseAuth.currentUser))) return;

      // Guardar marca de tiempo de login (para KPIs)
      try {
        await firebaseDb.collection('users').doc(firebaseAuth.currentUser.uid).set({
          lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (e) { console.warn('No se pudo actualizar lastLoginAt', e); }

      this.hideLoginModal();
      this.showNotification('¡Bienvenido!', 'success');
      go('pages/socios/dashboard.html');

      if (emailEl) emailEl.value = '';
      if (passEl)  passEl.value  = '';
    } catch (error) {
      console.error('Error signing in:', error);
      this.showNotification(this.getErrorMessage(error.code), 'error');
    } finally {
      if (submitBtn) { submitBtn.innerHTML = 'Ingresar'; submitBtn.disabled = false; }
    }
  }

  async signUp() { this.showNotification('El registro está deshabilitado. Solicite alta al administrador.', 'warning'); }

  async ensureMemberOrSignOut(user) {
    try {
      if (!user) return false;

      const docRef = firebaseDb.collection('users').doc(user.uid);
      let snap = await docRef.get();
      let data = snap.exists ? snap.data() : {};

      const patch = {};
      if (!data.role)   patch.role = 'member';
      if (!data.status) patch.status = 'active';
      if (Object.keys(patch).length) {
        patch.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await docRef.set(patch, { merge: true });
        snap = await docRef.get(); data = snap.data();
      }

      const role   = String(data.role || '').toLowerCase();
      const status = String(data.status || '').toLowerCase();

      if (status === 'blocked') {
        alert('Acceso restringido: su cuenta está bloqueada.');
        await firebaseAuth.signOut();
        go('index.html');
        return false;
      }

      const isMemberAndActive = (role === 'member' || role === 'admin') && status === 'active';
      if (!isMemberAndActive) {
        await firebaseAuth.signOut();
        this.showNotification('Su cuenta no tiene membresía activa o está bloqueada.', 'error');
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error verifying membership:', e);
      await firebaseAuth.signOut();
      this.showNotification('No se pudo verificar la membresía. Intente más tarde o contacte al administrador.', 'error');
      return false;
    }
  }

  async signOut() {
    try {
      const u = firebaseAuth.currentUser;

      // Marcar logout
      try {
        if (u) {
          await firebaseDb.collection('users').doc(u.uid).set({
            lastLogoutAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      } catch (e) { console.warn('No se pudo actualizar lastLogoutAt', e); }

      // Auditoría
      try {
        if (u) {
          if (window.members?.audit) await window.members.audit('logout', u);
          else await this.audit('logout', u);
        }
      } catch (_) {}

      await firebaseAuth.signOut();
      this.showNotification('Sesión cerrada correctamente', 'success');
      go('index.html');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      this.showNotification('Error al cerrar sesión', 'error');
    }
  }

  async audit(type, user) {
    try {
      await firebaseDb.collection('loginEvents').add({
        uid: user.uid,
        email: user.email || '',
        type, ua: navigator.userAgent || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) { console.warn('audit (fallback) fail', e); }
  }

  updateUI() {
    if (!this.loginBtn) return;
    if (this.currentUser) {
      this.loginBtn.innerHTML = '<i class="fas fa-user-check"></i> Salir';
      this.loginBtn.title = `Conectado como: ${this.currentUser.email}`;
    } else {
      this.loginBtn.innerHTML = '<i class="fas fa-user"></i> Acceder';
      this.loginBtn.title = 'Acceder al área de socios';
    }
  }

  protectMemberContent() {
    const resourcesLink = document.getElementById('recursos-link');
    if (resourcesLink) {
      resourcesLink.addEventListener('click', (e) => {
        if (!this.currentUser) {
          e.preventDefault();
          this.showLoginModal();
          this.showNotification('Debe iniciar sesión para acceder a los recursos para socios', 'info');
        }
      });
    }
    this.checkPageAccess();
  }

  checkPageAccess() {
    const protectedPages = [
      '/pages/recursos.html',
      '/pages/socios/dashboard.html',
      '/pages/socios/sections.html',
      '/pages/socios/profile.html'
    ];
    if (protectedPages.some(page => location.pathname.includes(page))) {
      firebaseAuth.onAuthStateChanged(async (user) => {
        if (!user) {
          setTimeout(() => { go('index.html'); }, 500);
          this.showNotification('Debe iniciar sesión para acceder a esta página', 'warning');
        } else {
          const ok = await this.ensureMemberOrSignOut(user);
          if (!ok) setTimeout(() => { go('index.html'); }, 500);
        }
      });
    }
  }

  getErrorMessage(errorCode) {
    const messages = {
      'auth/user-not-found': 'Usuario no encontrado',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/email-already-in-use': 'El email ya está registrado',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
      'auth/invalid-email': 'Email inválido',
      'auth/too-many-requests': 'Demasiados intentos. Intente más tarde',
    };
    return messages[errorCode] || 'Ha ocurrido un error';
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
      </div>
    `;

    if (!document.querySelector('#notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'notification-styles';
      styles.innerHTML = `
        .notification { position: fixed; top: 100px; right: 20px; z-index: 1002; min-width: 300px; padding: 15px 20px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.2); color: white; font-weight: 500; animation: slideInRight 0.3s ease; }
        .notification-success { background: #27ae60; } .notification-error { background: #e74c3c; } .notification-warning { background: #f39c12; } .notification-info { background: #3498db; }
        .notification-content { display: flex; align-items: center; gap: 10px; }
        @keyframes slideInRight { from{opacity:0;transform:translateX(100%);} to{opacity:1;transform:translateX(0);} }
        @media (max-width: 480px) { .notification { right: 10px; left: 10px; min-width: auto; } }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.animation = 'slideInRight 0.3s ease reverse';
      setTimeout(() => { if (notification.parentNode) notification.parentNode.removeChild(notification); }, 300);
    }, 4000);
  }

  isAuthenticated() { return !!this.currentUser; }
  getCurrentUser() { return this.currentUser; }

  async getUserProfile() {
    if (!this.currentUser) return null;
    try {
      const doc = await firebaseDb.collection('users').doc(this.currentUser.uid).get();
      return doc.exists ? doc.data() : null;
    } catch (error) { console.error('Error getting user profile:', error); return null; }
  }
}

document.addEventListener('DOMContentLoaded', () => { window.authManager = new AuthManager(); });
