document.addEventListener('DOMContentLoaded', async() => {
    console.log('[admin-users.js] Iniciando módulo de gestión de usuarios…');

    let db = window.firebaseDB;
    let retries = 10;
    while (!db && retries > 0) {
        await new Promise(r => setTimeout(r, 200));
        db = window.firebaseDB;
        retries--;
    }
    if (!db) {
        console.error('❌ Firestore sigue sin inicializar después de esperar.');
        return;
    }

    console.log('[admin-users.js] ✅ Firestore inicializado correctamente.');

    const tableBody = document.querySelector('tbody');
    const reloadBtn = document.querySelector('#reloadBtn');
    const newBtn = document.querySelector('#newBtn');
    const searchInput = document.querySelector('#searchUser');

    if (!tableBody) return;

    async function loadUsers(filterText = '') {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Cargando...</td></tr>';
        try {
            const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
            tableBody.innerHTML = '';

            if (snapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No hay usuarios registrados</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const u = doc.data();
                const name = u.name || '(sin nombre)';
                const email = u.email || '';
                const created = u.createdAt ? u.createdAt.toDate().toLocaleDateString() : '-';
                const lastLogin = u.lastLoginAt ? u.lastLoginAt.toDate().toLocaleDateString() : '-';
                const status = u.status || '-';
                const role = u.role || '-';

                const text = (name + email).toLowerCase();
                if (filterText && !text.includes(filterText.toLowerCase())) return;

                const tr = document.createElement('tr');
                tr.innerHTML = `
          <td>${name}</td>
          <td>${email}</td>
          <td>${created}</td>
          <td>${lastLogin}</td>
          <td>—</td>
          <td>${status}</td>
          <td>${role}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary editUser" data-id="${doc.id}">
              <i class="fa-solid fa-pen"></i> Editar
            </button>
            <button class="btn btn-sm btn-outline-danger deleteUser" data-id="${doc.id}">
              <i class="fa-solid fa-trash"></i> Eliminar
            </button>
          </td>`;
                tableBody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error cargando usuarios:', err);
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error al cargar usuarios</td></tr>`;
        }
    }

    reloadBtn ?.addEventListener('click', () => loadUsers(searchInput ?.value || ''));
    newBtn ?.addEventListener('click', () => alert('Funcionalidad "Nuevo usuario" en desarrollo.'));
    searchInput ?.addEventListener('input', e => loadUsers(e.target.value));

    await loadUsers();
});