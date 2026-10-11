// hash-passwords.js - Cifra con bcrypt las contrasenas que aun esten en texto plano.
// Uso:  node hash-passwords.js
require('dotenv').config();
const sql = require('mssql');
const bcrypt = require('bcryptjs');

const cfg = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'DB_Bajopontina_PA2',
  options: {
    instanceName: process.env.DB_INSTANCE,
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true
  }
};

(async () => {
  const pool = await sql.connect(cfg);
  const r = await pool.request().query('SELECT id_usuario, email, password FROM dbo.Usuarios');
  for (const u of r.recordset) {
    if (/^\$2[aby]\$/.test(u.password)) { console.log('Ya cifrada : ' + u.email); continue; }
    const hash = await bcrypt.hash(u.password, 10);
    await pool.request()
      .input('id', sql.Int, u.id_usuario)
      .input('h', sql.NVarChar, hash)
      .query('UPDATE dbo.Usuarios SET password = @h WHERE id_usuario = @id');
    console.log('Cifrada ahora: ' + u.email);
  }
  await pool.close();
  console.log('Proceso terminado.');
})().catch(e => { console.error('Error:', e.message); process.exit(1); });