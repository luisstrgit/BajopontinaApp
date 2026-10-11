require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro_bajopontina';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Configuración de conexión a SQL Server leyendo tu archivo .env intacto
const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'DB_Bajopontina_PA2',
  ...(process.env.DB_USER ? {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  } : {}),
  options: {
    instanceName: process.env.DB_INSTANCE || undefined,
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' || true,
    trustedConnection: !process.env.DB_USER
  }
};

sql.connect(dbConfig).then(pool => {
  console.log('✅ Conectado a SQL Server');
  app.locals.db = pool;
}).catch(err => {
  console.error('❌ Error al conectar a SQL Server:', err.message);
});

// MIDDLEWARES DE SEGURIDAD (JWT Y RBAC)
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Token no proporcionado' });

  jwt.verify(token, JWT_SECRET, (err, usuario) => {
    if (err) return res.status(403).json({ success: false, message: 'Token invalido o expirado' });
    req.usuario = usuario;
    next();
  });
}

function verificarRol(rolRequerido) {
  return (req, res, next) => {
    if (!req.usuario || req.usuario.rol !== rolRequerido) {
      return res.status(403).json({ success: false, message: 'Acceso denegado: Rol insuficiente' });
    }
    next();
  };
}

// RATE LIMITER EN MEMORIA PARA LOGIN (PARA IMAGEN 19)
const intentosLogin = {};
function rateLimiterLogin(req, res, next) {
  const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const ahora = Date.now();
  
  if (!intentosLogin[clientIp] || ahora > intentosLogin[clientIp].resetTime) {
    intentosLogin[clientIp] = { count: 0, resetTime: ahora + 60000 }; // Se reinicia cada 1 minuto
  }
  
  intentosLogin[clientIp].count++;
  
  if (intentosLogin[clientIp].count > 5) {
    return res.status(429).json({ success: false, message: 'Demasiados intentos fallidos. Bloqueado temporalmente.' });
  }
  next();
}

// API LOGIN (Autenticación con Rate Limiter y Status HTTP 401)
app.post('/api/login', rateLimiterLogin, async (req, res) => {
  const { email, password } = req.body;
  try {
    const pool = app.locals.db;
    if (!pool) {
      return res.status(500).json({ success: false, message: 'No hay conexión activa con SQL Server' });
    }

    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM dbo.Usuarios WHERE email = @email');

    if (result.recordset.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const usuario = result.recordset[0];
    const match = await bcrypt.compare(password, usuario.password);

    // Soporta tanto contraseña encriptada (bcrypt) como texto plano
    if (!match && password !== usuario.password) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id_usuario: usuario.id_usuario, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error en el servidor', error: err.message });
  }
});

// RUTAS PROTEGIDAS PARA USUARIOS (/api/usuarios)
app.get('/api/usuarios', verificarToken, verificarRol('Administrador'), async (req, res) => {
  try {
    const pool = app.locals.db;
    const result = await pool.request().query('SELECT id_usuario, nombre, email, rol FROM dbo.Usuarios');
    res.json({ success: true, usuarios: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/usuarios', verificarToken, verificarRol('Administrador'), async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  try {
    const pool = app.locals.db;
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.request()
      .input('nombre', sql.NVarChar, nombre)
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashedPassword)
      .input('rol', sql.NVarChar, rol || 'Almacenero')
      .query('INSERT INTO dbo.Usuarios (nombre, email, password, rol) VALUES (@nombre, @email, @password, @rol)');

    res.json({ success: true, message: 'Usuario creado correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al crear usuario', error: err.message });
  }
});

// RUTAS DE LA APLICACIÓN WEB (Stock, Movimientos, Mermas, Reportes)
app.get('/api/productos', async (req, res) => {
  try {
    const pool = app.locals.db;
    const result = await pool.request().query('SELECT * FROM dbo.Productos_Envases');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/movimientos', async (req, res) => {
  const { id_producto, id_cliente, id_usuario, tipo_movimiento, cantidad_cajas, observaciones } = req.body;
  try {
    const pool = app.locals.db;
    await pool.request()
      .input('id_producto', sql.Int, id_producto)
      .input('id_cliente', sql.Int, id_cliente)
      .input('id_usuario', sql.Int, id_usuario)
      .input('tipo_movimiento', sql.VarChar, tipo_movimiento)
      .input('cantidad_cajas', sql.Int, cantidad_cajas)
      .input('observaciones', sql.VarChar, observaciones)
      .query(`INSERT INTO dbo.Movimientos (id_producto, id_cliente, id_usuario, tipo_movimiento, cantidad_cajas, observaciones)
             VALUES (@id_producto, @id_cliente, @id_usuario, @tipo_movimiento, @cantidad_cajas, @observaciones)`);
    res.json({ success: true, message: 'Movimiento registrado correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/mermas', async (req, res) => {
  const { id_producto, id_usuario, cantidad_unidades_rotas, causa } = req.body;
  try {
    const pool = app.locals.db;
    await pool.request()
      .input('id_producto', sql.Int, id_producto)
      .input('id_usuario', sql.Int, id_usuario)
      .input('cantidad_unidades_rotas', sql.Int, cantidad_unidades_rotas)
      .input('causa', sql.VarChar, causa)
      .query(`INSERT INTO dbo.Mermas (id_producto, id_usuario, cantidad_unidades_rotas, causa)
             VALUES (@id_producto, @id_usuario, @cantidad_unidades_rotas, @causa)`);
    res.json({ success: true, message: 'Merma registrada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reportes/movimientos', async (req, res) => {
  try {
    const pool = app.locals.db;
    const result = await pool.request().query(`
      SELECT m.id_movimiento, m.fecha_movimiento, p.nombre_producto, c.razon_social, m.tipo_movimiento, m.cantidad_cajas, u.nombre AS usuario
      FROM dbo.Movimientos m
      LEFT JOIN dbo.Productos_Envases p ON m.id_producto = p.id_producto
      LEFT JOIN dbo.Clientes c ON m.id_cliente = c.id_cliente
      LEFT JOIN dbo.Usuarios u ON m.id_usuario = u.id_usuario
      ORDER BY m.fecha_movimiento DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en http://localhost:3000`);
});