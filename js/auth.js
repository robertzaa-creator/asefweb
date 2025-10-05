// /js/auth.js
// Mantiene compatibilidad con tu estructura actual (Vite + Firebase + carpeta /pages/socios/)
const ROOT = location.pathname.includes('/asefweb/') ? '/asefweb/' : '/';
const SOCIOS_PATH = ROOT + "pages/socios/";

if (window.__AUTH_JS__) {
    console.warn('auth.js ya cargado; se omite.');
} else {
    window.__AUTH_JS__ = true;

    (function() {
        const auth = firebase.auth();
        const db = firebase.firestore();

        // Elementos (si existen en la página actual)
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const loginForm = document.getElementById('loginForm');

        // ---------- LOGIN ----------
        if (loginForm) {
            loginForm.addEventListener('submit', async(e) => {
                e.preventDefault();
                const email = e.target.email.value.trim();
                const password = e.target.password.value;

                try {
                    // Persistencia por pestaña
                    await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);

                    const { user } = await auth.signInWithEmailAndPassword(email, password);
                    console.log('[auth.js] Sesión iniciada:', user.email);

                    // Alta/actualización básica en Firestore
                    const userRef = db.collection('users').doc(user.uid);
                    const snap = await userRef.get();

                    if (!snap.exists) {
                        await userRef.set({
                            uid: user.uid,
                            email: user.email,
                            name: user.displayName || '',
                            photoURL: user.photoURL || '',
                            role: 'member',
                            status: 'active',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                    } else {
                        await userRef.update({
                            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                    }

                    // Redirige al área de socios
                    window.location.href = SOCIOS_PATH + 'dashboard.html';
                } catch (err) {
                    console.error('[auth.js] Error al iniciar sesión:', err);
                    alert('Error al iniciar sesión. Verifique sus credenciales.');
                }
            });
        }

        // ---------- LOGOUT ----------
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async() => {
                try {
                    await auth.signOut();
                    console.log('[auth.js] Sesión cerrada.');
                    window.location.href = ROOT + 'index.html';
                } catch (err) {
                    console.error('[auth.js] Error al cerrar sesión:', err);
                }
            });
        }

        // ---------- ESTADO DE SESIÓN ----------
        auth.onAuthStateChanged(async(user) => {
            const path = location.pathname;
            const isPublic =
                path.endsWith('index.html') ||
                path.endsWith('/') ||
                path.includes('/pages/public/');

            if (!user) {
                if (!isPublic) {
                    console.warn('[auth.js] Usuario no autenticado, redirigiendo a inicio…');
                    window.location.href = ROOT + 'index.html';
                } else {
                    console.info('[auth.js] Usuario no autenticado (página pública).');
                }
                return;
            }

            console.info('[auth.js] Sesión activa:', user.email);

            // Actualiza último login
            try {
                await db.collection('users').doc(user.uid).update({
                    lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
            } catch (err) {
                console.error('[auth.js] No se pudo actualizar lastLoginAt:', err);
            }

            // Redirige automáticamente si el usuario está en una página pública
            if (isPublic) {
                console.log('[auth.js] Redirigiendo al dashboard de socios…');
                window.location.href = SOCIOS_PATH + 'dashboard.html';
            }

            // Si existe botón de navbar, lo volvemos “Salir”
            if (loginBtn) {
                loginBtn.textContent = 'Salir';
                loginBtn.onclick = async(e) => {
                    e.preventDefault();
                    await auth.signOut();
                    window.location.href = ROOT + 'index.html';
                };
            }
        });
    })();
}