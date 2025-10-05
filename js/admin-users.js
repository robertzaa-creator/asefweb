// /js/admin-users.js
document.addEventListener('DOMContentLoaded', async() => {
    console.log('[admin-users.js] Iniciando módulo de gestión de usuarios…');

    // 🔹 Espera hasta que Firestore esté inicializado (máx 2 segundos)
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

    if (!tableBody) {
        console.warn('[admin-users.js] No se encontró la tabla de usuarios.');
        return;
    }

    // 🔹 Renderiza la tabla de usuarios
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

                // Filtro por texto (búsqueda)
                const text = (name + email).toLowerCase();
                if (filterText && !text.includes(filterText.toLowerCase())) return;

                const tr = document.createElement('tr');
                tr.innerHTML = `
          <td>${name}</td>
          <td>${email}</td>
          <td>${created}</td>
          <td>${lastLogin}</td>
          <td>—</td> <!-- Último cierre pendiente -->
          <td>${status}</td>
          <td>${role}</td>
          <td class="actions">
            <button class="btn btn-sm btn-outline-primary editUser" data-id="${doc.id}">
              <i class="fa-solid fa-pen"></i> Editar
            </button>
            <button class="btn btn-sm btn-outline-danger deleteUser" data-id="${doc.id}">
              <i class="fa-solid fa-trash"></i> Eliminar
            </button>
          </td>
        `;
                tableBody.appendChild(tr);
            });

            // Vincula botones de acción
            bindActionButtons();

        } catch (err) {
            console.error('Error cargando usuarios:', err);
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error al cargar usuarios</td></tr>`;
        }
    }

    // 🔹 Acciones: editar / eliminar
    function bindActionButtons() {
        const editButtons = document.querySelectorAll('.editUser');
        const deleteButtons = document.querySelectorAll('.deleteUser');

        editButtons.forEach(btn => {
            btn.addEventListener('click', async e => {
                const uid = e.target.closest('button').dataset.id;
                openEditModal(uid);
            });
        });

        deleteButtons.forEach(btn => {
            btn.addEventListener('click', async e => {
                const uid = e.target.closest('button').dataset.id;
                if (confirm(`¿Seguro que desea eliminar al usuario con ID ${uid}?`)) {
                    try {
                        await db.collection('users').doc(uid).delete();
                        alert('Usuario eliminado correctamente.');
                        await loadUsers();
                    } catch (err) {
                        console.error('Error eliminando usuario:', err);
                        alert('Error al eliminar usuario.');
                    }
                }
            });
        });
    }

    // 🔹 Modal Editar Usuario
    const modal = document.getElementById('editUserModal');
    const form = document.getElementById('editUserForm');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const roleSelect = document.getElementById('editUserRole');
    const statusSelect = document.getElementById('editUserStatus');
    const emailInput = document.getElementById('editUserEmail');
    const idInput = document.getElementById('editUserId');

    function openEditModal(uid) {
        db.collection('users').doc(uid).get().then(doc => {
            if (!doc.exists) return alert('Usuario no encontrado.');
            const u = doc.data();

            idInput.value = uid;
            emailInput.value = u.email || '';
            roleSelect.value = u.role || 'member';
            statusSelect.value = u.status || 'active';

            modal.style.display = 'flex';
            modal.classList.remove('hidden');
        });
    }

    function closeEditModal() {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }

    cancelBtn ? .addEventListener('click', closeEditModal);
    modal ? .addEventListener('click', e => {
        if (e.target === modal) closeEditModal();
    });

    // 🔹 Guardar cambios (usa Cloud Function si existe)
    form ? .addEventListener('submit', async e => {
        e.preventDefault();

        const uid = idInput.value;
        const role = roleSelect.value;
        const status = statusSelect.value;

        try {
            // Si existe la función callable setUserRole (Cloud Function)
            if (firebase.functions) {
                const functions = firebase.functions();
                const setUserRole = functions.httpsCallable('setUserRole');
                await setUserRole({ uid, role, status });
                console.log('[admin-users.js] Cloud Function setUserRole ejecutada.');
            }

            // Actualización local en Firestore
            await db.collection('users').doc(uid).update({ role, status });
            alert('Cambios guardados correctamente.');
            closeEditModal();
            await loadUsers();
        } catch (err) {
            console.error('Error actualizando usuario:', err);
            alert('Error al guardar cambios.');
        }
    });

    // 🔹 Eventos UI
    reloadBtn ? .addEventListener('click', () => loadUsers(searchInput ? .value || ''));
    newBtn ? .addEventListener('click', () => alert('Funcionalidad "Nuevo usuario" en desarrollo.'));
    searchInput ? .addEventListener('input', e => loadUsers(e.target.value));

    // 🔹 Carga inicial
    await loadUsers();
});