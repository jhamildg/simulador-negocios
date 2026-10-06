# Simulador de Negocios: aplicación pública

Juego de gestión empresarial de cinco años con cuentas de usuario, partidas guardadas, historial, logros y panel de administrador.

## Estructura

```
frontend/   Página del simulador (un solo index.html: motor del juego + pantallas de cuenta). No contiene secretos.
backend/    Servidor Node.js: API, registro, inicio de sesión, sesiones, permisos y acceso a la base de datos.
            server.js       rutas y seguridad
            db.js           esquema y conexión (PostgreSQL o SQLite)
            make-admin.js   da rol ADMIN a una cuenta
            test/           pruebas de la API
            .env.example    variables de entorno de ejemplo
render.yaml Despliegue en Render (servicio web + PostgreSQL)
Dockerfile  Despliegue en cualquier hosting que acepte contenedores
```

El backend sirve también el frontend, así que todo queda bajo un mismo dominio (`https://tu-dominio`), sin configurar CORS.

## Probar en tu computadora

Necesitas Node.js 22.5 o superior.

```
cd backend
npm start
```

Abre http://localhost:3000. Sin configurar nada, los datos se guardan en `backend/data/simulador.db` (SQLite).
Para ejecutar las pruebas: `npm test`.

## Base de datos

- **PostgreSQL** (recomendado en producción): define `DATABASE_URL` y ejecuta `npm install` (instala el conector `pg`).
- **SQLite** (integrado en Node, sin instalar nada): se usa si no hay `DATABASE_URL`. En un hosting, `SQLITE_PATH` debe apuntar a un disco persistente; si no, los datos se pierden en cada reinicio.

Tablas: `users`, `sessions`, `games`, `game_decisions`, `user_achievements`. Se crean solas al arrancar.

## Variables de entorno

Están descritas en `backend/.env.example`. En local copia ese archivo como `backend/.env`; en el hosting cárgalas en su panel. No subas el `.env` real al repositorio.

## Ponerlo en línea (ejemplo con Render)

1. Sube esta carpeta a un repositorio de GitHub.
2. En Render elige **New → Blueprint** y selecciona el repositorio: `render.yaml` crea el servicio web y la base PostgreSQL y conecta `DATABASE_URL`.
3. Cuando termine, abre la dirección pública y **crea tu cuenta** con tu correo.
4. En el servicio, define `ADMIN_EMAILS` con ese correo y reinicia el servicio: tu cuenta queda como administrador.
5. Opcional: conecta tu propio dominio desde el panel del hosting.

Otros hostings (Railway, Fly.io, un VPS): usa el `Dockerfile` o los comandos `npm install` y `npm start` dentro de `backend`, con las mismas variables.

## Administrador

El rol se guarda en la base y se comprueba en el servidor en cada petición. Dos formas de asignarlo, siempre a una cuenta ya registrada:

- variable `ADMIN_EMAILS` (se aplica al arrancar), o
- `npm run make-admin -- correo@ejemplo.com` desde la carpeta `backend`.

Regístrate tú primero con ese correo antes de publicar el enlace: no hay verificación de correo.

## Seguridad

- Contraseñas: solo se guarda un hash scrypt con sal aleatoria por usuario. Nunca viajan de vuelta al navegador.
- Sesión: token aleatorio en una cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción; en la base se guarda solo el hash del token. Cerrar sesión la elimina en el servidor.
- Permisos: cada consulta de partidas filtra por el usuario de la sesión; el panel de administrador exige rol ADMIN en el servidor.
- Consultas parametrizadas, validación de entradas, límite de intentos de acceso, cabeceras de seguridad y rechazo de peticiones de otros sitios.

## Limitaciones conocidas

- No hay verificación de correo ni recuperación de contraseña (requieren un servicio de envío de correos).
- El juego se calcula en el navegador: el servidor valida la forma de los datos y a quién pertenecen, pero un usuario con conocimientos técnicos podría falsear los resultados de sus propias partidas. No afecta a las cuentas ni a las partidas de otros.
- El límite de intentos de acceso se guarda en memoria: se reinicia con el servidor y no se comparte entre varias instancias.
