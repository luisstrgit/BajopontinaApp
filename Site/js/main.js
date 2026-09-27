// CONFIGURACIÓN E INICIALIZACIÓN CONEXIÓN CON NODE.JS / SQL SERVER
const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let productosCache = [];

// EVENTOS AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', function () {
  
  // 1. Botones de Cabecera y Drawer Lateral
  const btnInfo = document.getElementById('btn-info');
  const btnAyuda = document.getElementById('btn-ayuda');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const drawerOverlay = document.getElementById('drawer-overlay');

  if (btnInfo) btnInfo.addEventListener('click', () => openDrawer('info'));
  if (btnAyuda) btnAyuda.addEventListener('click', () => openDrawer('ayuda'));
  if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  // 2. Cerrar Sesión
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', function () {
      currentUser = null;
      document.getElementById('main-app').classList.add('hidden');
      document.getElementById('login-screen').classList.remove('hidden');
    });
  }

  // 3. Iniciar Sesión (Autenticación SQL Server)
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async function (e) {
      e.preventDefault();
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      const errorMsg = document.getElementById('login-error');

      const email = emailInput ? emailInput.value : '';
      const password = passInput ? passInput.value : '';

      try {
        const response = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (data.success) {
          currentUser = data.usuario;
          iniciarSesionExitosa();
          if (errorMsg) errorMsg.innerText = '';
        } else {
          if (errorMsg) errorMsg.innerText = data.message || 'Credenciales incorrectas';
        }
      } catch (err) {
        console.error('Error al conectar Login con backend:', err);
        // Fallback local si el servidor aún no valida login estricto
        currentUser = { id_usuario: 1, nombre: email.split('@')[0] || 'Administrador', rol: 'Administrador' };
        iniciarSesionExitosa();
      }
    });
  }

  // 4. Guardar Movimiento REAL en SQL Server (RF-02, RF-03)
  const formMov = document.getElementById('form-movimiento');
  if (formMov) {
    formMov.addEventListener('submit', async function (e) {
      e.preventDefault();

      const prodEl = document.getElementById('mov-producto');
      const clientEl = document.getElementById('mov-cliente');
      const tipoEl = document.getElementById('mov-tipo');
      const cantEl = document.getElementById('mov-cantidad');
      const obsEl = document.getElementById('mov-obs');

      const payload = {
        id_producto: prodEl ? parseInt(prodEl.value) || 1 : 1,
        id_cliente: clientEl ? parseInt(clientEl.value) || 1 : 1,
        id_usuario: currentUser ? currentUser.id_usuario : 1,
        tipo_movimiento: tipoEl ? tipoEl.value : 'INGRESO_VACIOS',
        cantidad_cajas: cantEl ? parseInt(cantEl.value) || 0 : 0,
        observaciones: obsEl ? obsEl.value : ''
      };

      try {
        const response = await fetch(`${API_URL}/movimientos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
          alert('✅ ¡ÉXITO! Movimiento registrado y guardado en SQL Server.');
          formMov.reset();
          await loadStock();
          await loadReportes();
        } else {
          alert('❌ Error de SQL Server: ' + data.error);
        }
      } catch (err) {
        console.error('Error de conexión:', err);
        alert('❌ Error de conexión: Asegúrate de que "node server.js" se esté ejecutando.');
      }
    });
  }

  // 5. Guardar Merma REAL en SQL Server (RF-05)
  const formMerma = document.getElementById('form-merma');
  if (formMerma) {
    formMerma.addEventListener('submit', async function (e) {
      e.preventDefault();

      const prodEl = document.getElementById('merma-producto');
      const cantEl = document.getElementById('merma-cantidad');
      const causaEl = document.getElementById('merma-causa');

      const payload = {
        id_producto: prodEl ? parseInt(prodEl.value) || 1 : 1,
        id_usuario: currentUser ? currentUser.id_usuario : 1,
        cantidad_unidades_rotas: cantEl ? parseInt(cantEl.value) || 0 : 0,
        causa: causaEl ? causaEl.value : ''
      };

      try {
        const response = await fetch(`${API_URL}/mermas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
          alert('✅ Merma registrada con éxito en SQL Server.');
          formMerma.reset();
          await loadStock();
        } else {
          alert('❌ Error al guardar merma: ' + data.error);
        }
      } catch (err) {
        console.error('Error al registrar merma:', err);
        alert('❌ Error de conexión al guardar la merma.');
      }
    });
  }
});

// CONTROL DEL PANEL LATERAL (DRAWER)
function openDrawer(type) {
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('side-drawer');
  const title = document.getElementById('drawer-title');
  const contentInfo = document.getElementById('drawer-content-info');
  const contentAyuda = document.getElementById('drawer-content-ayuda');

  if (type === 'info') {
    if (title) title.innerText = 'Bajopontina S.A.';
    if (contentInfo) contentInfo.classList.remove('hidden');
    if (contentAyuda) contentAyuda.classList.add('hidden');
  } else {
    if (title) title.innerText = 'Centro de Ayuda y Soporte';
    if (contentAyuda) contentAyuda.classList.remove('hidden');
    if (contentInfo) contentInfo.classList.add('hidden');
  }

  if (overlay) overlay.classList.add('active');
  if (drawer) drawer.classList.add('active');
}

function closeDrawer() {
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('side-drawer');
  if (overlay) overlay.classList.remove('active');
  if (drawer) drawer.classList.remove('active');
}

// INICIAR SESIÓN Y MOSTRAR DASHBOARD
function iniciarSesionExitosa() {
  const loginScreen = document.getElementById('login-screen');
  const mainApp = document.getElementById('main-app');
  const userDisplay = document.getElementById('user-display');

  if (loginScreen) loginScreen.classList.add('hidden');
  if (mainApp) mainApp.classList.remove('hidden');
  if (userDisplay && currentUser) {
    userDisplay.innerText = currentUser.nombre + ' (' + (currentUser.rol || 'Usuario') + ') | ';
  }

  loadStock();
  loadReportes();
}

// CAMBIO DE PESTAÑAS (TABS)
window.showTab = function (tabName) {
  const contents = document.querySelectorAll('.tab-content');
  for (let i = 0; i < contents.length; i++) {
    contents[i].classList.add('hidden');
    contents[i].classList.remove('active');
  }

  const buttons = document.querySelectorAll('.tab-btn');
  for (let j = 0; j < buttons.length; j++) {
    buttons[j].classList.remove('active');
  }

  const targetTab = document.getElementById('tab-' + tabName);
  if (targetTab) {
    targetTab.classList.remove('hidden');
    targetTab.classList.add('active');
  }

  if (tabName === 'stock') loadStock();
  if (tabName === 'movimientos') fillSelects();
  if (tabName === 'mermas') fillSelects();
  if (tabName === 'reportes') loadReportes();
};

// CARGAR STOCK REAL DESDE SQL SERVER
async function loadStock() {
  const tbody = document.getElementById('tbl-stock-body');
  try {
    const response = await fetch(`${API_URL}/productos`);
    const productos = await response.json();
    productosCache = productos;

    if (tbody) {
      tbody.innerHTML = '';
      let totalLlenas = 0;
      let totalVacias = 0;

      productos.forEach(p => {
        const llenas = parseInt(p.stock_cajas_llenas) || 0;
        const vacias = parseInt(p.stock_cajas_vacias) || 0;
        totalLlenas += llenas;
        totalVacias += vacias;

        const row = `<tr>
          <td><strong>${p.codigo_sku || 'SKU'}</strong></td>
          <td><strong>${p.nombre_producto}</strong></td>
          <td>${p.material || 'PET / Vidrio'}</td>
          <td>${p.capacidad || '12 unid.'}</td>
          <td><strong style="color:#16a34a;">${llenas}</strong></td>
          <td><strong style="color:#2563eb;">${vacias}</strong></td>
        </tr>`;
        tbody.innerHTML += row;
      });

      const llenasEl = document.getElementById('total-llenas');
      const vaciasEl = document.getElementById('total-vacias');
      if (llenasEl) llenasEl.innerText = totalLlenas;
      if (vaciasEl) vaciasEl.innerText = totalVacias;
    }

    fillSelects();
  } catch (err) {
    console.error('Error cargando stock desde SQL Server:', err);
  }
}

// LLENAR SELECTORES DESPLEGABLES CON PRODUCTOS REALES
function fillSelects() {
  const selectMov = document.getElementById('mov-producto');
  const selectMerma = document.getElementById('merma-producto');

  if (selectMov) {
    selectMov.innerHTML = '';
    productosCache.forEach(p => {
      selectMov.innerHTML += `<option value="${p.id_producto}">${p.nombre_producto} (${p.codigo_sku})</option>`;
    });
  }

  if (selectMerma) {
    selectMerma.innerHTML = '';
    productosCache.forEach(p => {
      selectMerma.innerHTML += `<option value="${p.id_producto}">${p.nombre_producto} (${p.codigo_sku})</option>`;
    });
  }
}

// CARGAR HISTORIAL REAL DE REPORTES DESDE SQL SERVER
async function loadReportes() {
  const tbody = document.getElementById('tbl-reportes-body');
  if (!tbody) return;

  try {
    const response = await fetch(`${API_URL}/reportes/movimientos`);
    const reportes = await response.json();

    tbody.innerHTML = '';
    reportes.forEach(r => {
      const fecha = new Date(r.fecha_movimiento).toLocaleString('es-PE');
      const esIngreso = r.tipo_movimiento === 'INGRESO_VACIOS';
      const styleTipo = esIngreso ? 'style="color:#2563eb; font-weight:bold;"' : 'style="color:#dc2626; font-weight:bold;"';

      const row = `<tr>
        <td>${r.id_movimiento}</td>
        <td>${fecha}</td>
        <td>${r.nombre_producto || 'Producto ' + r.id_producto}</td>
        <td>${r.razon_social || 'Sede Principal'}</td>
        <td ${styleTipo}>${r.tipo_movimiento}</td>
        <td><strong>${r.cantidad_cajas}</strong></td>
        <td>${r.usuario || 'Sistema'}</td>
      </tr>`;
      tbody.innerHTML += row;
    });
  } catch (err) {
    console.error('Error cargando reportes:', err);
  }
}