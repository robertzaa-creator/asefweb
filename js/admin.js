(() => {
  const ROOT = location.pathname.includes('/asefweb/') ? '/asefweb/' : '/';
  const db = firebase.firestore();
  const auth = firebase.auth();

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const fmt = (ms) => ms ? new Date(ms).toLocaleString() : '—';

  // Tabs
  $$('.members-nav a').forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    const id = a.dataset.tab;
    $$('.tab').forEach(t => t.classList.add('hidden'));
    $(`#${id}`).classList.remove('hidden');
    $$('.members-nav a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
  }));

  // Guard admin
  async function assertAdmin() {
    const u = auth.currentUser;
    if (!u) { location.href = `${ROOT}index.html`; return false; }
    await u.getIdToken(true);
    const doc = await db.collection('users').doc(u.uid).get();
    if (!doc.exists || doc.data().role !== 'admin') {
      alert('Acceso restringido a administradores.');
      location.href = `${ROOT}index.html`;
      return false;
    }
    $('#adminUserBadge').style.display = 'inline-flex';
    return true;
  }

  // ----- Invitaciones -----
  function randomToken(len = 40) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let t = '';
    for (let i = 0; i < len; i++) t += chars[Math.floor(Math.random() * chars.length)];
    return t;
  }

  const formInvite = $('#formInvite');
  const inviteResult = $('#inviteResult');

  formInvite?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    const email = e.target.email.value.trim().toLowerCase();
    const role = e.target.role.value;
    const token = randomToken(44);
    const now = Date.now();

    await db.collection('invites').doc(token).set({
      name, email, role, status: 'pending', createdAt: now, createdBy: auth.currentUser.uid,
      expiresAt: now + 1000*60*60*48
    });

    const link = `${location.origin}${ROOT}pages/auth/accept-invite.html?token=${encodeURIComponent(token)}`;
    inviteResult.innerHTML = `
      <div class="alert success">
        Invitación creada:<br/><code>${link}</code>
      </div>`;
    e.target.reset();
  });

  // ----- Usuarios -----
  const usersTbody = $('#usersTbody');
  $('#reloadUsers')?.addEventListener('click', loadUsers);
  $('#userSearch')?.addEventListener('input', loadUsers);

  async function loadUsers() {
    const q = ($('#userSearch')?.value || '').toLowerCase();
    const snap = await db.collection('users').orderBy('createdAt','desc').limit(200).get();
    usersTbody.innerHTML = '';
    snap.forEach(doc => {
      const u = doc.data();
      if (q && !(u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.name||'—'}</td>
        <td>${u.email||'—'}</td>
        <td><span class="chip ${u.status==='active'?'chip-success':'chip-warning'}">${u.status||'—'}</span></td>
        <td>${u.role||'—'}</td>
        <td>
          <button class="btn xs toggle-status" data-id="${doc.id}" data-status="${u.status}">
            ${u.status==='active'?'Bloquear':'Activar'}
          </button>
          <button class="btn xs role-admin" data-id="${doc.id}">Hacer admin</button>
        </td>`;
      usersTbody.appendChild(tr);
    });

    $$('.toggle-status').forEach(b=>b.addEventListener('click',async()=>{
      const id = b.dataset.id;
      const next = (b.dataset.status==='active')?'blocked':'active';
      await db.collection('users').doc(id).update({status:next,updatedAt:Date.now()});
      loadUsers();
    }));

    $$('.role-admin').forEach(b=>b.addEventListener('click',async()=>{
      const id = b.dataset.id;
      await db.collection('users').doc(id).update({role:'admin',updatedAt:Date.now()});
      loadUsers();
    }));
  }

  // ----- Secciones -----
  const formCreateSection = $('#formCreateSection');
  const sectionsTbody = $('#sectionsTbody');

  formCreateSection?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const title = e.target.title.value.trim();
    const order = Number(e.target.order.value);
    const active = e.target.active.checked;
    const now = Date.now();
    await db.collection('sections').add({title,order,active,createdAt:now,updatedAt:now,createdBy:auth.currentUser.uid});
    e.target.reset(); e.target.order.value=0; e.target.active.checked=true;
    loadSections();
  });

  async function loadSections() {
    const snap = await db.collection('sections').orderBy('order').get();
    sectionsTbody.innerHTML='';
    snap.forEach(d=>{
      const s=d.data();
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td>${s.order||0}</td>
        <td>${s.title}</td>
        <td>${s.active?'Sí':'No'}</td>
        <td>
          <button class="btn xs danger del" data-id="${d.id}"><i class="fa-regular fa-trash-can"></i></button>
        </td>`;
      sectionsTbody.appendChild(tr);
    });
    $$('.del').forEach(b=>b.addEventListener('click',async()=>{
      if(!confirm('Eliminar sección?'))return;
      await db.collection('sections').doc(b.dataset.id).delete();
      loadSections();
    }));
  }

  // Boot
  auth.onAuthStateChanged(async (u)=>{
    if(!u){ location.href=`${ROOT}index.html`; return; }
    if(await assertAdmin()){
      loadUsers();
      loadSections();
    }
  });
})();
