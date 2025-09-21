// js/members.js
// Evitar doble carga del archivo
if (window.__MEMBERS_JS__) {
  console.warn('members.js already loaded; skipping file load.');
} else {
  window.__MEMBERS_JS__ = true;

  (function () {
    const db = firebaseDb; // uso local, no creamos global "db"

    // ====== BLOQUEO GLOBAL DE DOBLE BOOT ======
    // Si en algún lado llaman a boot dos veces o se carga el script dos veces,
    // este flag global garantiza que la inicialización ocurra solo una vez.
    window.__MEMBERS_BOOTED__ = window.__MEMBERS_BOOTED__ || false;

    // ===== helpers =====
    function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
    function fmt(ts) { if (!ts) return '—'; const d = ts?.toDate ? ts.toDate() : new Date(ts); return d.toLocaleString(); }

    // ===== normalización de perfil =====
    async function normalizeUserProfile(user) {
      const ref = db.collection('users').doc(user.uid);
      let snap = await ref.get();
      let data = snap.exists ? snap.data() : {};
      const patch = {};
      if (!data.role)   patch.role   = 'member';
      if (!data.status) patch.status = 'active';
      if (Object.keys(patch).length) {
        patch.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await ref.set(patch, { merge: true });
      }
    }

    // ===== auditoría =====
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

    // ===== dashboard =====
    async function kpis() {
      try {
        const [secs, docs] = await Promise.all([
          db.collection('sections').get(),
          db.collection('documents').get()
        ]);

        // Último ingreso: desde el doc del usuario (no loginEvents)
        let lastLogin = null;
        try {
          const uid = firebaseAuth.currentUser?.uid;
          if (uid) {
            const udoc = await db.collection('users').doc(uid).get();
            lastLogin = udoc.exists ? (udoc.data()?.lastLoginAt || null) : null;
          }
        } catch (e) { console.warn('No se pudo leer lastLoginAt del perfil', e); }

        setText('statSections', secs.size ?? '—');
        setText('statDocs', docs.size ?? '—');
        setText('statLastLogin', lastLogin ? fmt(lastLogin) : '—');
        setText('statDownloads', '0');   // beta
        setText('statStatus', 'Activo');
      } catch (e) {
        console.warn('KPIs error:', e);
        if (e.code === 'permission-denied') {
          setText('statSections', '—'); setText('statDocs', '—');
          setText('statLastLogin', '—'); setText('statDownloads', '—');
          setText('statStatus', 'Revisar permisos');
        }
      }
    }

    async function latestDocuments() {
      const box = document.getElementById('latestDocs'); if (!box) return;
      box.innerHTML = ''; // <-- limpiar SIEMPRE antes de renderizar
      try {
        const qs = await db.collection('documents').orderBy('createdAt', 'desc').limit(6).get();
        if (qs.empty) { box.innerHTML = '<div class="sidebar-muted">No hay documentos</div>'; return; }
        qs.forEach(doc => {
          const d = doc.data();
          const row = document.createElement('div'); row.className = 'list-item';
          row.innerHTML = `<div>
            <h4>${d.title || 'Documento'}</h4>
            <div class="sidebar-muted">${(d.type || '').toUpperCase()}</div>
          </div>`;
          const act = document.createElement('div'); act.className = 'actions';
          const btn = document.createElement('button'); btn.className = 'btn-xs btn-primary';
          btn.textContent = d.type === 'link' ? 'Abrir link' : 'Ver PDF';
          btn.onclick = () => openDocument(d);
          act.appendChild(btn); row.appendChild(act); box.appendChild(row);
        });
      } catch (e) {
        console.warn('latestDocuments error:', e);
        if (e.code === 'permission-denied') box.innerHTML = '<div class="sidebar-muted">Permisos insuficientes para ver documentos.</div>';
      }
    }

    async function featuredSections() {
      const box = document.getElementById('featuredSections'); if (!box) return;
      box.innerHTML = ''; // <-- limpiar SIEMPRE antes de renderizar
      try {
        const qs = await db.collection('sections').orderBy('createdAt', 'desc').limit(4).get();
        if (qs.empty) { box.innerHTML = '<div class="sidebar-muted">No hay secciones</div>'; return; }
        qs.forEach(doc => {
          const d = doc.data();
          const row = document.createElement('div'); row.className = 'list-item';
          row.innerHTML = `<div><h4>${d.title}</h4><div class="sidebar-muted">${d.description || ''}</div></div>`;
          const act = document.createElement('div'); act.className = 'actions';
          const btn = document.createElement('button'); btn.className = 'btn-xs'; btn.textContent = 'Ver';
          btn.onclick = () => window.location.href = `./sections.html#${doc.id}`;
          act.appendChild(btn); row.appendChild(act); box.appendChild(row);
        });
      } catch (e) {
        console.warn('featuredSections error:', e);
        if (e.code === 'permission-denied') box.innerHTML = '<div class="sidebar-muted">Permisos insuficientes para ver secciones.</div>';
      }
    }

    function openDocument(d) {
      if (!d || !d.fileUrl) return;
      window.open(d.fileUrl, '_blank', 'noopener');
    }

    // ===== secciones =====
    async function renderSectionsPage() {
      const list = document.getElementById('sectionsList'); if (!list) return;
      list.innerHTML = ''; // limpiar
      try {
        const qs = await db.collection('sections').orderBy('createdAt', 'desc').get();
        if (qs.empty) { list.innerHTML = '<div class="sidebar-muted p-3">No hay secciones disponibles.</div>'; return; }
        qs.forEach(doc => {
          const s = doc.data();
          const item = document.createElement('div'); item.className = 'list-item';
          item.innerHTML = `<div><h4>${s.title}</h4><div class="sidebar-muted">${s.description || ''}</div></div>`;
          const act = document.createElement('div'); act.className = 'actions';
          const btn = document.createElement('button'); btn.className = 'btn-xs'; btn.textContent = 'Ver documentos';
          btn.onclick = () => renderDocumentsForSection(doc.id);
          act.appendChild(btn); item.appendChild(act); list.appendChild(item);
        });
      } catch (e) {
        console.warn('renderSectionsPage error:', e);
        list.innerHTML = '<div class="sidebar-muted p-3">No fue posible cargar secciones (permiso o conexión).</div>';
      }
    }

    async function renderDocumentsForSection(sectionId) {
      const list = document.getElementById('sectionDocuments'); if (!list) return;
      list.innerHTML = '<div class="sidebar-muted p-2">Cargando…</div>';
      try {
        const qs = await db.collection('documents')
          .where('sectionId', '==', sectionId)
          .orderBy('createdAt', 'desc')
          .get();

        if (qs.empty) { list.innerHTML = '<div class="sidebar-muted p-2">No hay documentos en esta sección.</div>'; return; }

        list.innerHTML = ''; // limpiar
        qs.forEach(doc => {
          const d = doc.data();
          const row = document.createElement('div'); row.className = 'list-item';
          row.innerHTML = `<div><h4>${d.title || 'Documento'}</h4><div class="sidebar-muted">${(d.type || '').toUpperCase()}</div></div>`;
          const act = document.createElement('div'); act.className = 'actions';
          const btn = document.createElement('button'); btn.className = 'btn-xs btn-primary';
          btn.textContent = d.type === 'link' ? 'Abrir link' : 'Ver PDF';
          btn.onclick = () => openDocument(d);
          act.appendChild(btn); row.appendChild(act); list.appendChild(row);
        });
      } catch (e) {
        console.warn('renderDocumentsForSection error:', e);
        list.innerHTML = '<div class="sidebar-muted p-2">No fue posible cargar documentos (permiso o conexión).</div>';
      }
    }

    // ===== perfil =====
    async function renderProfilePage() {
      const u = firebaseAuth.currentUser; if (!u) return;
      const nameEl  = document.getElementById('profileName');
      const emailEl = document.getElementById('profileEmail');
      const dateEl  = document.getElementById('profileCreatedAt');
      const photoEl = document.getElementById('profilePhoto');

      try {
        const doc = await db.collection('users').doc(u.uid).get();
        const data = doc.data() || {};
        if (nameEl)  nameEl.value  = data.name || u.displayName || '';
        if (emailEl) emailEl.value = data.email || u.email || '';
        if (dateEl)  dateEl.textContent = data.createdAt ? fmt(data.createdAt) : '—';
        if (photoEl) photoEl.src = data.photoURL || u.photoURL || '/assets/img/avatar.png';

        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) {
          saveBtn.onclick = async () => {
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
      if (window.authManager && typeof window.authManager.showNotification === 'function') {
        window.authManager.showNotification(msg, type);
      } else { alert(msg); }
    }

    // ===== exposición =====
    async function boot(page) {
      // BLOQUEO global (garantiza una sola inicialización)
      if (window.__MEMBERS_BOOTED__) {
        console.debug('members.boot: already booted, skipping.');
        return;
      }
      window.__MEMBERS_BOOTED__ = true;

      const user = firebaseAuth.currentUser;
      if (user) await normalizeUserProfile(user);

      const path = location.pathname;
      const target =
        page ||
        (path.includes('/dashboard.html') ? 'dashboard' :
         path.includes('/sections.html')  ? 'sections'  :
         path.includes('/profile.html')   ? 'profile'   : '');

      if (target === 'dashboard') {
        await kpis(); await latestDocuments(); await featuredSections();
      } else if (target === 'sections') {
        await renderSectionsPage();
        const sid = location.hash ? location.hash.substring(1) : '';
        if (sid) await renderDocumentsForSection(sid);
      } else if (target === 'profile') {
        await renderProfilePage();
      }
    }

    // Exponer para otros módulos
    window.members = window.members || {};
    window.members.audit = audit;
    window.members.boot  = boot;

    // Boot automático (si no lo llaman manualmente)
    document.addEventListener('DOMContentLoaded', () => {
      // Solo si aún no se booteó
      if (!window.__MEMBERS_BOOTED__) boot();
    });
  })();
}
