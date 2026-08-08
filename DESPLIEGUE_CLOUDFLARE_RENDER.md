# Despliegue: Cloudflare Pages + Render

## 1. Base de datos

La API usa SQL Server. Crea una base SQL Server accesible desde Internet y aplica el esquema/datos que hoy tienes en `ERP_REPUESTOS`. No subas la cadena de conexión al repositorio. La migración incluida (`InitialCreate`) sólo crea `Productos`; por ello, para conservar todos los módulos, exporta e importa la base existente completa con SQL Server Management Studio o Azure Data Studio. No ejecutes migraciones automáticas en producción hasta completar el historial de migraciones.

La cadena que se debe configurar en Render tiene este formato:

```text
Server=tcp:HOST,1433;Initial Catalog=ERP_REPUESTOS;User ID=USUARIO;Password=CONTRASENA;Encrypt=True;TrustServerCertificate=False;
```

## 2. API en Render

1. Sube este repositorio a GitHub/GitLab.
2. En Render selecciona **New > Blueprint** y el repositorio. Detectará `render.yaml`.
3. Antes del primer despliegue, asigna estos secretos en el servicio:
   - `ConnectionStrings__DefaultConnection`: cadena de SQL Server.
   - `Cors__AllowedOrigins`: URL del frontend, por ejemplo `https://erp-repuestos.pages.dev`.
4. Despliega y verifica `https://TU-API.onrender.com/health`.

## 3. Frontend en Cloudflare Pages

1. En Cloudflare: **Workers & Pages > Create application > Pages > Connect to Git**.
2. Selecciona el repositorio y usa:
   - **Root directory**: `ERP.Frontend`
   - **Build command**: `npm ci && npm run build`
   - **Build output directory**: `dist`
3. En **Settings > Environment variables**, agrega para Production:

```text
VITE_API_URL=https://TU-API.onrender.com/api
```

4. Despliega. Copia la URL `https://TU-PROYECTO.pages.dev` y configúrala en `Cors__AllowedOrigins` de Render. Luego redeploy de la API.

## Orden de validación

1. `GET /health` devuelve `Healthy`.
2. Abre el frontend y carga Productos, Clientes y Proveedores.
3. Crea un registro de prueba y confirma que se guarda en la base de nube.
4. Prueba a 360 px, 390 px y escritorio antes de compartir el enlace.
