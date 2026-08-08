# ERP Repuestos Frontend

Aplicacion React con Vite para consumir el backend de productos.

## Ejecutar

```powershell
npm install
npm run dev
```

La aplicacion abre en `http://localhost:5173` y redirige las llamadas `/api` al backend en `http://localhost:5107`.

## Backend esperado

Ejecutar el API desde la raiz del repositorio:

```powershell
dotnet run --project ERP.API --launch-profile http
```

Swagger queda disponible en `http://localhost:5107/swagger`.
