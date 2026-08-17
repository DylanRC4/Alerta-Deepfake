# Alerta Deepfake

Proyecto ABP — Ingeniería Web. Sitio educativo sobre deepfakes, suplantación de identidad
y protección de datos personales, con backend para gestionar reportes de incidentes.

## Stack
- Frontend: HTML5 + CSS3 nativo (sin frameworks), servido por Nginx.
- Backend: Node.js + Express, conectado a PostgreSQL con `pg`.
- Base de datos: PostgreSQL 16, inicializada automáticamente con `db/init.sql`.
- Todo orquestado con Docker Compose.

## Cómo levantar el proyecto (en la máquina Linux)

1. Copiar el archivo de variables de entorno y definir tus propias claves:
   ```bash
   cp .env.example .env
   ```
   Edita `.env` y define valores reales para `DB_PASSWORD` y `PGADMIN_PASSWORD`.
   **No hay valores por defecto**: si falta alguna de estas variables, `docker compose`
   se niega a levantar el servicio correspondiente y muestra un mensaje claro indicando
   cuál falta, en vez de usar una contraseña débil silenciosamente.

2. Levantar los contenedores:
   ```bash
   docker compose up --build
   ```

3. Verificar:
   - Frontend: http://localhost:8080
   - API health check: http://localhost:8080/api/health
   - **pgAdmin (ver la BD visualmente):** http://localhost:5050
     - Inicia sesión con el `PGADMIN_EMAIL` / `PGADMIN_PASSWORD` que definiste en tu `.env`.
     - Clic derecho en "Servers" → Register → Server. En la pestaña **General**,
       ponle un nombre (ej: "Alerta Deepfake"). En la pestaña **Connection**:
       - Host: `db`
       - Port: `5432`
       - Maintenance database: `alerta_deepfake`
       - Username: `alerta_user` (o el valor de `DB_USER` en tu `.env`)
       - Password: la de tu `.env` (`DB_PASSWORD`)
     - Guarda, y navega: Databases → alerta_deepfake → Schemas → public → Tables.
       Clic derecho sobre `reportes` → View/Edit Data → All Rows.

## Endpoints disponibles

| Método | Ruta              | Descripción                                              |
|--------|-------------------|-----------------------------------------------------------|
| GET    | /api/health       | Estado del backend                                         |
| GET    | /api/categorias   | Catálogo de tipos de deepfake                               |
| POST   | /api/reportes     | Registrar un nuevo reporte de incidente (con evidencia opcional) |
| GET    | /api/reportes     | Listar reportes registrados, con su evidencia asociada       |

`POST /api/reportes` valida los campos en el servidor (fechas, longitudes, formato de
correo) y aplica un límite de 10 envíos por IP cada 15 minutos para evitar spam. La
evidencia es opcional y admite **una de estas dos formas, no ambas**: subir un archivo
(`archivo_evidencia`, máx. 15 MB, imagen/PDF/audio/video) o pegar un enlace externo
(`enlace_archivo`). En ambos casos se guarda en la tabla `evidencias`, vinculada al
reporte mediante una transacción (si algo falla, no se guarda nada a medias ni queda un
archivo huérfano en disco).

Los archivos subidos quedan accesibles en `GET /uploads/<nombre-aleatorio>`.

## Estructura

```
alerta-deepfake/
├── docker-compose.yml
├── .env.example
├── db/
│   ├── init.sql              # Esquema y datos iniciales
│   └── pgadmin-servers.json  # Referencia de conexión para pgAdmin
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── .dockerignore
│   └── routes/
│       ├── categorias.js
│       └── reportes.js
├── frontend/
│   ├── index.html
│   ├── tipologias.html
│   ├── prevencion.html
│   ├── simulador.html
│   ├── reporte.html
│   ├── css/
│   └── js/
└── nginx/
    └── default.conf
```

## Frontend

Las 5 páginas están construidas en HTML5 semántico + CSS3 puro (sin frameworks),
mobile-first y con accesibilidad básica (skip-link, foco visible, `aria-current`,
`aria-live` en mensajes dinámicos):

- `index.html` — contexto del problema, actores, IA generativa, datos biométricos.
- `tipologias.html` — clasificación de voz, imagen, video y perfiles falsos.
- `prevencion.html` — checklist, ruta de actuación, normativa colombiana, recomendaciones.
- `simulador.html` — casos interactivos de detección.
- `reporte.html` — formulario conectado a `POST /api/reportes` y `GET /api/categorias`,
  con evidencia opcional (subir archivo o pegar un enlace externo).

## Base de datos

Tres tablas (`db/init.sql`):

- `categorias_deepfake`: catálogo fijo de 4 categorías (clonación de voz, generación de
  rostro, video falso, perfil falso), sembrado una sola vez al crear el contenedor. No
  se espera que reciba filas nuevas en operación normal — es solo el catálogo del `<select>`.
- `reportes`: un registro por incidente reportado.
- `evidencias`: cero o más registros por reporte, con el tipo y un enlace al archivo
  (subido directamente al sitio, guardado en el volumen Docker `uploads_data`) o a un
  recurso externo (Drive, Imgur, etc.), según lo que haya elegido el usuario.

## Seguridad

- Contraseñas de PostgreSQL y pgAdmin solo por variable de entorno, sin valores por
  defecto (ver sección de instalación).
- Consultas parametrizadas en todo el backend (sin concatenación de SQL).
- Validación de entrada del lado del servidor en `POST /api/reportes` (no solo HTML5).
- Los errores internos (mensajes de Postgres, stack traces) nunca se devuelven al
  cliente; se registran en el log del servidor y se responde un mensaje genérico.
- Rate limiting básico en el envío de reportes.
- Cabeceras de seguridad HTTP vía `helmet`.
- `.env` fuera de Git (`.gitignore`); `.env.example` con valores ficticios como
  referencia.
- Carga de archivos de evidencia con múltiples capas de control: lista blanca de tipos
  MIME permitidos, límite de tamaño (15 MB), nombre de archivo aleatorio (no se usa el
  nombre original, evita path traversal), y verificación del **contenido real** del
  archivo (magic bytes vía `file-type`), no solo su extensión o el tipo MIME declarado
  por el navegador. Los archivos se guardan fuera del árbol de Git, en un volumen Docker
  dedicado (`uploads_data`).

## Limitaciones actuales

- No hay autenticación ni panel de administración: cualquiera con acceso a la URL puede
  leer `GET /api/reportes`. Aceptable mientras el proyecto es de uso educativo/local; si
  se expone públicamente, este endpoint debería protegerse.
- Los archivos subidos no pasan por un antivirus/escáner de malware (fuera del alcance
  de este proyecto académico); solo se valida que el contenido coincida con un tipo de
  archivo permitido (imagen, PDF, audio o video).
- Sin pruebas automatizadas todavía.

## Cómo ejecutar pruebas

Todavía no hay suite de pruebas automatizadas. Verificación manual recomendada tras
cualquier cambio: `docker compose up --build`, revisar `/api/health`, enviar un reporte
de prueba desde `reporte.html` y confirmar en pgAdmin que aparece en `reportes` (y en
`evidencias` si se adjuntó un enlace).

## Próximas mejoras

- Panel simple para que la profesora revise y filtre los reportes desde el navegador.
- Autenticación básica para ese panel.
- Pruebas automatizadas de los endpoints y validadores.
