Sistema Web Bajopontina S.A.
1. Descripción del Proyecto
Aplicación web desarrollada para la gestión operativa y comercial de la empresa Bajopontina S.A., implementando una arquitectura de tres capas conectada a una base de datos relacional.

2. Tecnologías Utilizadas
Frontend: HTML5, CSS3 (Diseño monocromático), JavaScript.

Backend: Node.js, Express.

Base de Datos: Microsoft SQL Server (DB_Bajopontina_PA2).

Control de Versiones: Git / GitHub.

3. Estructura del Repositorio
main: Rama de producción con la versión estable del sistema.

develop: Rama de desarrollo y pruebas continuas.

4. Guía de Instalación y Ejecución
Para ejecutar este proyecto en un entorno local, siga los siguientes pasos:

Prerrequisitos
Tener instalado Node.js.

Tener instalado Microsoft SQL Server Management Studio.

Pasos de Configuración
Clonar el repositorio:

Bash
git clone https://github.com/luisstrgit/BajopontinaApp.git
cd BajopontinaApp/Site
Instalar dependencias:

Bash
npm install
Configurar la Base de Datos:

Abra SQL Server Management Studio.

Ejecute el script SQL ubicado en la ruta sql/Script_BD_Bajopontina.sql para crear la base de datos y las tablas necesarias.

Ejecutar el servidor:

Bash
node server.js
Acceder a la aplicación:

Abra su navegador web e ingrese a http://localhost:3000.

¿Cómo subir este README.md a GitHub?
Sigue estos sencillos pasos en tu Visual Studio Code:

En la carpeta principal de tu proyecto (BajopontinaApp), crea un nuevo archivo llamado exactamente README.md.

Copia todo el texto de arriba, pégalo dentro de ese archivo y guárdalo (Ctrl + S).

Abre tu terminal en VS Code y ejecuta los comandos habituales para subirlo:

Bash
git add .
git commit -m "docs: agregar archivo README limpio y profesional"
git push origin develop
git push origin main
