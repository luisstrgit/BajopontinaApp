const API_URL = 'http://localhost:3000/api';
let currentUser = null;

// Manejo de Iniciar Sesión (Login)
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.usuario;
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            document.getElementById('user-display').innerText = `${currentUser.nombre} (${currentUser.rol})`;
            
            // Cargar datos iniciales al entrar
            loadStock();
            loadTotalMermas(); 
        } else {
            document.getElementById('login-error').innerText = data.message;
        }
    } catch (err) {
        document.getElementById('login-error').innerText = 'Error al conectar con el servidor backend';
    }
});

// Cerrar Sesión
document.getElementById('btn-logout').addEventListener('click', () => {
    currentUser = null;
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
});

// Pestañas / Módulos
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    
    // Nos aseguramos de marcar la pestaña correcta
    if (event && event.target) {
        event.target.classList.add('active');
    }

    if (tabName === 'stock') loadStock();
    if (tabName === 'movimientos') loadSelectProductos('mov-producto');
    if (tabName === 'mermas') loadSelectProductos('merma-producto');
    if (tabName === 'reportes') loadReportes();
}

// Cargar Stock desde SQL Server y ACTUALIZAR DASHBOARD
async function loadStock() {
    try {
        const res = await fetch(`${API_URL}/productos`);
        const productos = await res.json();
        const tbody = document.getElementById('tbl-stock-body');
        tbody.innerHTML = '';

        // Variables para sumar los totales del Dashboard
        let totalLlenas = 0;
        let totalVacias = 0;

        productos.forEach(p => {
            // Sumamos las cantidades a las variables
            totalLlenas += p.stock_cajas_llenas;
            totalVacias += p.stock_cajas_vacias;

            // Dibujamos la tabla
            tbody.innerHTML += `
                <tr>
                    <td>${p.codigo_sku}</td>
                    <td>${p.nombre_producto}</td>
                    <td>${p.tipo_material}</td>
                    <td>${p.capacidad_caja} unid.</td>
                    <td><strong>${p.stock_cajas_llenas}</strong></td>
                    <td><strong>${p.stock_cajas_vacias}</strong></td>
                </tr>
            `;
        });

        // ✨ Inyectamos los totales calculados en las tarjetas ✨
        document.getElementById('total-llenas').innerText = totalLlenas;
        document.getElementById('total-vacias').innerText = totalVacias;

    } catch (error) {
        console.error("Error al cargar el stock:", error);
    }
}

// ✨ NUEVA FUNCIÓN: Cargar Total de Mermas para el Dashboard
async function loadTotalMermas() {
    try {
        // Asume que tendrás un endpoint GET /mermas en tu backend
        const res = await fetch(`${API_URL}/mermas`);
        if (res.ok) {
            const mermas = await res.json();
            let totalMermas = 0;
            // Suma todas las unidades rotas
            mermas.forEach(m => {
                totalMermas += m.cantidad_unidades_rotas;
            });
            document.getElementById('total-mermas').innerText = totalMermas;
        }
    } catch (error) {
        // Si el endpoint aún no existe en el backend, no rompe la página, solo pone 0.
        console.warn("No se pudo cargar el total de mermas. ¿Existe el GET /mermas en tu API?");
        document.getElementById('total-mermas').innerText = "0";
    }
}

// Cargar opciones de Productos en Selects
async function loadSelectProductos(selectId) {
    const res = await fetch(`${API_URL}/productos`);
    const productos = await res.json();
    const select = document.getElementById(selectId);
    select.innerHTML = '';
    productos.forEach(p => {
        select.innerHTML += `<option value="${p.id_producto}">${p.nombre_producto} (${p.codigo_sku})</option>`;
    });
}

// Registrar Movimiento (Ingreso / Salida)
document.getElementById('form-movimiento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        id_producto: parseInt(document.getElementById('mov-producto').value),
        id_cliente: parseInt(document.getElementById('mov-cliente').value),
        id_usuario: currentUser.id_usuario,
        tipo_movimiento: document.getElementById('mov-tipo').value,
        cantidad_cajas: parseInt(document.getElementById('mov-cantidad').value),
        observaciones: document.getElementById('mov-obs').value
    };

    const res = await fetch(`${API_URL}/movimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    alert(data.message);
    document.getElementById('form-movimiento').reset();
    
    // ✨ ACTUALIZAR DASHBOARD: Recargamos el stock para que los números de arriba cambien al instante
    loadStock();
});

// Registrar Merma
document.getElementById('form-merma').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        id_producto: parseInt(document.getElementById('merma-producto').value),
        id_usuario: currentUser.id_usuario,
        cantidad_unidades_rotas: parseInt(document.getElementById('merma-cantidad').value),
        causa: document.getElementById('merma-causa').value
    };

    const res = await fetch(`${API_URL}/mermas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    alert(data.message);
    document.getElementById('form-merma').reset();
    
    // ✨ ACTUALIZAR DASHBOARD: Recargamos las mermas para que cambie la tarjeta roja al instante
    loadTotalMermas();
});

// Cargar Historial de Reportes
async function loadReportes() {
    const res = await fetch(`${API_URL}/reportes/movimientos`);
    const reportes = await res.json();
    const tbody = document.getElementById('tbl-reportes-body');
    tbody.innerHTML = '';

    reportes.forEach(r => {
        tbody.innerHTML += `
            <tr>
                <td>${r.id_movimiento}</td>
                <td>${new Date(r.fecha_movimiento).toLocaleString()}</td>
                <td>${r.nombre_producto}</td>
                <td>${r.razon_social}</td>
                <td>${r.tipo_movimiento}</td>
                <td>${r.cantidad_cajas}</td>
                <td>${r.usuario}</td>
            </tr>
        `;
    });
}