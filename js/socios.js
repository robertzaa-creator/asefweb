// js/members.js
// Evitar doble carga del archivo
if (window.__MEMBERS_JS__) {
    console.warn('socios.js already loaded; skipping.');
} else {
    window.__MEMBERS_JS__ = true;

    (function() {
        const db = window.firebaseDb;

        // ===== helpers =====
        function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

        function fmt(ts) { if (!ts) return '—'; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleString(); }

        // ===== normalización mínima de perfil =====
        async function normalizeUserProfile(user) {
            // No tocamos role/status (tus reglas no lo permiten al owner)
            const ref = db.collection('users').doc(user.uid);
            const snap = await ref.get();
            const patch = { email: user.email || '' };
            if (!snap.exists) patch.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            if (Object.keys(patch).length) await ref.set(patch, { merge: true });
        }

        // ===== auditoría (no rompe si falla) =====
        async function audit(eventType, user) {
            try {
                await db.collection('loginEvents').add({
                    uid: user.uid,
                    email: user.email || '',
                    type: eventType, // 'login' | 'logout'
                    ua: navigator.userAgent || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
            } catch (e) { console.warn('audit fail', e); }
        }

        // ===== dashboard KPIs =====
        async function kpis() {
            try {
                const [secs, docs] = await Promise.all([
                    db.collection('sections').get(),
                    db.collection('documents').get()
                ]);
                setText('statSections', secs.size ? ? '—');
                setText('statDocs', docs.size ? ? '—');
            } catch (e) {
                console.warn('KPIs error (collections):', e);
                setText('statSections', '—');
                setText('statDocs', '—');
            }

            // Estado y último ingreso desde /users/{uid}
            let status = '—',
                lastLogin = '—';
            const u = firebaseAuth.currentUser;
            if (u) {
                try {
                    const me = await db.collection('users').doc(u.uid).get();
                    const d = me.data() || {};
                    if (d.status) {
                        const s = String(d.status).toLowerCase();
                        status = (s === 'active' || s === 'activo') ? 'Activo' : d.status;
                    }
                    if (d.lastLoginAt) lastLogin = fmt(d.lastLoginAt);
                } catch (e) {
                    console.warn('KPIs error (user profile):', e);
                }
            }
            setText('statStatus', status);
            setText('statLastLogin', lastLogin);
            setText('statDownloads', '0'); // beta
        }

        // ===== documentos destacados / últimos =====
        async function latestDocuments() {
            const box = document.getElementById('latestDocs');
            if (!box) return;
            box.innerHTML = '';
            try {
                const qs = await db.collection('documents').orderBy('createdAt', 'desc').limit(6).get();
                if (qs.empty) { box.innerHTML = '<div class="sidebar-muted">No hay documentos</div>'; return; }
                qs.forEach(doc => {
                    const d = doc.data();
                    const row = document.createElement('div');
                    row.className = 'list-item';
                    row.innerHTML = `<div>
            <h4>${d.title || 'Documento'}</h4>
            <div class="sidebar-muted">${(d.type || '').toUpperCase()}</div>
          </div>`;
                    const act = document.createElement('div');
                    act.className = 'actions';
                    const btn = document.createElement('button');
                    btn.className = 'btn-xs btn-primary';
                    btn.textContent = d.type === 'link' ? 'Abrir link' : 'Ver PDF';
                    btn.onclick = () => openDocument(d);
                    act.appendChild(btn);
                    row.appendChild(act);
                    box.appendChild(row);
                });
            } catch (e) {
                console.warn('latestDocuments error:', e);
                box.innerHTML = '<div class="sidebar-muted">Permisos insuficientes o sin datos.</div>';
            }
        }

        async function featuredSections() {
            const box = document.getElementById('featuredSections');
            if (!box) return;
            box.innerHTML = '';
            try {
                const qs = await db.collection('sections').orderBy('createdAt', 'desc').limit(4).get();
                if (qs.empty) { box.innerHTML = '<div class="sidebar-muted">No hay secciones</div>'; return; }
                qs.forEach(doc => {
                    const d = doc.data();
                    const row = document.createElement('div');
                    row.className = 'list-item';
                    row.innerHTML = `<div><h4>${d.title}</h4><div class="sidebar-muted">${d.description || ''}</div></div>`;
                    const act = document.createElement('div');
                    act.className = 'actions';
                    const btn = document.createElement('button');
                    btn.className = 'btn-xs';
                    btn.textContent = 'Ver';
                    btn.onclick = () => window.location.href = `./sections.html#${doc.id}`;
                    act.appendChild(btn);
                    row.appendChild(act);
                    box.appendChild(row);
                });
            } catch (e) {
                console.warn('featuredSections error:', e);
                box.innerHTML = '<div class="sidebar-muted">Permisos insuficientes o sin datos.</div>';
            }
        }

        function openDocument(d) { if (d ?.fileUrl) window.open(d.fileUrl, '_blank', 'noopener'); }

        // ===== secciones =====
        async function renderSectionsPage() {
            const list = document.getElementById('sectionsList');
            if (!list) return;
            list.innerHTML = '';
            try {
                const qs = await db.collection('sections').orderBy('createdAt', 'desc').get();
                if (qs.empty) { list.innerHTML = '<div class="sidebar-muted p-3">No hay secciones disponibles.</div>'; return; }
                qs.forEach(doc => {
                    const s = doc.data();
                    const item = document.createElement('div');
                    item.className = 'list-item';
                    item.innerHTML = `<div><h4>${s.title}</h4><div class="sidebar-muted">${s.description || ''}</div></div>`;
                    const act = document.createElement('div');
                    act.className = 'actions';
                    const btn = document.createElement('button');
                    btn.className = 'btn-xs';
                    btn.textContent = 'Ver documentos';
                    btn.onclick = () => renderDocumentsForSection(doc.id);
                    act.appendChild(btn);
                    item.appendChild(act);
                    list.appendChild(item);
                });
            } catch (e) {
                console.warn('renderSectionsPage error:', e);
                list.innerHTML = '<div class="sidebar-muted p-3">No fue posible cargar secciones.</div>';
            }
        }

        async function renderDocumentsForSection(sectionId) {
            const list = document.getElementById('sectionDocuments');
            if (!list) return;
            list.innerHTML = '<div class="sidebar-muted p-2">Cargando…</div>';
            try {
                const qs = await db.collection('documents')
                    .where('sectionId', '==', sectionId)
                    .orderBy('createdAt', 'desc')
                    .get();

                if (qs.empty) { list.innerHTML = '<div class="sidebar-muted p-2">No hay documentos en esta sección.</div>'; return; }

                list.innerHTML = '';
                qs.forEach(doc => {
                    const d = doc.data();
                    const row = document.createElement('div');
                    row.className = 'list-item';
                    row.innerHTML = `<div><h4>${d.title || 'Documento'}</h4><div class="sidebar-muted">${(d.type || '').toUpperCase()}</div></div>`;
                    const act = document.createElement('div');
                    act.className = 'actions';
                    const btn = document.createElement('button');
                    btn.className = 'btn-xs btn-primary';
                    btn.textContent = d.type === 'link' ? 'Abrir link' : 'Ver PDF';
                    btn.onclick = () => openDocument(d);
                    act.appendChild(btn);
                    row.appendChild(act);
                    list.appendChild(row);
                });
            } catch (e) {
                console.warn('renderDocumentsForSection error:', e);
                list.innerHTML = '<div class="sidebar-muted p-2">No fue posible cargar documentos.</div>';
            }
        }

        // ===== perfil =====
        async function renderProfilePage() {
            const u = firebaseAuth.currentUser;
            if (!u) return;
            const nameEl = document.getElementById('profileName');
            const emailEl = document.getElementById('profileEmail');
            const dateEl = document.getElementById('profileCreatedAt');
            const photoEl = document.getElementById('profilePhoto');

            try {
                const doc = await db.collection('users').doc(u.uid).get();
                const data = doc.data() || {};
                if (nameEl) nameEl.value = data.name || u.displayName || '';
                if (emailEl) emailEl.value = data.email || u.email || '';
                if (dateEl) dateEl.textContent = data.createdAt ? fmt(data.createdAt) : '—';
                if (photoEl) photoEl.src = data.photoURL || u.photoURL || '/assets/img/avatar.png';

                const saveBtn = document.getElementById('saveProfileBtn');
                if (saveBtn) {
                    saveBtn.onclick = async() => {
                        const patch = {
                            name: nameEl ? nameEl.value.trim() : data.name || '',
                            photoURL: photoEl ? photoEl.src : data.photoURL || '',
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        try {
                            await db.collection('users').doc(u.uid).set(patch, { merge: true });
                            toast('Perfil actualizado', 'success');
                        } catch (e) {
                            console.error('profile save error', e);
                            toast('No se pudo guardar el perfil', 'error');
                        }
                    };
                }
            } catch (e) {
                console.error('renderProfilePage error', e);
            }
        }

        function toast(msg, type = 'info') {
            if (window.authManager ?.showNotification) window.authManager.showNotification(msg, type);
            else alert(msg);
        }

        // ===== exposición =====
        let started = false;
        async function boot(page) {
            if (started) return;
            started = true;

            const user = firebaseAuth.currentUser;
            if (user) await normalizeUserProfile(user);

            const path = location.pathname;
            const target =
                page ||
                (path.includes('/dashboard.html') ? 'dashboard' :
                    path.includes('/sections.html') ? 'sections' :
                    path.includes('/profile.html') ? 'profile' : '');

            if (target === 'dashboard') {
                await kpis();
                await latestDocuments();
                await featuredSections();
            } else if (target === 'sections') {
                await renderSectionsPage();
                const sid = location.hash ? location.hash.substring(1) : '';
                if (sid) await renderDocumentsForSection(sid);
            } else if (target === 'profile') {
                await renderProfilePage();
            }
        }

        window.members = window.members || {};
        window.members.audit = audit;
        window.members.boot = boot;

        document.addEventListener('DOMContentLoaded', () => { if (!started) boot(); });
    })();
}