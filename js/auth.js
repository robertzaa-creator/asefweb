// /js/auth.js
if (window.__AUTH_JS__) {
    console.warn("auth.js already loaded; skipping.");
} else {
    window.__AUTH_JS__ = true;

    (function() {
        const auth = window.firebaseAuth;
        const db = window.firebaseDB;

        if (!auth || !db) {
            console.error("Firebase no inicializado en auth.js");
            return;
        }

        class AuthManager {
            constructor() {
                this.currentUser = null;
                this.loginModal = document.getElementById("loginModal");
                this.loginBtn = document.getElementById("loginBtn");
                this.closeBtn =
                    this.loginModal && this.loginModal.querySelector(".close") ?
                    this.loginModal.querySelector(".close") :
                    null;
                this.loginForm = document.getElementById("loginForm");
                this.registerForm = document.getElementById("registerForm");
                this.registerLink = document.getElementById("registerLink");
                this.loginLink = document.getElementById("loginLink");
                this.signupForm = document.getElementById("signupForm");
                this.init();
            }

            init() {
                // Botón Acceder / Salir
                if (this.loginBtn) {
                    this.loginBtn.addEventListener("click", () => {
                        if (this.currentUser) {
                            this.logout();
                        } else {
                            this.showModal();
                        }
                    });
                }

                // Cerrar modal (X)
                if (this.closeBtn) {
                    this.closeBtn.addEventListener("click", () => this.hideModal());
                }

                // Cambiar a registro
                if (this.registerLink) {
                    this.registerLink.addEventListener("click", (e) => {
                        e.preventDefault();
                        if (this.loginForm) this.loginForm.style.display = "none";
                        if (this.registerForm) this.registerForm.style.display = "block";
                    });
                }

                // Volver a login
                if (this.loginLink) {
                    this.loginLink.addEventListener("click", (e) => {
                        e.preventDefault();
                        if (this.registerForm) this.registerForm.style.display = "none";
                        if (this.loginForm) this.loginForm.style.display = "block";
                    });
                }

                // --- LOGIN ---
                if (this.loginForm) {
                    this.loginForm.addEventListener("submit", async(e) => {
                        e.preventDefault();
                        const email = e.target.email.value.trim();
                        const password = e.target.password.value.trim();

                        try {
                            await auth.setPersistence(
                                firebase.auth.Auth.Persistence.SESSION
                            );
                            const result = await auth.signInWithEmailAndPassword(
                                email,
                                password
                            );
                            const user = result.user;
                            console.log("Inicio de sesión correcto:", user.email);
                            this.hideModal();
                            this.redirectAfterLogin(user);
                        } catch (err) {
                            alert("Error al iniciar sesión: " + err.message);
                        }
                    });
                }

                // --- REGISTRO ---
                if (this.signupForm) {
                    this.signupForm.addEventListener("submit", async(e) => {
                        e.preventDefault();
                        const email = e.target.regEmail.value.trim();
                        const password = e.target.regPassword.value.trim();
                        const companyName = e.target.companyName.value.trim();

                        try {
                            const result = await auth.createUserWithEmailAndPassword(
                                email,
                                password
                            );
                            const user = result.user;

                            await db.collection("users").doc(user.uid).set({
                                uid: user.uid,
                                email: email,
                                name: companyName,
                                role: "member",
                                status: "active",
                                createdAt: new Date(),
                                lastLoginAt: new Date(),
                            });

                            alert("Cuenta creada correctamente. Ya puede iniciar sesión.");
                            if (this.registerForm) this.registerForm.style.display = "none";
                            if (this.loginForm) this.loginForm.style.display = "block";
                        } catch (err) {
                            alert("Error al registrar: " + err.message);
                        }
                    });
                }

                // --- Estado de sesión ---
                auth.onAuthStateChanged(async(user) => {
                    this.currentUser = user;

                    if (user) {
                        console.log("Usuario autenticado:", user.email);
                        if (this.loginBtn) this.loginBtn.textContent = "Salir";

                        try {
                            const userRef = db.collection("users").doc(user.uid);
                            const snap = await userRef.get();
                            if (snap.exists) {
                                const data = snap.data();
                                await userRef.update({ lastLoginAt: new Date() });

                                const path = location.pathname;
                                if (
                                    path.endsWith("index.html") ||
                                    path === "/" ||
                                    path.includes("/asefweb/")
                                ) {
                                    this.redirectAfterLogin(user, data.role);
                                }
                            }
                        } catch (err) {
                            console.error("Error verificando usuario:", err);
                        }
                    } else {
                        console.log("Usuario no autenticado.");
                        if (this.loginBtn) this.loginBtn.textContent = "Acceder";
                    }
                });
            }

            async redirectAfterLogin(user, roleFromDb) {
                try {
                    let role = roleFromDb;
                    if (!role) {
                        const doc = await db.collection("users").doc(user.uid).get();
                        role = doc.exists ? doc.data().role : "member";
                    }

                    console.log("Rol detectado:", role);
                    if (role === "admin") {
                        window.location.href = "/pages/admin/dashboard.html";
                    } else {
                        window.location.href = "/pages/members/dashboard.html";
                    }
                } catch (err) {
                    console.error("Error al redirigir:", err);
                }
            }

            showModal() {
                if (this.loginModal) {
                    this.loginModal.style.display = "flex";
                    this.loginModal.setAttribute("aria-hidden", "false");
                }
            }

            hideModal() {
                if (this.loginModal) {
                    this.loginModal.style.display = "none";
                    this.loginModal.setAttribute("aria-hidden", "true");
                }
            }

            async logout() {
                try {
                    await auth.signOut();
                    console.log("Sesión cerrada correctamente.");
                    window.location.reload();
                } catch (err) {
                    console.error("Error al cerrar sesión:", err);
                }
            }
        }

        window.authManager = new AuthManager();
    })();
}