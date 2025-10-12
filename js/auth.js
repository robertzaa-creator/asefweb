// /js/auth.js
// =======================================================
//  Autenticación ASEF (Socios / Admin)
//  Compatible con Vite + Firebase + /pages/socios/ + /pages/admin/
// =======================================================

if (window.__AUTH_JS__) {
  console.warn('[auth.js] Duplicado detectado, se omite segunda carga.');
} else {
  window.__AUTH_JS__ = true;

  (function () {
    // 🔹 Base dinámica según entorno (GitHub Pages / Localhost)
    const ROOT = location.pathname.includes('/asefweb/') ? '/asefweb/' : '/';
    const SOCIOS_PATH = ROOT + 'pages/socios/';
    const ADMIN_PATH = ROOT + 'pages/admin/';

    // 🔹 Espera hasta que Firebase esté disponible
    const waitFirebase = setInterval(() => {
      if (window.firebase && firebase.auth && firebase.firestore) {
        clearInterval(waitFirebase);
        console.log('[auth.js] Firebase detectado, inicializando autenticación...');
        initAuthLogic();
      }
    }, 200);

    // =======================================================
    //  Lógica principal de autenticación
    // =======================================================
    function initAuthLogic() {
      const auth = firebase.auth();
      const db = firebase.firestore();

      const loginBtn = document.getElementById('loginBtn');
      const logoutBtn = document.getElementById('logoutBtn');
      const loginForm = document.getElementById('loginForm');

      // ---------- LOGIN ----------
      if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = e.target.email.value.trim();
          const password = e.target.password.value;

          try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
            const { user } = await auth.signInWithEmailAndPassword(email, password);
            console.log('[auth.js] Sesión iniciada:', user.email);

            const userRef = db.collection('users').doc(user.uid);
            const snap = await userRef.get();

            // Alta o actualización de usuario
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

            // 🔹 Leer el rol y estado
            const data = (await userRef.get()).data() || {};
            const role = data.role || 'member';
            const status = (data.status || 'active').toLowerCase();

            if (status !== 'active') {
              alert('Tu cuenta está bloqueada o inactiva.');
              await auth.signOut();
              return;
            }

            // 🔹 Redirección según rol
            if (role === 'admin') {
              window.location.href = ADMIN_PATH + 'dashboard.html';
            } else {
              window.location.href = SOCIOS_PATH + 'dashboard.html';
            }
          } catch (err) {
            console.error('[auth.js] Error al iniciar sesión:', err);
            alert('Error al iniciar sesión. Verifique sus credenciales.');
          }
        });
      }

      // ---------- LOGOUT ----------
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
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
      auth.onAuthStateChanged(async (user) => {
        const path = location.pathname;
        const isPublic =
          path.endsWith('index.html') ||
          path.endsWith('/') ||
          path.includes('/pages/public/') ||
          path.includes('/pages/servicios.html') ||
          path.includes('/pages/desarrollo.html') ||
          path.includes('/pages/planificacion.html') ||
          path.includes('/pages/funerarias.html') ||
          path.includes('/pages/contacto.html') ||
          path.includes('/pages/links.html') ||
          path.includes('/pages/grupo-panda.html') ||
          path.includes('/pages/prensa.html') ||
          path.includes('/pages/museo.html') ||
          path.includes('/pages/recursos.html');

        if (!user) {
          if (!isPublic) {
            console.warn('[auth.js] Usuario no autenticado → redirigiendo a inicio');
            window.location.href = ROOT + 'index.html';
          }
          return;
        }

        console.info('[auth.js] Sesión activa:', user.email);

        // Actualiza lastLoginAt
        try {
          await db.collection('users').doc(user.uid).update({
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        } catch (err) {
          console.warn('[auth.js] No se pudo actualizar lastLoginAt:', err);
        }

        // Leer rol del usuario
        let role = 'member';
        try {
          const snap = await db.collection('users').doc(user.uid).get();
          if (snap.exists) role = snap.data().role || 'member';
        } catch (err) {
          console.warn('[auth.js] Error leyendo rol del usuario:', err);
        }

        // Si está en página pública → redirigir según rol
        if (isPublic) {
          if (role === 'admin') {
            window.location.href = ADMIN_PATH + 'dashboard.html';
          } else {
            window.location.href = SOCIOS_PATH + 'dashboard.html';
          }
        }

        // Actualiza botón de sesión si existe
        if (loginBtn) {
          loginBtn.textContent = 'Salir';
          loginBtn.onclick = async (e) => {
            e.preventDefault();
            await auth.signOut();
            window.location.href = ROOT + 'index.html';
          };
        }
      });
    }
  })();
}
