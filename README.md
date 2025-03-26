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

```

### **3️⃣ Instalar dependencias**

```bash
npm install

```

### **4️⃣ Ejecutar el proyecto en local**

```bash
npm run dev

```

----------

## 🔧 Despliegue (en proceso)

El despliegue se realizará en **Vercel** para la aplicación y **Neon** para la base de datos. 🚀

----------

## 📝 Mantenimiento y Administración

-   **Base de datos**: Actualmente en PostgreSQL. Se planea migrar a Neon.
    
-   **Autenticación**: Usando Google con `Auth.js`.
    
-   **Envío de emails**: Implementado con **Resend**.
    

⚠️ _Si realizas cambios en la API o la estructura de datos, recuerda actualizar la documentación._

----------

## 📌 Notas Internas

-   No hay documentación formal aún. Se recomienda crear una carpeta `/docs` para ello.
    
-   Se evaluará la configuración de CI/CD para automatizar el despliegue.
