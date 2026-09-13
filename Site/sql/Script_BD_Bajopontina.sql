CREATE DATABASE DB_Bajopontina_PA2;
GO
USE DB_Bajopontina_PA2;
GO

-- 1. Tabla de Usuarios del Sistema
CREATE TABLE dbo.Usuarios (
    id_usuario INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    password NVARCHAR(255) NOT NULL,
    rol NVARCHAR(50) DEFAULT 'Almacenero',
    fecha_creacion DATETIME DEFAULT GETDATE()
);

-- 2. Tabla de Catálogo de Productos y Envases
CREATE TABLE dbo.Productos_Envases (
    id_producto INT IDENTITY(1,1) PRIMARY KEY,
    codigo_sku NVARCHAR(50) UNIQUE NOT NULL,
    nombre_producto NVARCHAR(100) NOT NULL,
    tipo_material NVARCHAR(50) NOT NULL,
    capacidad_caja INT NOT NULL,
    stock_cajas_llenas INT DEFAULT 0,
    stock_cajas_vacias INT DEFAULT 0
);

-- 3. Tabla de Clientes y Sedes
CREATE TABLE dbo.Clientes_Sedes (
    id_cliente INT IDENTITY(1,1) PRIMARY KEY,
    ruc_dni NVARCHAR(20) NOT NULL,
    razon_social NVARCHAR(150) NOT NULL,
    distrito NVARCHAR(100) NOT NULL,
    zona NVARCHAR(50) NOT NULL
);

-- 4. Tabla de Movimientos (Ingresos de vacíos y Salidas de llenos)
CREATE TABLE dbo.Movimientos (
    id_movimiento INT IDENTITY(1,1) PRIMARY KEY,
    id_producto INT FOREIGN KEY REFERENCES dbo.Productos_Envases(id_producto),
    id_cliente INT FOREIGN KEY REFERENCES dbo.Clientes_Sedes(id_cliente),
    id_usuario INT FOREIGN KEY REFERENCES dbo.Usuarios(id_usuario),
    tipo_movimiento NVARCHAR(20) CHECK (tipo_movimiento IN ('INGRESO_VACIOS', 'SALIDA_LLENOS')),
    cantidad_cajas INT NOT NULL,
    fecha_movimiento DATETIME DEFAULT GETDATE(),
    observaciones NVARCHAR(255)
);

-- 5. Tabla de Registro de Mermas por Botellas Rotas
CREATE TABLE dbo.Mermas (
    id_merma INT IDENTITY(1,1) PRIMARY KEY,
    id_producto INT FOREIGN KEY REFERENCES dbo.Productos_Envases(id_producto),
    id_usuario INT FOREIGN KEY REFERENCES dbo.Usuarios(id_usuario),
    cantidad_unidades_rotas INT NOT NULL,
    causa NVARCHAR(150) NOT NULL,
    fecha_registro DATETIME DEFAULT GETDATE()
);
GO

-- Inserción de Datos Iniciales de Prueba
INSERT INTO dbo.Usuarios (nombre, email, password, rol) VALUES 
('Luis Salazar', 'admin@bajopontina.pe', '123456', 'Administrador');

INSERT INTO dbo.Productos_Envases (codigo_sku, nombre_producto, tipo_material, capacidad_caja, stock_cajas_llenas, stock_cajas_vacias) VALUES
('RET-001', 'Coca-Cola 1.25L', 'Vidrio', 12, 1250, 800),
('RET-002', 'Inca Kola 2.00L', 'Plástico', 9, 2100, 1400),
('RET-003', 'Sprite 1.25L', 'Vidrio', 12, 600, 350);

INSERT INTO dbo.Clientes_Sedes (ruc_dni, razon_social, distrito, zona) VALUES
('20100084511', 'Distribuidora Lima Norte', 'Ate', 'Lima (Huachipa)'),
('20100084522', 'Comercial Huancayo S.A.C.', 'El Tambo', 'Huancayo');
GO