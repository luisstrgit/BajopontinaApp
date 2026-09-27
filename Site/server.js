const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(express.static('.'));

// Configuración de conexión a SQL Server
const dbConfig = {
    user: 'sa',
    password: 'FocusCRM2026',
    server: '127.0.0.1',
    port: 56719,
    database: 'DB_Bajopontina_PA2',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Pool de conexión global
let pool;

// Inicialización de la conexión con SQL Server
async function initDbConnection() {
    try {
        pool = await sql.connect(dbConfig);
        console.log('==================================================');
        console.log('  CONEXIÓN EXITOSA A SQL SERVER: DB_Bajopontina_PA2');
        console.log('==================================================');
    } catch (err) {
        console.error('❌ Error de conexión a SQL Server:', err.message);
    }
}
initDbConnection();

// ==========================================
// 1. MÓDULO DE LOGIN (RF-01)
// ==========================================
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, password)
            .query('SELECT id_usuario, nombre, email, rol FROM dbo.Usuarios WHERE email = @email AND password = @password');

        if (result.recordset.length > 0) {
            res.json({ success: true, usuario: result.recordset[0] });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 2. MÓDULO DE CONTROL DE STOCK Y PRODUCTOS (RF-04)
// ==========================================
app.get('/api/productos', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT * FROM dbo.Productos_Envases');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 3. MÓDULO DE MOVIMIENTOS - INGRESO Y SALIDA (RF-02, RF-03)
// ==========================================
app.post('/api/movimientos', async (req, res) => {
    let { id_producto, id_cliente, id_usuario, tipo_movimiento, cantidad_cajas, observaciones } = req.body;

    // Normalización y sanitización de datos de entrada
    id_producto = parseInt(id_producto) || 1;
    id_cliente = parseInt(id_cliente) || 1;
    id_usuario = parseInt(id_usuario) || 1;
    cantidad_cajas = parseInt(cantidad_cajas) || 0;

    // Estandarizar tipo de movimiento
    let tipoNormalizado = 'INGRESO_VACIOS';
    if (tipo_movimiento) {
        const str = String(tipo_movimiento).toUpperCase();
        if (str.includes('SALIDA') || str.includes('LLENOS')) {
            tipoNormalizado = 'SALIDA_LLENOS';
        } else {
            tipoNormalizado = 'INGRESO_VACIOS';
        }
    }

    try {
        // 1. Guardar el movimiento en la bitácora
        await pool.request()
            .input('id_producto', sql.Int, id_producto)
            .input('id_cliente', sql.Int, id_cliente)
            .input('id_usuario', sql.Int, id_usuario)
            .input('tipo_movimiento', sql.NVarChar, tipoNormalizado)
            .input('cantidad_cajas', sql.Int, cantidad_cajas)
            .input('observaciones', sql.NVarChar, observaciones || '')
            .query(`
                INSERT INTO dbo.Movimientos (id_producto, id_cliente, id_usuario, tipo_movimiento, cantidad_cajas, fecha_movimiento, observaciones)
                VALUES (@id_producto, @id_cliente, @id_usuario, @tipo_movimiento, @cantidad_cajas, GETDATE(), @observaciones)
            `);

        // 2. Actualizar stock en tiempo real
        if (tipoNormalizado === 'INGRESO_VACIOS') {
            await pool.request()
                .input('id_producto', sql.Int, id_producto)
                .input('cantidad', sql.Int, cantidad_cajas)
                .query('UPDATE dbo.Productos_Envases SET stock_cajas_vacias = stock_cajas_vacias + @cantidad WHERE id_producto = @id_producto');
        } else if (tipoNormalizado === 'SALIDA_LLENOS') {
            await pool.request()
                .input('id_producto', sql.Int, id_producto)
                .input('cantidad', sql.Int, cantidad_cajas)
                .query('UPDATE dbo.Productos_Envases SET stock_cajas_llenas = stock_cajas_llenas - @cantidad WHERE id_producto = @id_producto');
        }

        console.log(`[SQL OK] Movimiento insertado con éxito: ${cantidad_cajas} cajas (${tipoNormalizado})`);
        res.json({ success: true, message: 'Movimiento registrado y stock actualizado en SQL Server' });

    } catch (err) {
        console.error('❌ Error SQL al insertar movimiento:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 4. MÓDULO DE MERMAS (RF-05)
// ==========================================
app.post('/api/mermas', async (req, res) => {
    let { id_producto, id_usuario, cantidad_unidades_rotas, causa } = req.body;

    id_producto = parseInt(id_producto) || 1;
    id_usuario = parseInt(id_usuario) || 1;
    cantidad_unidades_rotas = parseInt(cantidad_unidades_rotas) || 0;

    try {
        await pool.request()
            .input('id_producto', sql.Int, id_producto)
            .input('id_usuario', sql.Int, id_usuario)
            .input('cantidad_unidades_rotas', sql.Int, cantidad_unidades_rotas)
            .input('causa', sql.NVarChar, causa || 'Rotura en almacén')
            .query('INSERT INTO dbo.Mermas (id_producto, id_usuario, cantidad_unidades_rotas, causa) VALUES (@id_producto, @id_usuario, @cantidad_unidades_rotas, @causa)');

        res.json({ success: true, message: 'Merma registrada con éxito' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 5. MÓDULO DE REPORTES (RF-06)
// ==========================================
app.get('/api/reportes/movimientos', async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT m.id_movimiento, p.nombre_producto, c.razon_social, u.nombre AS usuario,
                   m.tipo_movimiento, m.cantidad_cajas, m.fecha_movimiento, m.observaciones
            FROM dbo.Movimientos m
            LEFT JOIN dbo.Productos_Envases p ON m.id_producto = p.id_producto
            LEFT JOIN dbo.Clientes_Sedes c ON m.id_cliente = c.id_cliente
            LEFT JOIN dbo.Usuarios u ON m.id_usuario = u.id_usuario
            ORDER BY m.fecha_movimiento DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Inicialización del servidor HTTP
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor de Bajopontina ejecutándose en http://localhost:${PORT}`);
});