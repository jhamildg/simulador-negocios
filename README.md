# Simulador de Negocios: aplicación pública (V5.2)

Juego de gestión empresarial con cuentas de usuario, partidas guardadas, historial, logros y panel de administrador.
Dirige un negocio durante **12 meses** (25 situaciones) con tres modalidades: Taxi y delivery, Venta de productos y Comida rápida (un pequeño carrito).
Separa la caja del negocio del dinero personal del dueño, lleva inventario, estado de resultados y balance. Detalles en `INFORME_EVOLUCION_SIMULADOR.md`, `MATRIZ_TRAZABILIDAD_DECISIONES.md`, `CHANGELOG_V5.md`, `CHANGELOG_V5_1.md`, `CORRECCIONES_V5_1.md` y, para esta revisión, `CHANGELOG_V5_2.md`, `AUDITORIA_CONTABLE_TRIBUTARIA_V5_2.md`, `TABLA_SITUACIONES_CORREGIDAS_V5_2.md`, `DETALLE_CONTABLE.md`, `RESULTADOS_PRUEBAS_V5_2.md` y `PENDIENTES_V5_2.md`.

## Estructura

```
frontend/   Página del simulador. No contiene secretos.
            index.html                interfaz (Inicio, Simulación, Finanzas, Detalle contable, Progreso) y cuentas
            motor.js                  motor de 12 meses: demanda, inventario, contabilidad, personal, impuestos y detalle contable (V5.2)
            finanzas-personales.js    retiros, gastos, ahorro y presupuesto del propietario (V3)
            ilustraciones.js          escenas que reaccionan a los resultados de cada decisión
            assets/, manifest.webmanifest  logo, ícono de la aplicación
backend/    Servidor Node.js: API, registro, inicio de sesión, sesiones, permisos y acceso a la base de datos.
            server.js       rutas y seguridad
            db.js           esquema y conexión (PostgreSQL o SQLite)
            make-admin.js   da rol ADMIN a una cuenta
            test/           pruebas: API, finanzas personales, motor, auditoría contable, ilustraciones, diseño y navegador (opcional)
            .env.example    variables de entorno de ejemplo
render.yaml Despliegue en Render (servicio web + PostgreSQL)
Dockerfile  Despliegue en cualquier hosting que acepte contenedores
docs/capturas/  Capturas de pantalla de la V5.2 (celular y escritorio)
```

El backend sirve también el frontend, así que todo queda bajo un mismo dominio (`https://tu-dominio`), sin configurar CORS.

## Probar en tu computadora

Necesitas Node.js 22.5 o superior.

```
cd backend
npm start
```

Abre http://localhost:3000. Sin configurar nada, los datos se guardan en `backend/data/simulador.db` (SQLite).

## Pruebas

Dentro de `backend`:

- `npm test`: API, finanzas personales, motor (calendario, demanda, inventario, contabilidad, impuestos), auditoría (textos, personal, provisiones, detalle contable), ilustraciones, paleta y una regresión de 420 partidas. No necesitan instalar nada.
- `npm run regresion`: 1.512 partidas completas con 7 estilos de juego.
- `npm run test:navegador` y `npm run test:v5`: pruebas en navegador real (requieren Playwright: `npm install --no-save playwright && npx playwright install chromium`; si no está instalado, avisan que se omitieron). `test:v5` deja capturas en `docs/capturas/`. Después, `node --disable-warning=ExperimentalWarning test/detalle.e2e.js` prueba el detalle contable y agrega sus capturas (ejecútalo después de `test:v5`, que vacía la carpeta).

## Probar a mano (cada modalidad)

1. Inicio: elige la modalidad, revisa “Parámetros iniciales y supuestos” y pulsa **Comenzar**.
2. Simulación: revisa la compra de insumos (Comida y Productos), toma una decisión y abre “Cómo se registra en las cuentas”.
3. Cierra el mes: estado de resultados y “Activo = Pasivo + Patrimonio”.
4. Finanzas: indicadores de la modalidad, balance, inventario y “Mi dinero” (retiros, gastos, ahorro, presupuesto mensual).
5. Detalle: elige un mes cerrado o el mes en curso y sigue el cálculo desde las ventas hasta el resultado, el balance, los impuestos y los movimientos de la caja.
6. Progreso: índice, metas, logros e historia.

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
- Las partidas guardadas con la V4 (5 años) se pueden ver pero no continuar.
- El juego se calcula en el navegador: el servidor valida la forma de los datos y a quién pertenecen, pero un usuario con conocimientos técnicos podría falsear los resultados de sus propias partidas. No afecta a las cuentas ni a las partidas de otros.
- El límite de intentos de acceso se guarda en memoria: se reinicia con el servidor y no se comparte entre varias instancias.
