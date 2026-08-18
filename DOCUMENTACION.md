# Documentación técnica — Alerta Deepfake

**Proyecto final · Aprendizaje Basado en Problemas · Ingeniería Web**
Universitaria de Colombia — Ingeniería de Software
Autor: Dylan Ricaurte

---

## Índice

1. [Resumen del proyecto](#1-resumen-del-proyecto)
2. [Problema y objetivo](#2-problema-y-objetivo)
3. [Entorno de trabajo](#3-entorno-de-trabajo)
4. [Arquitectura general](#4-arquitectura-general)
5. [Stack tecnológico](#5-stack-tecnológico)
6. [Estructura del proyecto](#6-estructura-del-proyecto)
7. [Frontend](#7-frontend)
8. [Backend](#8-backend)
9. [Base de datos](#9-base-de-datos)
10. [Seguridad](#10-seguridad)
11. [Despliegue](#11-despliegue)
12. [Control de versiones](#12-control-de-versiones)
13. [Métricas del proyecto](#13-métricas-del-proyecto)
14. [Limitaciones](#14-limitaciones)
15. [Trabajo futuro](#15-trabajo-futuro)

---

## 1. Resumen del proyecto

Alerta Deepfake es una aplicación web educativa que permite **prevenir, identificar
y reportar** casos de deepfakes, suplantación de identidad y vulneración de datos
personales, con base en la normativa colombiana.

No es un sitio estático: incluye un backend con API REST, una base de datos
relacional, carga de archivos con validación de contenido, y un panel privado de
administración. Todo se ejecuta en contenedores para que el entorno sea
reproducible en cualquier máquina.

**Alcance declarado explícitamente:** el sitio *no* analiza automáticamente si un
archivo es un deepfake. No hay un modelo de detección detrás. Lo que hace es
educar, orientar y registrar casos. Esta limitación está declarada dentro del
propio sitio, en la página "Acerca de".

---

## 2. Problema y objetivo

### Pregunta orientadora

> ¿Cómo diseñar una solución web educativa, accesible y adaptable que permita
> prevenir, identificar y reportar posibles casos de deepfakes, suplantación de
> identidad y vulneración de datos personales?

### Contexto del problema

La inteligencia artificial generativa permite hoy clonar una voz con pocos
segundos de audio o fabricar el rostro de una persona que nunca existió. Esa
capacidad, combinada con la cantidad de datos biométricos que las personas
publican en redes sociales, hace posible la suplantación de identidad a escala.

En Colombia, los casos de suplantación reportados pasaron de 333 en 2019 a 1.527
en 2020 —un crecimiento del 409%— según cifras del sector.

### Objetivo

Construir una plataforma que integre en un solo lugar tres funciones que hoy
están dispersas:

| Función | Cómo se resuelve |
|---|---|
| **Educar** | Páginas de conceptos y tipologías con señales concretas de detección |
| **Entrenar** | Simulador interactivo con casos reales y retroalimentación |
| **Documentar** | Formulario de reporte con almacenamiento persistente y evidencia |

---

## 3. Entorno de trabajo

El desarrollo se realizó con **dos equipos con roles diferenciados**, sincronizados
mediante Git y GitHub.

### Equipo 1 — PC de escritorio (Windows 11)

Rol: **edición y control de versiones**

- Escritura de código en Visual Studio Code
- Operaciones de Git (commit, push, pull)
- Conexión SSH hacia la laptop cuando se requiere ejecutar comandos

### Equipo 2 — Laptop (Arch Linux)

Rol: **ejecución y pruebas**

- Docker y Docker Compose
- PostgreSQL en contenedor
- Servidor de la aplicación
- Pruebas funcionales
- Visual Studio Code (instalado desde AUR con `visual-studio-code-bin`)

### Flujo de sincronización

```
PC Windows                    GitHub                    Laptop Linux
(edición)                  (fuente única)               (ejecución)
    │                            │                            │
    │  ── git push ────────────► │                            │
    │                            │ ── git pull ─────────────► │
    │                            │                            │
    │                            │                     docker compose up
    │                            │                            │
    │  ◄──────── SSH (cuando se requiere ejecutar) ─────────► │
```

**Regla adoptada para evitar copias divergentes:** los cambios se confirman y
suben desde el equipo de edición, y se traen con `git pull` antes de ejecutar en
la laptop. GitHub actúa como única fuente de verdad. Nunca se edita el mismo
archivo en ambas máquinas sin sincronizar.

### Repositorio

- **URL:** `github.com/DylanRC4/Alerta-Deepfake`
- **Autenticación:** llaves SSH ED25519, una independiente por máquina
- **Rama principal:** `main`

Se usó una llave por equipo en lugar de compartir una sola: si una máquina se
compromete, se revoca esa llave sin afectar la otra.

---

## 4. Arquitectura general

### Diagrama de componentes

```
                          NAVEGADOR
                    (computador / tablet / móvil)
                               │
                               │  HTTP puerto 8080
                               ▼
        ┌──────────────────────────────────────────────┐
        │                  NGINX                        │
        │            (servidor web / proxy)             │
        │                                               │
        │   /            → archivos estáticos           │
        │   /api/...     → reenvía al backend           │
        │   /uploads/... → reenvía al backend           │
        └───────────┬──────────────────┬────────────────┘
                    │                  │
         archivos estáticos       peticiones de datos
                    │                  │
                    ▼                  ▼
        ┌───────────────────┐  ┌──────────────────────────┐
        │   FRONTEND        │  │   BACKEND Node.js        │
        │   HTML + CSS + JS │  │   Express                │
        │   (8 páginas)     │  │                          │
        └───────────────────┘  │   ├── rutas              │
                               │   ├── validación         │
                               │   ├── middleware de auth │
                               │   ├── manejo de archivos │
                               │   └── acceso a datos     │
                               └──────────┬───────────────┘
                                          │  SQL parametrizado
                                          ▼
                               ┌──────────────────────────┐
                               │      PostgreSQL 16       │
                               │                          │
                               │  categorias_deepfake     │
                               │  reportes                │
                               │  evidencias              │
                               └──────────────────────────┘

        Volúmenes persistentes (los datos sobreviven al reinicio):
        db_data       → base de datos
        uploads_data  → archivos de evidencia subidos
        pgadmin_data  → configuración de pgAdmin
```

### Decisión clave: Nginx como puerta única de entrada

El navegador **solo habla con Nginx**. Nunca se comunica directamente con el
backend. Esto tiene tres consecuencias:

1. **No hay problemas de CORS.** El frontend y la API comparten el mismo origen
   (`localhost:8080`), así que el navegador no los trata como dominios distintos.
2. **El backend puede quedar oculto.** En un despliegue real solo se expone el
   puerto de Nginx; el backend queda accesible únicamente dentro de la red
   interna de Docker.
3. **Un solo punto para aplicar reglas.** Límites de tamaño de subida, cabeceras
   y enrutamiento se configuran en un solo lugar.

---

## 5. Stack tecnológico

### Resumen

| Capa | Tecnología | Versión | Rol |
|---|---|---|---|
| Contenedores | Docker + Docker Compose | 29.6 / v5.3 | Orquestación del entorno |
| Servidor web | Nginx | alpine | Archivos estáticos y proxy inverso |
| Backend | Node.js | 20 (alpine) | Entorno de ejecución del servidor |
| Framework | Express | 4.19 | Enrutamiento y middlewares |
| Base de datos | PostgreSQL | 16 (alpine) | Almacenamiento relacional |
| Frontend | HTML5, CSS3, JavaScript | — | Interfaz, sin frameworks |
| Administración BD | pgAdmin | 4 | Inspección visual de datos |
| Control de versiones | Git + GitHub | — | Historial y sincronización |

### Dependencias del backend

Nueve dependencias de producción, cada una con una justificación puntual:

| Paquete | Para qué se usa |
|---|---|
| `express` | Enrutamiento HTTP y middlewares |
| `pg` | Driver oficial de PostgreSQL para Node |
| `dotenv` | Carga de variables de entorno desde el archivo `.env` |
| `cors` | Cabeceras de intercambio entre orígenes |
| `helmet` | Cabeceras HTTP de seguridad |
| `morgan` | Registro de peticiones (logs) |
| `multer` | Recepción de archivos subidos (multipart/form-data) |
| `express-rate-limit` | Límite de peticiones por IP |
| `cookie-parser` | Lectura y firma de cookies de sesión |

Una dependencia de desarrollo: `nodemon` (reinicio automático al editar código).

### Justificación de las decisiones principales

#### Por qué HTML, CSS y JavaScript sin framework

Un sitio de ocho páginas con un formulario y un panel no justifica React ni Vue.
Sin framework:

- La carga es más rápida (no se descarga una librería antes de ver contenido)
- No se arrastran dependencias que envejecen y hay que actualizar
- Cada línea es explicable sin decir "eso lo resuelve la librería"

Para un proyecto académico donde hay que defender cada decisión, esto último pesa
más que la comodidad de un framework.

#### Por qué Node.js

Permite usar el mismo lenguaje en el navegador y en el servidor. Eso reduce el
costo de cambiar de contexto mientras se desarrolla: no hay que alternar entre
JavaScript y otro lenguaje del lado servidor.

#### Por qué PostgreSQL y no una base no relacional

Los datos del proyecto son claramente relacionales: un reporte **pertenece a**
una categoría y **puede tener** varias evidencias. Esas relaciones se expresan
con claves foráneas y las hace cumplir el propio motor, no el código de la
aplicación. Si un reporte se elimina, sus evidencias se eliminan automáticamente
(`ON DELETE CASCADE`) sin que el backend tenga que acordarse de hacerlo.

Con una base documental habría que garantizar esa consistencia desde el código,
lo cual es más frágil.

#### Por qué no se usó un ORM

Se usa el driver `pg` con consultas SQL parametrizadas escritas a mano. Para un
esquema de tres tablas, un ORM habría añadido una capa de abstracción difícil de
justificar frente al beneficio de ver exactamente qué SQL se ejecuta. En un
contexto académico, poder mostrar la consulta real es una ventaja.

#### Por qué Docker

Cuatro servicios que se levantan con un solo comando y funcionan igual en
cualquier máquina. Elimina el problema de "en mi computador sí funciona" a la
hora de sustentar, y permite que la base de datos y el servidor web tengan
versiones fijas independientes de lo que esté instalado en el sistema.

---

## 6. Estructura del proyecto

```
alerta-deepfake/
│
├── docker-compose.yml        Definición de los 4 servicios y sus volúmenes
├── .env                      Credenciales reales (NO se sube a Git)
├── .env.example              Plantilla con valores ficticios
├── .gitignore                Archivos excluidos del control de versiones
├── README.md                 Guía de instalación y uso
├── COMANDOS.md               Referencia rápida de comandos
├── DOCUMENTACION.md          Este documento
├── SUSTENTACION.md           Guía de defensa del proyecto
│
├── db/
│   ├── init.sql              Esquema y datos iniciales
│   └── pgadmin-servers.json  Conexión preconfigurada para pgAdmin
│
├── nginx/
│   └── default.conf          Configuración del servidor web y proxy
│
├── backend/
│   ├── Dockerfile            Receta de construcción de la imagen
│   ├── .dockerignore         Archivos excluidos de la imagen
│   ├── package.json          Dependencias y scripts
│   ├── server.js             Punto de entrada, middlewares globales
│   ├── db.js                 Pool de conexiones a PostgreSQL
│   │
│   ├── routes/
│   │   ├── categorias.js     Catálogo de tipos de deepfake
│   │   ├── reportes.js       Registro y consulta de reportes
│   │   └── admin.js          Sesión y estadísticas del panel
│   │
│   ├── middleware/
│   │   └── adminAuth.js      Verificación de sesión de administrador
│   │
│   └── utils/
│       └── detectarTipoArchivo.js   Verificación de tipo real de archivo
│
└── frontend/
    ├── index.html            Inicio
    ├── conceptos.html        IA generativa y datos biométricos
    ├── tipologias.html       Los cuatro tipos de suplantación
    ├── simulador.html        Entrenamiento con casos
    ├── prevencion.html       Ruta de actuación y normativa
    ├── reporte.html          Formulario de reporte
    ├── acerca.html           Bitácora técnica del proyecto
    ├── panel.html            Panel privado de administración
    │
    ├── css/
    │   └── styles.css        Sistema de diseño completo
    │
    ├── js/
    │   ├── main.js           Navegación, formulario, animaciones
    │   ├── simulador.js      Lógica del simulador
    │   └── panel.js          Lógica del panel
    │
    └── img/                  Ilustraciones y logotipos
```

### Criterio de organización del backend

La separación en carpetas responde a **una responsabilidad por archivo**:

- `server.js` solo configura la aplicación y monta las rutas
- `routes/` contiene qué responde cada dirección
- `middleware/` contiene lógica que se ejecuta *antes* de llegar a una ruta
- `utils/` contiene funciones puras reutilizables
- `db.js` es el único punto que conoce cómo conectarse a la base de datos

Si mañana cambia la forma de conectarse a PostgreSQL, solo se toca `db.js`.

---

## 7. Frontend

### Páginas

| Página | Propósito |
|---|---|
| `index.html` | Contextualización del problema y rutas de entrada por intención |
| `conceptos.html` | Qué es la IA generativa, datos personales y biométricos |
| `tipologias.html` | Los cuatro tipos de suplantación con señales de detección |
| `simulador.html` | Seis casos interactivos con puntaje y retroalimentación |
| `prevencion.html` | Ruta de actuación, listas de verificación y normativa |
| `reporte.html` | Formulario de registro de casos con evidencia |
| `acerca.html` | Decisiones técnicas y retos del desarrollo |
| `panel.html` | Vista privada de reportes y estadísticas |

### Organización de la navegación

Las seis páginas principales siguen una **ruta de aprendizaje**:

```
Inicio → Conceptos → Tipologías → Simulador → Prevención → Reportar
entender    fundamentos  identificar  practicar   prevenir    documentar
```

"Acerca de" y "Panel" se ubican en una barra de utilidad superior, separadas
visualmente porque no forman parte de ese recorrido: una es documentación del
proyecto y la otra es administración.

### Sistema de diseño

El sitio usa una identidad visual de **"expediente digital"**, coherente con el
tema de documentación de casos.

**Paleta** (definida como variables CSS en `:root`):

| Variable | Color | Uso |
|---|---|---|
| `--color-primary` | `#1B3A6B` | Azul institucional, elementos principales |
| `--color-primary-dark` | `#0F2647` | Títulos |
| `--color-accent` | `#D9A64A` | Dorado, acentos y llamados a la acción |
| `--color-ink` | `#10182B` | Fondos oscuros, texto principal |
| `--color-stamp-red` | `#A3291E` | Riesgo alto, errores, urgencia |
| `--color-stamp-amber` | `#B87F1F` | Riesgo medio, advertencias |
| `--color-stamp-green` | `#2F6F4E` | Confirmaciones, riesgo bajo |

Usar variables permite cambiar toda la identidad visual del sitio modificando
siete líneas.

**Tipografía:**

- *Big Shoulders Display* — títulos (condensada, con carácter institucional)
- *IBM Plex Sans* — texto corrido (alta legibilidad)
- *IBM Plex Mono* — etiquetas y datos técnicos (refuerza el concepto de expediente)

### Diseño adaptable (responsive)

Enfoque **mobile-first**: los estilos base están escritos para pantallas
pequeñas, y los `@media` van añadiendo complejidad hacia arriba.

Se usan 14 puntos de quiebre distintos, cada uno definido por dónde el contenido
concreto empieza a verse mal, no por tamaños de dispositivo arbitrarios.

Ejemplos de adaptación real:

- La tabla del panel (7 columnas) se convierte en fichas apiladas por debajo de
  760px, porque una tabla de ese ancho es ilegible en un teléfono
- El menú de navegación pasa a desplegable por debajo de 1024px
- Las ilustraciones de tipologías cambian de proporción 16:9 a 2.6:1 en pantallas
  anchas, para no robar altura

### Accesibilidad

| Medida | Implementación |
|---|---|
| Salto al contenido | Enlace `skip-link` al inicio de cada página |
| HTML semántico | `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`, `figure`, `fieldset` |
| Etiquetas de formulario | Todo campo tiene su `<label for="...">` asociado |
| Descripciones | `aria-describedby` conecta campos con sus textos de ayuda |
| Regiones dinámicas | `aria-live` anuncia mensajes que aparecen sin recargar |
| Página actual | `aria-current="page"` en la navegación |
| Imágenes | Texto alternativo en todas; las decorativas con `aria-hidden` |
| Foco visible | Contorno dorado de 3px en todo elemento enfocable |
| Movimiento reducido | `prefers-reduced-motion` desactiva las animaciones |
| Contraste | Todas las combinaciones verificadas contra el mínimo AA (4.5:1) |
| Idioma | `lang="es"` declarado en cada página |

El contraste se verificó calculando la relación de luminancia de cada
combinación de color usada. Dos combinaciones fallaron durante el desarrollo y
se corrigieron: los números sobre círculos ámbar y la etiqueta de estado "En
revisión" del panel.

---

## 8. Backend

### Punto de entrada (`server.js`)

Configura, en este orden:

1. Carga de variables de entorno
2. **Verificación de arranque:** si faltan `ADMIN_PASSWORD` o `SESSION_SECRET`,
   el proceso termina con un mensaje claro en lugar de arrancar de forma insegura
3. `helmet` — cabeceras de seguridad
4. `cors` — política de origen cruzado
5. `express.json` con límite de 100 KB
6. `cookie-parser` con la clave de firma
7. `morgan` — registro de peticiones
8. Montaje de las rutas
9. Manejador de 404
10. Manejador de errores centralizado

El orden importa: los middlewares se ejecutan en secuencia, así que las
cabeceras de seguridad deben aplicarse antes que cualquier respuesta.

### Endpoints

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| GET | `/api/health` | No | Verificación de que el servicio responde |
| GET | `/api/categorias` | No | Catálogo de tipos de deepfake |
| POST | `/api/reportes` | No | Registrar un reporte con evidencia opcional |
| GET | `/api/reportes` | **Sí** | Listar reportes con sus evidencias |
| PATCH | `/api/reportes/:id/estado` | **Sí** | Cambiar el estado de revisión |
| POST | `/api/admin/login` | No | Iniciar sesión en el panel |
| POST | `/api/admin/logout` | No | Cerrar sesión |
| GET | `/api/admin/check` | No | Consultar si hay sesión activa |
| GET | `/api/admin/estadisticas` | **Sí** | Conteos agregados para el panel |

Los endpoints que devuelven datos personales (`GET /api/reportes` y las
estadísticas) exigen sesión de administrador. El de registro es público porque
cualquier persona debe poder reportar.

### Validación de entrada

Toda validación se hace **en el servidor**, no solo en el navegador. La
validación de HTML5 mejora la experiencia, pero puede saltarse enviando la
petición directamente.

Reglas aplicadas en `POST /api/reportes`:

| Campo | Validación |
|---|---|
| `fecha_incidente` | Obligatorio, debe ser una fecha analizable |
| `nombre_afectado` | Obligatorio, entre 2 y 150 caracteres |
| `correo_contacto` | Obligatorio, formato de correo, máximo 150 |
| `id_categoria` | Obligatorio, numérico, debe existir en la tabla |
| `descripcion_hechos` | Obligatorio, entre 10 y 4000 caracteres |
| `plataforma_origen` | Opcional, máximo 100 caracteres |
| `tipo_evidencia` | Obligatorio si hay evidencia, valor de una lista cerrada |
| `enlace_archivo` | Máximo 2048 caracteres |
| archivo + enlace | No pueden enviarse ambos a la vez |

### Manejo de archivos

El flujo de una evidencia subida:

```
1. multer recibe el archivo
   ├── Rechaza si el tipo MIME declarado no está en la lista permitida
   └── Rechaza si supera 15 MB

2. Se guarda en disco con un nombre aleatorio (UUID)
   └── El nombre original del usuario se descarta por completo

3. Se lee el contenido real del archivo (magic bytes)
   └── Si no coincide con un tipo permitido, se borra y se rechaza

4. Se abre una transacción en PostgreSQL
   ├── INSERT en reportes
   ├── INSERT en evidencias
   └── COMMIT

5. Si algo falla en cualquier punto
   ├── ROLLBACK de la transacción
   └── Se borra el archivo del disco
```

El uso de transacción evita un estado inconsistente: nunca queda un reporte sin
su evidencia ni una evidencia huérfana. Y el borrado del archivo en caso de
error evita acumular basura en el volumen.

### Tipos de archivo aceptados

Nueve formatos, verificados por su firma binaria:

| Categoría | Formatos |
|---|---|
| Imagen | JPEG, PNG, WebP |
| Documento | PDF |
| Audio | MP3, WAV, OGG |
| Video | MP4, WebM |

---

## 9. Base de datos

### Modelo entidad-relación

```
┌─────────────────────────┐
│  categorias_deepfake    │
├─────────────────────────┤
│ PK  id_categoria        │
│     nombre_categoria    │
│     nivel_riesgo        │
└───────────┬─────────────┘
            │ 1
            │
            │ N
┌───────────▼─────────────┐
│       reportes          │
├─────────────────────────┤
│ PK  id_reporte          │
│     fecha_incidente     │
│     fecha_registro      │
│     nombre_afectado     │
│     correo_contacto     │
│ FK  id_categoria        │
│     descripcion_hechos  │
│     plataforma_origen   │
│     estado_revision     │
└───────────┬─────────────┘
            │ 1
            │
            │ N
┌───────────▼─────────────┐
│      evidencias         │
├─────────────────────────┤
│ PK  id_evidencia        │
│ FK  id_reporte          │
│     tipo_evidencia      │
│     enlace_archivo      │
└─────────────────────────┘
```

### Descripción de las tablas

**`categorias_deepfake`** — Catálogo fijo de cuatro tipos de suplantación.
Se siembra una sola vez al crear la base de datos. No recibe filas nuevas en
operación normal: alimenta el desplegable del formulario y las estadísticas.

**`reportes`** — Un registro por incidente. La columna `estado_revision` maneja
el ciclo de vida del caso con tres valores posibles: `Recibido` (por defecto),
`En revisión` y `Cerrado`.

**`evidencias`** — Cero o más registros por reporte. El campo `enlace_archivo`
guarda o bien una ruta interna (`/uploads/<uuid>.jpg` para archivos subidos al
sitio) o bien una URL externa (si el usuario prefirió pegar un enlace).

### Restricciones de integridad

| Restricción | Efecto |
|---|---|
| `PRIMARY KEY` en las tres tablas | Cada fila es identificable de forma única |
| `FOREIGN KEY` reportes → categorías | Impide registrar un reporte con una categoría inexistente |
| `FOREIGN KEY` evidencias → reportes | Impide una evidencia sin reporte asociado |
| `ON DELETE CASCADE` en evidencias | Al borrar un reporte, sus evidencias se borran solas |
| `NOT NULL` en campos obligatorios | El motor rechaza datos incompletos |
| `DEFAULT CURRENT_TIMESTAMP` | La fecha de registro se pone sola |

Estas reglas las hace cumplir PostgreSQL, no el código. Aunque hubiera un error
en el backend, la base de datos no aceptaría datos inconsistentes.

### Inicialización

El archivo `db/init.sql` se monta dentro del contenedor en
`/docker-entrypoint-initdb.d/`. PostgreSQL ejecuta automáticamente los scripts de
esa carpeta **la primera vez** que se crea el volumen de datos.

Esto tiene una consecuencia importante que se documentó durante el desarrollo:
las variables como la contraseña también se aplican solo en esa primera
creación. Cambiar el `.env` después no afecta a una base ya inicializada; hay
que actualizarla con `ALTER USER`.

---

## 10. Seguridad

### Medidas implementadas

| Medida | Ataque que previene |
|---|---|
| Consultas parametrizadas | **Inyección SQL**: los datos nunca se concatenan en la sentencia |
| Verificación de magic bytes | **Archivos disfrazados**: un ejecutable renombrado a `.jpg` se rechaza |
| Nombres de archivo aleatorios | **Path traversal y sobrescritura** |
| Lista blanca de tipos MIME | **Subida de contenido arbitrario** |
| Límite de 15 MB por archivo | **Agotamiento de disco** |
| `textContent` en vez de `innerHTML` | **XSS almacenado** |
| Validación de esquema en enlaces | **XSS vía `javascript:`** en el campo de evidencia |
| Comparación en tiempo constante | **Ataques de temporización** sobre la contraseña |
| Cookie firmada y `httpOnly` | **Suplantación de sesión** |
| Límite de 5 intentos / 15 min | **Fuerza bruta** contra el login |
| Límite de 10 reportes / 15 min | **Saturación** del formulario público |
| Errores genéricos al cliente | **Filtración de estructura interna** de la base de datos |
| Variables de entorno | **Credenciales publicadas** en el repositorio |
| Cabeceras de `helmet` | Varios vectores de ataque del navegador |

### Detalle de las tres decisiones más relevantes

#### Verificación de contenido real de archivos

Un atacante puede renombrar un archivo ejecutable a `.jpg` y el navegador
declarará que es una imagen. Por eso, después de recibir el archivo, se leen sus
primeros bytes y se comparan con las firmas binarias conocidas de los nueve
formatos aceptados.

Esta verificación es **implementación propia** (`backend/utils/detectarTipoArchivo.js`,
64 líneas). Inicialmente se usó la librería `file-type`, pero `npm audit` reveló
que su versión compatible con el proyecto tenía una vulnerabilidad de denegación
de servicio —un bucle infinito en su analizador de formato ASF— sin parche
disponible. Como el proyecto solo necesita reconocer nueve formatos concretos, se
reemplazó por una verificación acotada: menos superficie de ataque, sin
dependencias externas y totalmente auditable.

#### Autenticación del panel

El panel usa una contraseña compartida, no cuentas individuales. Para el alcance
del proyecto —una persona revisando los reportes— es suficiente, y se documenta
como limitación.

La implementación tiene cuatro capas:

1. La contraseña se compara con `crypto.timingSafeEqual`, que tarda lo mismo
   sin importar en qué carácter falle. Una comparación normal (`===`) devuelve
   antes cuando el primer carácter no coincide, y esa diferencia de tiempo puede
   medirse para deducir la contraseña carácter por carácter.
2. Máximo cinco intentos por IP cada quince minutos.
3. La sesión se guarda en una cookie **firmada** con `SESSION_SECRET`. Si alguien
   la modifica, la firma deja de coincidir y se rechaza.
4. La cookie es `httpOnly`, así que JavaScript del navegador no puede leerla ni
   robarla.

#### Manejo de errores

Los mensajes de error internos nunca llegan al cliente. Durante el desarrollo, un
error de PostgreSQL se devolvía tal cual al navegador, lo que exponía nombres de
tablas y restricciones. Ahora se registran en el log del servidor y al cliente se
le responde un mensaje genérico.

### Incidente de seguridad documentado

Durante el desarrollo se subió por accidente al repositorio público un archivo de
texto con el contenido completo del archivo `.env` —las cuatro contraseñas
reales.

**Respuesta aplicada, en este orden:**

1. **Rotar las cuatro credenciales.** Borrar el archivo no deshace el hecho de
   que estuvieron expuestas; en un repositorio público hay que asumirlas
   comprometidas de inmediato.
2. **Reescribir el historial de Git** con `git filter-repo` para eliminar el
   archivo de todos los commits anteriores, no solo del último.
3. **Resincronizar ambas máquinas** de trabajo con el historial reescrito.

El orden es lo importante: rotar primero, limpiar después.

---

## 11. Despliegue

### Servicios definidos en `docker-compose.yml`

| Servicio | Imagen | Puerto | Función |
|---|---|---|---|
| `db` | `postgres:16-alpine` | 5433 → 5432 | Base de datos |
| `backend` | Construida localmente | 3000 | API REST |
| `nginx` | `nginx:alpine` | 8080 → 80 | Servidor web y proxy |
| `pgadmin` | `dpage/pgadmin4` | 5050 → 80 | Administración visual de la BD |

### Volúmenes

| Volumen | Contenido | Consecuencia de borrarlo |
|---|---|---|
| `db_data` | Datos de PostgreSQL | Se pierden todos los reportes |
| `uploads_data` | Archivos de evidencia | Se pierden todas las evidencias subidas |
| `pgadmin_data` | Configuración de pgAdmin | Solo hay que volver a registrar el servidor |

Los volúmenes son la razón por la que los datos sobreviven a `docker compose
down`. Un contenedor es desechable; el volumen no.

### Orden de arranque

El backend **no puede** arrancar antes que la base de datos. Se resuelve con un
`healthcheck`:

```yaml
depends_on:
  db:
    condition: service_healthy
```

PostgreSQL se considera saludable cuando `pg_isready` responde correctamente. El
backend espera esa señal. Depender solo del orden de inicio no bastaría: un
contenedor puede estar "iniciado" pero la base aún no acepta conexiones.

### Variables de entorno requeridas

| Variable | Uso | Tiene valor por defecto |
|---|---|---|
| `DB_NAME` | Nombre de la base de datos | Sí |
| `DB_USER` | Usuario de la base de datos | Sí |
| `DB_PASSWORD` | Contraseña de PostgreSQL | **No — obligatoria** |
| `PGADMIN_EMAIL` | Correo de acceso a pgAdmin | Sí |
| `PGADMIN_PASSWORD` | Contraseña de pgAdmin | **No — obligatoria** |
| `ADMIN_PASSWORD` | Contraseña del panel | **No — obligatoria** |
| `SESSION_SECRET` | Clave para firmar cookies | **No — obligatoria** |

Las cuatro obligatorias usan la sintaxis `${VARIABLE:?mensaje}` en
`docker-compose.yml`. Si falta alguna, Docker se niega a arrancar con un mensaje
claro **en lugar de usar silenciosamente una contraseña débil**. Fallar
ruidosamente es preferible a funcionar de forma insegura.

### Puesta en marcha

```bash
cp .env.example .env      # y definir las contraseñas reales
docker compose up -d --build
docker compose ps
```

Direcciones resultantes:

- Sitio: `http://localhost:8080`
- Estado de la API: `http://localhost:8080/api/health`
- pgAdmin: `http://localhost:5050`

---

## 12. Control de versiones

### Estadísticas

- **23 commits** en la rama `main`
- Mensajes con prefijo convencional: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`

### Convención de mensajes

| Prefijo | Uso |
|---|---|
| `feat:` | Funcionalidad nueva |
| `fix:` | Corrección de un problema |
| `chore:` | Mantenimiento sin cambio funcional |
| `docs:` | Documentación |
| `debug:` | Instrumentación temporal (posteriormente retirada) |

### Protección de secretos

El archivo `.gitignore` excluye:

```
node_modules/
.env
.env.*
!.env.example
*.log
coverage/
dist/
build/
.DS_Store
backend/uploads/
```

La línea `!.env.example` es una excepción: ese archivo **sí** se sube, porque
documenta qué variables hacen falta sin revelar sus valores.

---

## 13. Métricas del proyecto

### Código propio

| Componente | Archivos | Líneas |
|---|---|---|
| Páginas HTML | 8 | 1.954 |
| Hoja de estilos | 1 | 2.190 |
| JavaScript del navegador | 3 | 818 |
| Backend Node.js | 6 | 530 |
| Esquema SQL | 1 | 41 |
| Configuración (Nginx, Docker) | 3 | 103 |
| **Total** | **22** | **5.636** |

### Otros datos

| Métrica | Valor |
|---|---|
| Endpoints de la API | 9 |
| Tablas en la base de datos | 3 |
| Dependencias de producción | 9 |
| Dependencias de desarrollo | 1 |
| Contenedores Docker | 4 |
| Volúmenes persistentes | 3 |
| Puntos de quiebre responsive | 14 |
| Formatos de archivo aceptados | 9 |
| Casos en el simulador | 6 |

---

## 14. Limitaciones

Declaradas de forma explícita, tanto aquí como dentro del propio sitio:

1. **No hay detección automática de deepfakes.** El sitio no analiza si un
   archivo es falso. Educa, orienta y registra. Afirmar lo contrario sería
   atribuirle una capacidad que no tiene.

2. **El panel usa una contraseña compartida**, no cuentas individuales por
   persona ni roles. No hay trazabilidad de quién entró.

3. **Los archivos subidos no pasan por un antivirus.** Se valida que el
   contenido corresponda a un tipo permitido, pero no se analiza en busca de
   malware.

4. **No hay pruebas automatizadas.** La verificación se hizo de forma manual y
   con comprobaciones puntuales durante el desarrollo.

5. **El despliegue es local.** El proyecto corre en la máquina de desarrollo, no
   en un servidor público con HTTPS.

6. **Sin herramienta de migraciones.** El esquema se aplica una vez desde
   `init.sql`. Un cambio futuro de estructura requeriría un procedimiento manual.

---

## 15. Trabajo futuro

En orden de prioridad:

1. **Pruebas automatizadas** de los validadores, los endpoints y la detección de
   tipo de archivo. Es la ausencia más notoria del proyecto en su estado actual.

2. **Filtros y paginación en el panel.** Con pocos reportes la tabla es
   manejable; con cientos, deja de serlo.

3. **Cuentas individuales** para el panel, si más de una persona necesitara
   acceso.

4. **Procesamiento asíncrono.** Si en el futuro se integrara un modelo de
   detección real, el análisis no debería bloquear la respuesta HTTP: la
   arquitectura permitiría pasar a un esquema de trabajos en segundo plano sin
   reescribir la aplicación.

5. **Despliegue público con HTTPS** y política de retención de archivos.

---

*Documento generado a partir del estado real del código. Todas las cifras fueron
verificadas directamente sobre el repositorio.*
