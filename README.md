# Taller Pacheco — Cotizaciones

App sencilla para generar cotizaciones en PDF con el formato de Taller Pacheco.

## Cómo correrla

```bash
npm install
npm start
```

Luego abre `http://localhost:3000` en el navegador.


La contraseña se puede cambiar desde la app (botón "Cambiar contraseña" en la barra superior). El cambio se guarda en `server/data/credentials.json`, que se crea automáticamente la primera vez que se corre el servidor.

## Logo

El encabezado del PDF usa `server/assets/logo.png` si el archivo existe. Mientras no se agregue el logo real, se muestra un encabezado de texto ("TALLER PACHECO") como reemplazo.

## Desplegar en producción

Esta app es un servidor Node/Express normal (`app.listen`), con la sesión de login en memoria y la contraseña guardada en un archivo local. Por eso **no funciona en Vercel** (solo corre sitios estáticos o funciones serverless, sin disco persistente ni servidor de larga duración). Hay que usar una plataforma que corra un servidor Node tradicional, por ejemplo **Render**:

1. Crea una cuenta en [render.com](https://render.com) y conecta tu cuenta de GitHub.
2. En el dashboard elige **New > Blueprint** y selecciona este repositorio. Render detecta el archivo `render.yaml` de la raíz y crea el servicio automáticamente (build `npm install`, start `npm start`, plan gratis).
   - Si prefieres configurarlo a mano en vez de usar el Blueprint: **New > Web Service**, elige el repo, y pon como *Build Command* `npm install` y como *Start Command* `npm start`.
3. Cuando termine el despliegue, Render te da una URL tipo `https://taller-pacheco-cotizaciones.onrender.com` — esa es la app.

Nota: en el plan gratis de Render el servicio "duerme" tras un rato sin uso; la primera carga después de eso tarda unos 30-50 segundos en responder mientras despierta.
