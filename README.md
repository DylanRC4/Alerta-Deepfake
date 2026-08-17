# Alerta Deepfake

Proyecto ABP — Ingeniería Web. Sitio educativo sobre deepfakes, suplantación de identidad
y protección de datos personales, con backend para gestionar reportes de incidentes.

## Stack
- Frontend: HTML5 + CSS3 nativo (sin frameworks), servido por Nginx.
- Backend: Node.js + Express, conectado a PostgreSQL con `pg`.
- Base de datos: PostgreSQL 16, inicializada automáticamente con `db/init.sql`.
- Todo orquestado con Docker Compose.

## Cómo levantar el proyecto (en la máquina Linux)

1. Copiar el archivo de variables de entorno y ajustar las claves:
   ```bash
   cp .env.example .env
   ```

2. Levantar los contenedores:
   ```bash
   docker compose up --build
   ```

3. Verificar:
   - Frontend: http://localhost:8080
   - API health check: http://localhost:8080/api/health
   - **pgAdmin (ver la BD visualmente):** http://localhost:5050
     - Inicia sesión con `admin@alerta.local` / `admin123`.
     - Clic derecho en "Servers" → Register → Server. En la pestaña **General**,
       ponle un nombre (ej: "Alerta Deepfake"). En la pestaña **Connection**:
       - Host: `db`
       - Port: `5432`
       - Maintenance database: `alerta_deepfake`
       - Username: `alerta_user`
       - Password: la de tu `.env` (por defecto `alerta_pass`)
     - Guarda, y navega: Databases → alerta_deepfake → Schemas → public → Tables.
       Clic derecho sobre `reportes` → View/Edit Data → All Rows.

## Endpoints disponibles

| Método | Ruta              | Descripción                              |
|--------|-------------------|-------------------------------------------|
| GET    | /api/health       | Estado del backend                        |
| GET    | /api/categorias   | Catálogo de tipos de deepfake             |
| POST   | /api/reportes     | Registrar un nuevo reporte de incidente   |
| GET    | /api/reportes     | Listar reportes registrados               |

## Estructura

```
alerta-deepfake/
├── docker-compose.yml
├── .env.example
├── db/
│   └── init.sql          # Esquema y datos iniciales
├── backend/
│   ├── server.js
│   ├── db.js
│   └── routes/
│       ├── categorias.js
│       └── reportes.js
├── frontend/
│   ├── index.html        # Placeholder — se reemplaza en la fase de frontend
│   ├── css/
│   └── js/
└── nginx/
    └── default.conf
```

## Frontend

Las 5 páginas ya están construidas en HTML5 semántico + CSS3 puro (sin frameworks),
mobile-first y con accesibilidad básica (skip-link, foco visible, `aria-current`,
`aria-live` en mensajes dinámicos):

- `index.html` — contexto del problema, actores, IA generativa, datos biométricos.
- `tipologias.html` — clasificación de voz, imagen, video y perfiles falsos.
- `prevencion.html` — checklist, ruta de actuación, normativa colombiana, recomendaciones.
- `simulador.html` — casos interactivos de detección.
- `reporte.html` — formulario conectado a `POST /api/reportes` y `GET /api/categorias`.

## Siguiente fase

Posibles mejoras: carga de evidencias (tabla `evidencias`, ya modelada en la BD)
y un panel simple para que la profesora revise los reportes desde el navegador.
