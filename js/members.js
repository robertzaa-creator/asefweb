// js/members.js
(function(){
  const db = window.firebaseDb;
  const auth = window.firebaseAuth;
  const storage = window.firebaseStorage;

  const fmtDate = (ts) => {
    if (!ts) return '—';
    try{
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('es-AR', {day:'2-digit', month:'short', year:'numeric'});
    }catch{ return '—'; }
  };

  async function ensureSessionAndProfile(){
    return new Promise((resolve)=>{
      auth.onAuthStateChanged(async (user)=>{
        if(!user){ window.location.href='../../index.html'; return; }
        // trae perfil
        const snap = await db.collection('users').doc(user.uid).get();
        if(!snap.exists){
          // crea doc mínimo
          await db.collection('users').doc(user.uid).set({
            uid: user.uid, name: user.displayName || '', email: user.email || '',
            photoURL: user.photoURL || '', role: 'member', status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, {merge:true});
        }
        const profile = (await db.collection('users').doc(user.uid).get()).data();
        // bloqueado => modal y logout
        if(String(profile?.status || '').toLowerCase()==='blocked'){
          alert('Acceso restringido: su cuenta se encuentra bloqueada.');
          await auth.signOut();
          window.location.href='../../index.html';
          return;
        }
        // pintar email en sidebar
        const emailEl = document.getElementById('userEmail');
        if(emailEl) emailEl.textContent = user.email || '—';
        resolve({user, profile});
      });
    });
  }

  async function kpis(){
    const [secs, docs, events] = await Promise.all([
      db.collection('sections').get(),
      db.collection('documents').get(),
      db.collection('loginEvents').orderBy('createdAt','desc').limit(1).get()
    ]);
    document.getElementById('statSections')?.replaceChildren(document.createTextNode(secs.size));
    document.getElementById('statDocs')?.replaceChildren(document.createTextNode(docs.size));
    const last = events.docs[0]?.data();
    document.getElementById('statLastLogin')?.replaceChildren(document.createTextNode(last ? fmtDate(last.createdAt) : '—'));
    document.getElementById('statStatus')?.replaceChildren(document.createTextNode('Activo'));
  }

  async function latestDocuments(){
    const qs = await db.collection('documents').orderBy('createdAt','desc').limit(6).get();
    const box = document.getElementById('latestDocs'); if(!box) return;
    box.innerHTML = '';
    qs.forEach(doc=>{
      const d = doc.data();
      const row = document.createElement('div'); row.className='list-item';
      const left = document.createElement('div');
      left.innerHTML = `<h4>${d.title||'Documento'}</h4><div class="sidebar-muted">${d.type?.toUpperCase()||''}</div>`;
      const act = document.createElement('div'); act.className='actions';
      const btn = document.createElement('button'); btn.className='btn-xs btn-primary'; btn.textContent = d.type==='link'?'Abrir link':'Ver PDF';
      btn.onclick = ()=> openDocument(d);
      act.appendChild(btn);
      row.appendChild(left); row.appendChild(act);
      box.appendChild(row);
    });
  }

  async function featuredSections(){
    const qs = await db.collection('sections').orderBy('createdAt','desc').limit(4).get();
    const box = document.getElementById('featuredSections'); if(!box) return;
    box.innerHTML = '';
    qs.forEach(doc=>{
      const d = doc.data();
      const row = document.createElement('div'); row.className='list-item';
      row.innerHTML = `<div><h4>${d.title}</h4><div class="sidebar-muted">${d.description||''}</div></div>`;
      const act = document.createElement('div'); act.className='actions';
      const btn = document.createElement('button'); btn.className='btn-xs'; btn.textContent='Ver';
      btn.onclick = ()=> window.location.href = `./sections.html#${doc.id}`;
      act.appendChild(btn); row.appendChild(act); box.appendChild(row);
    });
  }

  async function renderSections(){
    const {profile} = await ensureSessionAndProfile();
    document.getElementById('logoutBtn')?.addEventListener('click', async (e)=>{ e.preventDefault(); await auth.signOut(); window.location.href='../../index.html'; });

    const grid = document.getElementById('sectionsGrid');
    if(!grid) return;

    const qs = await db.collection('sections').orderBy('title').get();
    grid.innerHTML='';
    qs.forEach(doc=>{
      const d = doc.data();
      const card = document.createElement('div'); card.className='card section-card';
      card.innerHTML = `<h4>${d.title}</h4><p>${d.description||''}</p><div class="actions"><button class="btn-xs btn-primary">Abrir</button></div>`;
      card.querySelector('button').onclick = ()=> loadDocs(doc.id, d.title);
      grid.appendChild(card);
    });

    // si viene hash con sección puntual
    const hash = location.hash?.slice(1);
    if(hash) loadDocs(hash);
  }

  async function loadDocs(sectionId, titleFromCard){
    const title = document.getElementById('docsTitle');
    if(titleFromCard) title.textContent = `Documentos · ${titleFromCard}`;
    const panel = document.getElementById('docsPanel'); panel.style.display='block';
    const list = document.getElementById('docsList'); list.innerHTML='';

    const qs = await db.collection('documents').where('sectionId','==', sectionId).orderBy('createdAt','desc').get();
    if(qs.empty){ list.innerHTML = '<div class="sidebar-muted">No hay documentos en esta sección.</div>'; return; }

    qs.forEach(doc=>{
      const d = doc.data();
      const row = document.createElement('div'); row.className='list-item';
      row.innerHTML = `<div><h4>${d.title}</h4><div class="sidebar-muted">${d.type==='link'?'Enlace externo':'PDF'}</div></div>`;
      const act = document.createElement('div'); act.className='actions';
      const btnView = document.createElement('button'); btnView.className='btn-xs btn-primary'; btnView.textContent = d.type==='link'?'Abrir link':'Ver PDF';
      btnView.onclick = ()=> openDocument(d);
      act.appendChild(btnView);

      if(d.type!=='link'){ // permitir descargar
        const btnDl = document.createElement('button'); btnDl.className='btn-xs'; btnDl.textContent='Descargar';
        btnDl.onclick = ()=> downloadDocument(d);
        act.appendChild(btnDl);
      }
      row.appendChild(act); list.appendChild(row);
    });
  }

  async function openDocument(d){
    if(d.type==='link' && d.fileUrl){ window.open(d.fileUrl, '_blank'); return; }
    // si es PDF en storage, priorizar storagePath; si no, usar fileUrl (descarga firmada que ya guardaste)
    if(d.storagePath){
      const ref = storage.ref(d.storagePath);
      const url = await ref.getDownloadURL();
      window.open(url, '_blank');
    }else if(d.fileUrl){ window.open(d.fileUrl,'_blank'); }
  }
  async function downloadDocument(d){
    // mismo que open, pero forzar descarga (depende del header; si no, simplemente abre)
    await openDocument(d);
  }

  async function renderProfile(){
    const {user, profile} = await ensureSessionAndProfile();
    document.getElementById('logoutBtn')?.addEventListener('click', async (e)=>{ e.preventDefault(); await auth.signOut(); window.location.href='../../index.html'; });

    const avatar = document.getElementById('profileAvatar');
    const nameEl = document.getElementById('profileName');
    const emailEl= document.getElementById('profileEmail');
    const metaEl = document.getElementById('profileMeta');

    avatar.src = profile.photoURL || 'https://ui-avatars.com/api/?name='+encodeURIComponent(profile.name||user.email)+'&background=eee&color=555';
    nameEl.textContent = profile.name || '(sin nombre)';
    emailEl.textContent = user.email;
    metaEl.textContent = 'Alta: ' + fmtDate(profile.createdAt);

    document.getElementById('inpName').value = profile.name || '';
    document.getElementById('btnSaveName').onclick = async ()=>{
      const newName = document.getElementById('inpName').value.trim();
      await db.collection('users').doc(user.uid).set({ name:newName, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
      alert('Nombre actualizado'); location.reload();
    };

    document.getElementById('btnSavePhoto').onclick = async ()=>{
      const file = document.getElementById('inpPhoto').files?.[0];
      if(!file) return;
      const path = `avatars/${user.uid}.jpg`;
      await storage.ref(path).put(file);
      const url = await storage.ref(path).getDownloadURL();
      await db.collection('users').doc(user.uid).set({ photoURL:url, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
      alert('Foto actualizada'); location.reload();
    };
  }

  async function renderDashboard(){
    await ensureSessionAndProfile();
    document.getElementById('logoutBtn')?.addEventListener('click', async (e)=>{ e.preventDefault(); await auth.signOut(); window.location.href='../../index.html'; });
    await kpis();
    await latestDocuments();
    await featuredSections();
  }

  // Auditoría: registrar login/logout (llamado desde auth.js en Paso 2)
  async function audit(eventType, user){
    try{
      await db.collection('loginEvents').add({
        uid: user.uid, email: user.email || '',
        type: eventType, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        ua: navigator.userAgent || ''
      });
    }catch(e){ console.warn('audit fail', e); }
  }

  window.members = {
    boot: async (page)=>{
      if(page==='dashboard') await renderDashboard();
      if(page==='sections')  await renderSections();
      if(page==='profile')   await renderProfile();
    },
    audit
  };
})();
