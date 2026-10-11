// CONFIGURACION E INICIALIZACION CONEXION CON NODE.JS / SQL SERVER
const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let authToken = null; // Token JWT que entrega el servidor al iniciar sesion
let productosCache = [];

// Guarda el fetch original y luego lo reemplaza por uno que agrega el token solo
const fetchOriginal = fetch.bind(window);

window.fetch = function (url, options) {
  options = options || {};
  if (authToken && String(url).indexOf(API_URL) === 0) {
    options.headers = Object.assign({}, options.headers, { Authorization: 'Bearer ' + authToken });
  }
  return fetchOriginal(url, options);
};

// ESC: evita ataques XSS
function esc(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// EVENTOS AL CARGAR LA PAGINA
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

  // 2. Cerrar Sesion
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', function () {
      currentUser = null;
      authToken = null;
      document.getElementById('main-app').classList.add('hidden');
      document.getElementById('login-screen').classList.remove('hidden');
    });
  }

  // 3. Iniciar Sesion (Autenticacion SQL Server + token JWT)
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
          authToken = data.token;
          iniciarSesionExitosa();
          if (errorMsg) errorMsg.innerText = '';
        } else {
          if (errorMsg) errorMsg.innerText = data.message || 'Credenciales incorrectas';
        }
      } catch (err) {
        console.error('Error al conectar Login con backend:', err);
        if (errorMsg) errorMsg.innerText = 'No se pudo conectar con el servidor. Ejecuta: node server.js';
      }
    });
  }

  // 4. Guardar Movimiento REAL en SQL Server
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
          alert('EXITO: Movimiento registrado y guardado en SQL Server.');
          formMov.reset();
          await loadStock();
          await loadReportes();
        } else {
          alert('Error: ' + (data.error || data.message));
        }
      } catch (err) {
        console.error('Error de conexion:', err);
        alert('Error de conexion: Asegurate de que "node server.js" se este ejecutando.');
      }
    });
  }

  // 5. Guardar Merma REAL en SQL Server
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
          alert('EXITO: Merma registrada en SQL Server.');
          formMerma.reset();
          await loadStock();
        } else {
          alert('Error al guardar merma: ' + (data.error || data.message));
        }
      } catch (err) {
        console.error('Error al registrar merma:', err);
        alert('Error de conexion al guardar la merma.');
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

  if (overlay) overlay.classList.add('open');
  if (drawer) drawer.classList.add('open');
}

function closeDrawer() {
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('side-drawer');
  if (overlay) overlay.classList.remove('open');
  if (drawer) drawer.classList.remove('open');
}

// INICIAR SESION Y MOSTRAR DASHBOARD
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

// CAMBIO DE PESTANAS (TABS)
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
    if (!response.ok) throw new Error('Respuesta ' + response.status);
    const productos = await response.json();
    productosCache = productos;

    if (tbody) {
      let html = '';
      let totalLlenas = 0;
      let totalVacias = 0;

      productos.forEach(p => {
        const llenas = parseInt(p.stock_cajas_llenas) || 0;
        const vacias = parseInt(p.stock_cajas_vacias) || 0;
        totalLlenas += llenas;
        totalVacias += vacias;

        html += `<tr>
          <td><strong>${esc(p.codigo_sku || 'SKU')}</strong></td>
          <td><strong>${esc(p.nombre_producto)}</strong></td>
          <td>${esc(p.material || 'PET / Vidrio')}</td>
          <td>${esc(p.capacidad || '12 unid.')}</td>
          <td><strong style="color:#16a34a;">${llenas}</strong></td>
          <td><strong style="color:#2563eb;">${vacias}</strong></td>
        </tr>`;
      });
      tbody.innerHTML = html;

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

  let opciones = '';
  productosCache.forEach(p => {
    opciones += `<option value="${esc(p.id_producto)}">${esc(p.nombre_producto)} (${esc(p.codigo_sku)})</option>`;
  });
  if (selectMov) selectMov.innerHTML = opciones;
  if (selectMerma) selectMerma.innerHTML = opciones;
}

// CARGAR HISTORIAL REAL DE REPORTES DESDE SQL SERVER
async function loadReportes() {
  const tbody = document.getElementById('tbl-reportes-body');
  if (!tbody) return;

  try {
    const response = await fetch(`${API_URL}/reportes/movimientos`);
    if (!response.ok) throw new Error('Respuesta ' + response.status);
    const reportes = await response.json();

    let html = '';
    reportes.forEach(r => {
      const fecha = new Date(r.fecha_movimiento).toLocaleString('es-PE');
      const esIngreso = r.tipo_movimiento === 'INGRESO_VACIOS';
      const styleTipo = esIngreso ? 'style="color:#2563eb; font-weight:bold;"' : 'style="color:#dc2626; font-weight:bold;"';

      html += `<tr>
        <td>${esc(r.id_movimiento)}</td>
        <td>${esc(fecha)}</td>
        <td>${esc(r.nombre_producto || 'Producto ' + r.id_producto)}</td>
        <td>${esc(r.razon_social || 'Sede Principal')}</td>
        <td ${styleTipo}>${esc(r.tipo_movimiento)}</td>
        <td><strong>${esc(r.cantidad_cajas)}</strong></td>
        <td>${esc(r.usuario || 'Sistema')}</td>
      </tr>`;
    });
    tbody.innerHTML = html;
  } catch (err) {
    console.error('Error cargando reportes:', err);
  }
}