const sql = require('mssql');

// Cambia solo estos valores si quieres probar otra combinación
const configs = [
    {
        nombre: 'Instancia SQLPROYECTO (por nombre de instancia, sin puerto fijo)',
        config: {
            user: 'sa',
            password: 'FocusCRM2026',
            server: 'localhost',
            database: 'DB_Bajopontina_PA2',
            options: {
                instanceName: 'SQLPROYECTO',
                encrypt: false,
                trustServerCertificate: true
            },
            connectionTimeout: 8000
        }
    },
    {
        nombre: 'Instancia default (puerto 1433, sin cifrado)',
        config: {
            user: 'sa',
            password: 'FocusCRM2026',
            server: '127.0.0.1',
            port: 1433,
            database: 'DB_Bajopontina_PA2',
            options: { encrypt: false, trustServerCertificate: true },
            connectionTimeout: 5000
        }
    }
];

async function probar(nombre, config) {
    console.log(`\n--- Probando: ${nombre} ---`);
    try {
        const pool = await sql.connect(config);
        console.log('✅ CONEXIÓN EXITOSA');
        const result = await pool.request().query('SELECT @@VERSION AS version');
        console.log('Versión de SQL Server:', result.recordset[0].version.split('\n')[0]);
        await pool.close();
    } catch (err) {
        console.log('❌ FALLÓ');
        console.log('Mensaje:', err.message);
        console.log('Código:', err.code);
        if (err.originalError) {
            console.log('Error original:', err.originalError.message);
        }
    }
}

(async () => {
    for (const { nombre, config } of configs) {
        await probar(nombre, config);
    }
    process.exit(0);
})();