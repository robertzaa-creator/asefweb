// /js/members.js
if (window.__MEMBERS_JS__) {
    console.warn('members.js already loaded; skipping.');
} else {
    window.__MEMBERS_JS__ = true;

    (function() {
        const db = window.firebaseDB || firebase.firestore();
        const auth = window.firebaseAuth || firebase.auth();

        // ===== helpers =====
        function setText(id, v) {
            const el = document.getElementById(id);
            if (el) el.textContent = v;
        }

        function fmt(ts) {
            if (!ts) return '—';
            const d = ts.toDate ? ts.toDate() : new Date(ts);
            return d.toLocaleString('es-AR');
        }

        // ===== Espera sesión activa =====
        async function waitForAuth() {
            return new Promise((resolve) => {
                const unsub = auth.onAuthStateChanged(function(user) {
                    if (user) {
                        unsub();
                        resolve(user);
                    }
                });
            });
        }

        // ===== normalización mínima de perfil =====
        async function normalizeUserProfile(user) {
            const ref = db.collection('users').doc(user.uid);
            const snap = await ref.get();
            const patch = { email: user.email || '' };
            if (!snap.exists) patch.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await ref.set(patch, { merge: true });
        }

        // ===== auditoría =====
        async function audit(eventType, user) {
            try {
                await db.collection('loginEvents').add({
                    uid: user.uid,
                    email: user.email || '',
                    type: eventType,
                    ua: navigator.userAgent || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
            } catch (e) {
                console.warn('audit fail', e);
            }
        }

        // ===== dashboard KPIs =====
        async function kpis(user) {
            try {
                const [secs, docs] = await Promise.all([
                    db.collection('sections').get(),
                    db.collection('documents').get(),
                ]);
                setText('statSections', secs.size ? secs.size : '—');
                setText('statDocs', docs.size ? docs.size : '—');
            } catch (e) {
                console.warn('KPIs error (collections):', e);
                setText('statSections', '—');
                setText('statDocs', '—');
            }

            var status = '—';
            var lastLogin = '—';
            try {
                const me = await db.collection('users').doc(user.uid).get();
                const d = me.data() || {};
                if (d.status) {
                    const s = String(d.status).toLowerCase();
                    status = (s === 'active' || s === 'activo') ? 'Activo' : d.status;
                }
                if (d.lastLoginAt) {
                    const ts = d.lastLoginAt.toDate ? d.lastLoginAt.toDate() : new Date(d.lastLoginAt);
                    lastLogin = ts.toLocaleString('es-AR');
                }
            } catch (e) {
                console.warn('KPIs error (user profile):', e);
            }

            setText('statStatus', status);
            setText('statLastLogin', lastLogin);
            setText('statDownloads', '0');
        }

        // ===== documentos recientes =====
        async function latestDocuments() {
            const box = document.getElementById('latestDocs');
            if (!box) return;
            box.innerHTML = '';
            try {
                const qs = await db.collection('documents').orderBy('createdAt', 'desc').limit(6).get();
                if (qs.empty) {
                    box.innerHTML = '<div class="sidebar-muted">No hay documentos</div>';
                    return;
                }
                qs.forEach(function(doc) {
                    const d = doc.data();
                    const row = document.createElement('div');
                    row.className = 'list-item';
                    row.innerHTML = '<div><h4>' + (d.title || 'Documento') +
                        '</h4><div class="sidebar-muted">' + ((d.type || '').toUpperCase()) + '</div></div>';
                    const act = document.createElement('div');
                    act.className = 'actions';
                    const btn = document.createElement('button');
                    btn.className = 'btn-xs btn-primary';
                    btn.textContent = d.type === 'link' ? 'Abrir link' : 'Ver PDF';
                    btn.onclick = function() { openDocument(d); };
                    act.appendChild(btn);
                    row.appendChild(act);
                    box.appendChild(row);
                });
            } catch (e) {
                console.warn('latestDocuments error:', e);
                box.innerHTML = '<div class="sidebar-muted">Permisos insuficientes o sin datos.</div>';
            }
        }

        // ===== secciones destacadas =====
        async function featuredSections() {
            const box = document.getElementById('featuredSections');
            if (!box) return;
            box.innerHTML = '';
            try {
                const qs = await db.collection('sections').orderBy('createdAt', 'desc').limit(4).get();
                if (qs.empty) {
                    box.innerHTML = '<div class="sidebar-muted">No hay secciones</div>';
                    return;
                }
                qs.forEach(function(doc) {
                    const d = doc.data();
                    const row = document.createElement('div');
                    row.className = 'list-item';
                    row.innerHTML = '<div><h4>' + d.title + '</h4><div class="sidebar-muted">' +
                        (d.description || '') + '</div></div>';
                    const act = document.createElement('div');
                    act.className = 'actions';
                    const btn = document.createElement('button');
                    btn.className = 'btn-xs';
                    btn.textContent = 'Ver';
                    btn.onclick = function() {
                        window.location.href = './sections.html#' + doc.id;
                    };
                    act.appendChild(btn);
                    row.appendChild(act);
                    box.appendChild(row);
                });
            } catch (e) {
                console.warn('featuredSections error:', e);
                box.innerHTML = '<div class="sidebar-muted">Permisos insuficientes o sin datos.</div>';
            }
        }

        function openDocument(d) {
            if (d && d.fileUrl) window.open(d.fileUrl, '_blank', 'noopener');
        }

        // ===== perfil =====
        async function renderProfilePage(user) {
            const nameEl = document.getElementById('profileName');
            const emailEl = document.getElementById('profileEmail');
            const dateEl = document.getElementById('profileCreatedAt');
            const photoEl = document.getElementById('profilePhoto');

            try {
                const doc = await db.collection('users').doc(user.uid).get();
                const data = doc.data() || {};
                if (nameEl) nameEl.value = data.name || user.displayName || '';
                if (emailEl) emailEl.value = data.email || user.email || '';
                if (dateEl) dateEl.textContent = data.createdAt ? fmt(data.createdAt) : '—';
                if (photoEl) photoEl.src = data.photoURL || user.photoURL || '/assets/img/avatar.png';
            } catch (e) {
                console.error('renderProfilePage error', e);
            }
        }

        function toast(msg, type) {
            type = type || 'info';
            if (window.authManager && window.authManager.showNotification)
                window.authManager.showNotification(msg, type);
            else alert(msg);
        }

        // ===== arranque =====
        var started = false;
        async function boot(page) {
            if (started) return;
            started = true;

            const user = await waitForAuth();
            if (!user) {
                console.warn('[members.js] No hay sesión activa.');
                return;
            }

            setText('userEmail', user.email || '—');
            await normalizeUserProfile(user);

            const path = location.pathname;
            const target =
                page ||
                (path.indexOf('/dashboard.html') > -1 ?
                    'dashboard' :
                    path.indexOf('/sections.html') > -1 ?
                    'sections' :
                    path.indexOf('/profile.html') > -1 ?
                    'profile' :
                    '');

            if (target === 'dashboard') {
                await kpis(user);
                await latestDocuments();
                await featuredSections();
            } else if (target === 'profile') {
                await renderProfilePage(user);
            }

            console.log('[members.js] Usuario detectado:', user.email);
        }

        window.members = window.members || {};
        window.members.audit = audit;
        window.members.boot = boot;

        document.addEventListener('DOMContentLoaded', function() {
            if (!started) boot();
        });
    })();
}