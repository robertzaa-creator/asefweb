// Authentication Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.loginModal = document.getElementById('loginModal');
        this.loginBtn = document.getElementById('loginBtn');
        this.init();
    }

    init() {
        // Disable self-registration (keep visuals intact)
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

        // Check authentication state
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
                // bloquear si está en status blocked
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

                // si está en home o index, llevar al dashboard
                const path = location.pathname;
                const isHome = path.endsWith('/index.html') || path === '/' || path === '';
                if (isHome) {
                    window.location.href = '/pages/socios/dashboard.html';
                }
            } else {
                // no logueado → si está en socios, redirigir
                const sociosPages = ['/pages/socios/'];
                if (sociosPages.some(p => location.pathname.includes(p))) {
                    window.location.href = '/index.html';
                }
            }

            this.updateUI();
        });

        // Event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login button
        this.loginBtn.addEventListener('click', () => {
            if (this.currentUser) {
                this.signOut();
            } else {
                this.showLoginModal();
            }
        });

        // Modal close
        const closeBtn = this.loginModal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            this.hideLoginModal();
        });

        // Click outside modal
        window.addEventListener('click', (event) => {
            if (event.target === this.loginModal) {
                this.hideLoginModal();
            }
        });

        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.signIn();
        });

        document.getElementById('signupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.signUp();
        });

        // Toggle forms
        document.getElementById('registerLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        document.getElementById('loginLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Protect member resources
        this.protectMemberContent();
    }

    showLoginModal() {
        this.loginModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hideLoginModal() {
        this.loginModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.showLoginForm();
    }

    showRegisterForm() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    }

    showLoginForm() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    }

    async signIn() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');

        try {
            submitBtn.innerHTML = '<span class="loading"></span> Ingresando...';
            submitBtn.disabled = true;

            const cred = await firebaseAuth.signInWithEmailAndPassword(email, password);

            // Enforce members-only access
            if (!(await this.ensureMemberOrSignOut(firebaseAuth.currentUser))) {
                return;
            }

            this.hideLoginModal();
            this.showNotification('¡Bienvenido!', 'success');

            // Redirigir al dashboard de socios
            window.location.href = '/pages/socios/dashboard.html';

            // Clear form
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';

        } catch (error) {
            console.error('Error signing in:', error);
            this.showNotification(this.getErrorMessage(error.code), 'error');
        } finally {
            submitBtn.innerHTML = 'Ingresar';
            submitBtn.disabled = false;
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
            // auditoría logout
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
        if (this.currentUser) {
            this.loginBtn.innerHTML = '<i class="fas fa-user-check"></i> Salir';
            this.loginBtn.title = `Conectado como: ${this.currentUser.email}`;
        } else {
            this.loginBtn.innerHTML = '<i class="fas fa-user"></i> Acceder';
            this.loginBtn.title = 'Acceder al área de socios';
        }
    }

    protectMemberContent() {
        // Protect resources link
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

        // Check for member-only content on page load
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
                    setTimeout(() => {
                        window.location.href = '/index.html';
                    }, 1000);
                    this.showNotification('Debe iniciar sesión para acceder a esta página', 'warning');
                } else {
                    const ok = await this.ensureMemberOrSignOut(user);
                    if (!ok) {
                        setTimeout(() => {
                            window.location.href = '/index.html';
                        }, 1000);
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
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

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

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
