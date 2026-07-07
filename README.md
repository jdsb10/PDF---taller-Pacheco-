# Taller Pacheco — Cotizaciones

App sencilla para generar cotizaciones en PDF con el formato de Taller Pacheco.

## Cómo correrla

```bash
npm install
npm start
```

Luego abre `http://localhost:3000` en el navegador.

## Login por defecto

- **Correo:** jahn@taller.com
- **Contraseña:** tallerpacheco+

La contraseña se puede cambiar desde la app (botón "Cambiar contraseña" en la barra superior). El cambio se guarda en `server/data/credentials.json`, que se crea automáticamente la primera vez que se corre el servidor.

## Logo

El encabezado del PDF usa `server/assets/logo.png` si el archivo existe. Mientras no se agregue el logo real, se muestra un encabezado de texto ("TALLER PACHECO") como reemplazo.
