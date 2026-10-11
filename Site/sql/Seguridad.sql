-- =====================================================================
-- seguridad.sql  - Ejecutar en SQL Server Management Studio (SSMS)
-- =====================================================================

-- 1) Usuario de aplicación con MÍNIMOS PRIVILEGIOS (reemplaza al usuario 'sa')
USE master;
GO
CREATE LOGIN bajopontina_app WITH PASSWORD = 'Bp#App2026!Segura', CHECK_POLICY = ON;
GO
USE DB_Bajopontina_PA2;
GO
CREATE USER bajopontina_app FOR LOGIN bajopontina_app;
ALTER ROLE db_datareader ADD MEMBER bajopontina_app;
ALTER ROLE db_datawriter ADD MEMBER bajopontina_app;
DENY CREATE TABLE TO bajopontina_app;     -- no puede crear/alterar estructuras
DENY ALTER ANY SCHEMA TO bajopontina_app;
GO

-- 2) Segundo usuario (rol Almacenero) para probar el control de roles
INSERT INTO dbo.Usuarios (nombre, email, password, rol)
VALUES ('Encargado de Almacén', 'almacen@bajopontina.pe', 'Almacen#2026', 'Almacenero');
GO

-- 3) (Recomendado) Contraseña más fuerte para el administrador, ANTES de cifrar
UPDATE dbo.Usuarios SET password = 'Admin#2026!' WHERE email = 'admin@bajopontina.pe';
GO

-- 4) Verificación: después de ejecutar "node hash-passwords.js" las contraseñas deben empezar con $2
SELECT id_usuario, nombre, email, rol, LEFT(password, 20) AS inicio_password, LEN(password) AS longitud
FROM dbo.Usuarios;
GO

-- 5) Sedes que ofrece el formulario de movimientos (solo se crean si no existen)
IF NOT EXISTS (SELECT 1 FROM dbo.Clientes_Sedes WHERE razon_social = 'Sede Central Huaraz')
  INSERT INTO dbo.Clientes_Sedes (ruc_dni, razon_social, distrito, zona) VALUES ('20100084533', 'Sede Central Huaraz', 'Huaraz', 'Huaraz');
IF NOT EXISTS (SELECT 1 FROM dbo.Clientes_Sedes WHERE razon_social = 'Distribuidora Huancavelica')
  INSERT INTO dbo.Clientes_Sedes (ruc_dni, razon_social, distrito, zona) VALUES ('20100084544', 'Distribuidora Huancavelica', 'Huancavelica', 'Huancavelica');
GO
SELECT * FROM dbo.Clientes_Sedes;
GO