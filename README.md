# ![Lingowow Logo](https://yt3.ggpht.com/MQLQ3Crl2-qmBiapRO0shemkdUDvHP-csNHbRrRWUpnZ4qVs_jrpnRdsKB4WjbnzZrLHIDRvhQ=s68-c-k-c0x00ffffff-no-rj) 
# Lingowow - Campus Virtual

**Lingowow** es el campus virtual de nuestra academia de idiomas en línea. Desde aquí, estudiantes, profesores, administradores e invitados pueden interactuar con los cursos y gestionar diversas funciones.

## ✨ Características

🔹 **Estudiantes**:

-   Acceden a los contenidos de sus cursos.
    
-   Agendan clases con sus profesores.
    
-   Ven grabaciones de sus sesiones.
    

🔹 **Profesores**:

-   Administran sus horarios de disponibilidad.
    
-   Consultan sus ingresos según estudiantes y programas.
    

🔹 **Invitados**:

-   Pueden ver previews de los cursos.
    
-   Acceden a la tienda de productos y programas.
    

🔹 **Administradores**:

-   Gestionan cursos, productos e inscripciones.
    
-   Revisan métricas de ventas, clases e ingresos.
    
-   Agendan clases a profesores y generan facturas.
    

----------

## 🏗️ Tecnologías Usadas

-   **Next.js** - Framework para la aplicación web.
    
-   **Prisma** - ORM para gestionar la base de datos.
    
-   **Auth.js** - Autenticación de usuarios.
    
-   **PostgreSQL** - Base de datos.
    
-   **Resend** - API de emails transaccionales.
    
-   **Jitsi JaaS** - Plataforma de videollamadas para clases en vivo.
    

----------

## 📂 Estructura del Proyecto

```
/app        # Rutas y vistas principales  
/components # Componentes reutilizables de la UI  
/lib        # Helpers y funciones auxiliares  
/prisma     # Definiciones del esquema de la base de datos  
/public     # Archivos estáticos  
/scripts    # Scripts útiles para mantenimiento  
.env.example # Variables de entorno necesarias  

```

----------

## 🚀 Instalación y Ejecución

Usa Node.js 24 (`.nvmrc`) y npm 11. Las comprobaciones de CI y los nuevos entornos
de dev usan esa misma versión de Node. Al actualizar un entorno existente en
Coolify, configura `NIXPACKS_NODE_VERSION=24` antes del siguiente despliegue;
cambiar esa variable no requiere reiniciar la aplicación en ejecución.

### **1️⃣ Clonar el repositorio**

```bash
git clone https://github.com/tu-usuario/lingowow.git
cd lingowow

```

### **2️⃣ Configurar variables de entorno**

Crea un archivo `.env` en la raíz con el siguiente formato:

```env
DATABASE_URL=tu_database_url
AUTH_GOOGLE_ID=tu_google_id
AUTH_GOOGLE_SECRET=tu_google_secret
RESEND_API_KEY=tu_resend_api_key
AUTH_SECRET=tu_auth_secret
JWT_SECRET=tu_jwt_secret
NEXT_PUBLIC_DOMAIN=tu_dominio

# Jitsi JaaS - Requerido para videollamadas
NEXT_PUBLIC_JAAS_APP_ID=tu_jaas_app_id
JAAS_APP_ID=tu_jaas_app_id
JAAS_KID=tu_jaas_key_id
JAAS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTu clave privada aquí\n-----END PRIVATE KEY-----"

```

> **Nota**: Para obtener las credenciales de Jitsi JaaS, regístrate en [https://jaas.8x8.vc/](https://jaas.8x8.vc/) y crea una aplicación. Las credenciales se encuentran en la sección de configuración de tu aplicación.

### **3️⃣ Instalar dependencias**

```bash
npm install

```

### **4️⃣ Ejecutar el proyecto en local**

```bash
npm run dev

```

----------

## 🔧 Despliegue

La aplicación se despliega en **Coolify**, en el VPS `137.184.8.53`, con PostgreSQL. El flujo de ramas es:

1. Crea una rama de trabajo desde `dev` y abre un pull request hacia `dev`. Las pruebas unitarias, lint y TypeScript deben pasar antes del merge.
2. Cuando el cambio esté listo, abre un pull request de `dev` hacia `main`. La comprobación obligatoria `main-from-dev` solo acepta esa rama desde este mismo repositorio.
3. Al fusionar hacia `dev`, GitHub Actions despliega `https://dev.lingowow.com`. Revisa allí los cambios antes de promoverlos.
4. `main` es la rama de producción. Después de fusionar el pull request `dev` → `main`, GitHub Actions despliega `https://www.lingowow.com`.

Los pull requests hacia `main` desde otra rama se cierran automáticamente por `.github/workflows/branch-policy.yml`. Los pull requests hacia `dev` quedan disponibles para integrar ramas de trabajo.

### Actualizar los datos de dev

En [Actions → Refresh dev data from production](https://github.com/joeldblanco/campus-lingowow/actions/workflows/refresh-dev-data.yml), pulsa **Run workflow** con la rama `dev` seleccionada. La acción reemplaza los datos de pruebas por una copia actual de producción, conserva la copia anterior de dev y solo lee la base de producción.

La copia retira tokens OAuth, claves API, tokens móviles y de recuperación, y tarjetas guardadas. Dev usa secretos de autenticación propios; los envíos, los cobros, las integraciones externas y las tareas programadas de producción no están habilitados allí. Los usuarios con contraseña pueden iniciar sesión con su contraseña habitual; Google OAuth requiere credenciales propias de pruebas.

Los scripts de `scripts/deployment/` se instalan en `/root/lingowow-ci/`. La clave SSH de GitHub Actions tiene un comando forzado que solo acepta despliegues de las ramas `dev`/`main` y la actualización de datos de dev.

----------

## 📝 Mantenimiento y Administración

-   **Base de datos**: PostgreSQL en Coolify; producción y dev usan instancias independientes.
    
-   **Autenticación**: Usando Google con `Auth.js`.
    
-   **Envío de emails**: Implementado con **Resend**.
    

⚠️ _Si realizas cambios en la API o la estructura de datos, recuerda actualizar la documentación._

----------

## 📌 Notas Internas

-   **Documentación de Jitsi**: Ver [JITSI_SETUP.md](./JITSI_SETUP.md) para configuración completa de videollamadas.
    
-   **Solución rápida de errores**: Ver [docs/QUICK_FIX_JITSI_ERROR.md](./docs/QUICK_FIX_JITSI_ERROR.md) para resolver errores de Jitsi.
    
-   CI/CD: `.github/workflows/deploy-environments.yml` valida y despliega `dev` y `main`.
