// Authentication Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.loginModal = document.getElementById('loginModal');
        this.loginBtn = document.getElementById('loginBtn');
        this.init();
    }

    async init() {
        // 🔒 Persistencia: NONE → no guarda sesión
        try {
            await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.NONE);
        } catch (e) {
            console.warn('No se pudo setear persistence NONE:', e);
        }

        // Disable self-registration (mantener visuales)
        const regLink = document.getElementById('registerLink');
        if (regLink) {
            regLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNotification('El registro está deshabilitado. Solicite alta al administrador.', 'warning');
            });
        }
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.showNotification('El registro está deshabilitado. Solicite alta al administrador.', 'warning');
            });
        }

        // Estado de autenticación
        firebaseAuth.onAuthStateChanged(async (user) => {
            this.currentUser = user;

            if (user) {
                // asegurar doc mínimo en Firestore
                const ref = firebaseDb.collection('users').doc(user.uid);
                const snap = await ref.get();
                if (!snap.exists) {
                    await ref.set({
                        uid: user.uid,
                        email: user.email || '',
                        name: user.displayName || '',
                        photoURL: user.photoURL || '',
                        role: 'member',
                        status: 'active',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }

                const profile = (await ref.get()).data();

                // bloqueado
                if (String(profile?.status || '').toLowerCase() === 'blocked') {
                    alert('Acceso restringido: su cuenta está bloqueada.');
                    await firebaseAuth.signOut();
                    window.location.href = '/index.html';
                    return;
                }

                // auditoría login
                if (window.members?.audit) {
                    try { await window.members.audit('login', user); } catch(e){}
                }

            } else {
                // no logueado → si está en socios, redirigir
                const sociosPrefix = '/pages/socios/';
                if (location.pathname.startsWith(sociosPrefix)) {
                    window.location.href = '/index.html';
                }
            }

            this.updateUI();
        });

        this.setupEventListeners();
        this.protectMemberContent();
    }

    setupEventListeners() {
        // Botón login
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', () => {
                if (this.currentUser) {
                    this.signOut();
                } else {
                    this.showLoginModal();
                }
            });
        }

        // Modal close
        if (this.loginModal) {
            const closeBtn = this.loginModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.hideLoginModal();
                });
            }

            window.addEventListener('click', (event) => {
                if (event.target === this.loginModal) {
                    this.hideLoginModal();
                }
            });
        }

        // Forms
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.signIn();
            });
        }

        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.signUp();
            });
        }

        // Toggle
        const registerLink = document.getElementById('registerLink');
        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }
        const loginLink = document.getElementById('loginLink');
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        // (Opcional) Link socios
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

    showLoginModal() {
        if (!this.loginModal) return;
        this.loginModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hideLoginModal() {
        if (!this.loginModal) return;
        this.loginModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.showLoginForm();
    }

    showRegisterForm() {
        const lf = document.getElementById('loginForm');
        const rf = document.getElementById('registerForm');
        if (lf && rf) {
            lf.style.display = 'none';
            rf.style.display = 'block';
        }
    }

    showLoginForm() {
        const lf = document.getElementById('loginForm');
        const rf = document.getElementById('registerForm');
        if (lf && rf) {
            lf.style.display = 'block';
            rf.style.display = 'none';
        }
    }

    async signIn() {
        const emailEl = document.getElementById('email');
        const passEl  = document.getElementById('password');
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');

        const email = emailEl ? emailEl.value : '';
        const password = passEl ? passEl.value : '';

        try {
            if (submitBtn) {
                submitBtn.innerHTML = '<span class="loading"></span> Ingresando...';
                submitBtn.disabled = true;
            }

            await firebaseAuth.signInWithEmailAndPassword(email, password);

            if (!(await this.ensureMemberOrSignOut(firebaseAuth.currentUser))) {
                return;
            }

            this.hideLoginModal();
            this.showNotification('¡Bienvenido!', 'success');

            window.location.href = '/pages/socios/dashboard.html';

            if (emailEl) emailEl.value = '';
            if (passEl)  passEl.value  = '';

        } catch (error) {
            console.error('Error signing in:', error);
            this.showNotification(this.getErrorMessage(error.code), 'error');
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = 'Ingresar';
                submitBtn.disabled = false;
            }
        }
    }

    async signUp() {
        this.showNotification('El registro está deshabilitado. Solicite alta al administrador.', 'warning');
    }

    async ensureMemberOrSignOut(user) {
        try {
            if (!user) return false;
            const docRef = firebaseDb.collection('users').doc(user.uid);
            const snap = await docRef.get();
            const data = snap.exists ? snap.data() : {};
            const role = data?.role ? String(data.role).toLowerCase() : '';
            const status = data?.status ? String(data.status).toLowerCase() : 'active';

            const isMember = snap.exists && (role === 'member' || data.isMember === true);
            if (!isMember || status === 'blocked') {
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
            if (window.members?.audit && u) {
                try { await window.members.audit('logout', u); } catch(e){}
            }
            await firebaseAuth.signOut();
            this.showNotification('Sesión cerrada correctamente', 'success');
            window.location.href = '/index.html';
        } catch (error) {
            console.error('Error signing out:', error);
            this.showNotification('Error al cerrar sesión', 'error');
        }
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
        const currentPage = window.location.pathname;
        const protectedPages = [
            '/pages/recursos.html',
            '/pages/socios/dashboard.html',
            '/pages/socios/sections.html',
            '/pages/socios/profile.html'
        ];

        if (protectedPages.some(page => currentPage.includes(page))) {
            firebaseAuth.onAuthStateChanged(async (user) => {
                if (!user) {
                    setTimeout(() => { window.location.href = '/index.html'; }, 500);
                    this.showNotification('Debe iniciar sesión para acceder a esta página', 'warning');
                } else {
                    const ok = await this.ensureMemberOrSignOut(user);
                    if (!ok) {
                        setTimeout(() => { window.location.href = '/index.html'; }, 500);
                    }
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
                .notification {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    z-index: 1002;
                    min-width: 300px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    color: white;
                    font-weight: 500;
                    animation: slideInRight 0.3s ease;
                }
                .notification-success { background: #27ae60; }
                .notification-error { background: #e74c3c; }
                .notification-warning { background: #f39c12; }
                .notification-info { background: #3498db; }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(100%); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @media (max-width: 480px) {
                    .notification { right: 10px; left: 10px; min-width: auto; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) notification.parentNode.removeChild(notification);
            }, 300);
        }, 4000);
    }

    isAuthenticated() { return !!this.currentUser; }
    getCurrentUser() { return this.currentUser; }

    async getUserProfile() {
        if (!this.currentUser) return null;
        try {
            const doc = await firebaseDb.collection('users').doc(this.currentUser.uid).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }
}

// Inicializar auth al cargar
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
