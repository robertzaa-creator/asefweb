// /js/admin-users.js
document.addEventListener('DOMContentLoaded', async() => {
    const db = window.firebaseDB;
    if (!db) {
        console.error('Firestore no inicializado.');
        return;
    }

    const tableBody = document.querySelector('tbody');
    const reloadBtn = document.querySelector('#reloadBtn');
    const newBtn = document.querySelector('#newBtn');

    if (!tableBody) return;

    // Función para cargar usuarios
    async function loadUsers() {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Cargando...</td></tr>';
        try {
            const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
            tableBody.innerHTML = '';

            if (snapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No hay usuarios registrados</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const u = doc.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
          <td>${u.name || '(sin nombre)'}</td>
          <td>${u.email}</td>
          <td>${u.createdAt ? u.createdAt.toDate().toLocaleDateString() : '-'}</td>
          <td>${u.lastLoginAt ? u.lastLoginAt.toDate().toLocaleDateString() : '-'}</td>
          <td>${u.status || '-'}</td>
          <td>${u.role || '-'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary">Editar</button>
            <button class="btn btn-sm btn-outline-danger">Eliminar</button>
          </td>`;
                tableBody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error cargando usuarios:', err);
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error al cargar usuarios</td></tr>`;
        }
    }

    // Eventos
    reloadBtn ? .addEventListener('click', loadUsers);
    newBtn ? .addEventListener('click', () => alert('Funcionalidad "Nuevo usuario" en desarrollo.'));

    // Cargar al inicio
    await loadUsers();
});