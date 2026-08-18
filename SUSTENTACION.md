# Guía de sustentación — Alerta Deepfake

Documento de preparación para la defensa oral del proyecto.
Complementa a `DOCUMENTACION.md`, que contiene el detalle técnico.

---

## Índice

1. [Cómo presentar el proyecto](#1-cómo-presentar-el-proyecto)
2. [Los fundamentos: qué es cada herramienta](#2-los-fundamentos-qué-es-cada-herramienta)
3. [Cómo está todo conectado](#3-cómo-está-todo-conectado)
4. [El recorrido completo de una petición](#4-el-recorrido-completo-de-una-petición)
5. [Banco de preguntas](#5-banco-de-preguntas)
6. [Preguntas difíciles](#6-preguntas-difíciles)
7. [Guion de la demostración](#7-guion-de-la-demostración)
8. [Datos para tener presentes](#8-datos-para-tener-presentes)
9. [Qué hacer si no sabes algo](#9-qué-hacer-si-no-sabes-algo)

---

## 1. Cómo presentar el proyecto

### En 30 segundos

> Alerta Deepfake es una aplicación web educativa sobre suplantación de identidad
> con inteligencia artificial. Enseña a reconocer los cuatro tipos de deepfake,
> permite entrenar el criterio con un simulador, y deja registrar casos con su
> evidencia en una base de datos. Está construida con Node.js, PostgreSQL y
> Nginx, todo orquestado con Docker.

### En 2 minutos

> El problema de partida es que la IA generativa hoy permite clonar una voz con
> pocos segundos de audio. En Colombia los casos de suplantación pasaron de 333
> en 2019 a 1.527 en 2020. Existe información dispersa sobre el tema, pero poca
> en un formato que sirva a la vez para aprender a identificarla, saber qué hacer
> si ocurre, y dejar constancia del caso.
>
> El sitio integra esas tres funciones. Tiene seis páginas principales que siguen
> una ruta de aprendizaje: entender los conceptos, identificar las tipologías,
> practicar con el simulador, conocer la ruta de prevención, y reportar.
>
> Técnicamente no es un sitio estático. Tiene un backend en Node.js con una API
> REST de nueve endpoints, una base de datos PostgreSQL con tres tablas
> relacionadas, carga de archivos con validación de contenido real, y un panel
> privado protegido por contraseña. Todo corre en cuatro contenedores Docker que
> se levantan con un solo comando.
>
> Y una aclaración importante que está escrita dentro del propio sitio: **no
> detecta deepfakes automáticamente**. No hay un modelo de IA detrás. Educa,
> orienta y registra. Decir lo contrario sería atribuirle algo que no tiene.

**Ese último párrafo dilo siempre.** Adelantarte a esa limitación demuestra
criterio y desactiva la pregunta antes de que te la hagan.

---

## 2. Los fundamentos: qué es cada herramienta

Esta sección está pensada para que puedas explicar cada pieza desde cero.
Cada una tiene: qué es, cómo la usaste, y por qué.

---

### HTML — La estructura

**Qué es**
El lenguaje que define **qué elementos hay** en una página y qué significan. No
dice cómo se ven: dice que esto es un título, esto un párrafo, esto un
formulario, esto una tabla.

La palabra clave es *semántica*: `<nav>` no se ve distinto de un `<div>`, pero le
comunica al navegador y a un lector de pantalla que ese bloque es la navegación.

**Cómo lo usé**
Ocho páginas escritas a mano con etiquetas semánticas: `header`, `nav`, `main`,
`section`, `article`, `aside`, `footer`, `figure`, `fieldset`. El formulario de
reporte usa `<fieldset>` y `<legend>` para agrupar los campos en tres bloques, lo
cual además ayuda a los lectores de pantalla a anunciar en qué sección está el
usuario.

**Por qué así**
Usar `<div>` para todo habría funcionado visualmente igual, pero habría perdido
el significado. La accesibilidad se construye sobre HTML semántico: si la
estructura es correcta, gran parte de la accesibilidad viene gratis.

---

### CSS — La presentación

**Qué es**
El lenguaje que define **cómo se ve** lo que HTML declaró. Colores, tamaños,
espaciado, posición, comportamiento en distintas pantallas.

**Cómo lo usé**
Un solo archivo de 2.190 líneas con un sistema de diseño completo:

- **Variables CSS** (`:root`) para toda la paleta y la tipografía. Cambiar el
  color institucional del sitio entero es modificar una línea.
- **Mobile-first**: los estilos base son para pantalla pequeña, y los `@media`
  van añadiendo complejidad hacia arriba. Son 14 puntos de quiebre.
- **Flexbox y Grid** para los layouts.
- **`prefers-reduced-motion`** para desactivar animaciones en quien lo configuró
  en su sistema.

**Por qué así**
Mobile-first no es una moda: es más fácil añadir complejidad que quitarla. Y las
variables evitan el problema clásico de tener el mismo azul escrito a mano en
cuarenta lugares.

**Ejemplo concreto que puedes mostrar**
La tabla del panel tiene siete columnas. En un teléfono eso es ilegible. Por
debajo de 760px, CSS la convierte en fichas apiladas donde cada dato lleva su
etiqueta al lado. Mismo HTML, presentación completamente distinta.

---

### JavaScript — El comportamiento

**Qué es**
El lenguaje que hace que la página **reaccione**. HTML pone los elementos, CSS
los viste, JavaScript los hace responder a lo que el usuario hace.

Es el único lenguaje de programación que los navegadores ejecutan de forma
nativa.

**Cómo lo usé**
Tres archivos, sin ninguna librería:

| Archivo | Qué hace |
|---|---|
| `main.js` | Menú móvil, formulario de reporte, animaciones al desplazarse |
| `simulador.js` | Los seis casos, el puntaje y la retroalimentación |
| `panel.js` | Sesión, tabla de reportes, filtros y estadísticas |

**Por qué sin framework**
Un sitio de ocho páginas con un formulario y un panel no justifica React. Sin
framework la página carga más rápido, no arrastra dependencias que envejecen, y
—lo más importante para sustentar— cada línea es explicable sin decir "eso lo
hace la librería".

**Detalle que vale la pena mencionar**
Los datos que escribe un usuario se insertan al DOM con `textContent`, nunca con
`innerHTML`. `innerHTML` interpreta lo que recibe como HTML: si alguien escribiera
`<script>` en el campo de descripción, se ejecutaría. `textContent` lo inserta
como texto plano. Eso cierra un ataque llamado **XSS almacenado**.

---

### Node.js — JavaScript fuera del navegador

**Qué es**
Un entorno que permite ejecutar JavaScript **en un servidor**, fuera del
navegador.

JavaScript nació encerrado en el navegador: solo podía manipular la página.
Node.js tomó el motor de JavaScript de Chrome y lo sacó de ahí, dándole acceso a
lo que un programa de servidor necesita: leer archivos, escuchar en un puerto de
red, conectarse a una base de datos.

**Cómo lo usé**
Es el entorno donde corre todo mi backend. Seis archivos, 530 líneas:

```
server.js                    Configuración y arranque
db.js                        Conexión a PostgreSQL
routes/categorias.js         Catálogo de tipos
routes/reportes.js           Registro y consulta de reportes
routes/admin.js              Sesión y estadísticas
middleware/adminAuth.js      Verificación de sesión
utils/detectarTipoArchivo.js Verificación de archivos
```

**Por qué Node y no otro lenguaje**
El mismo lenguaje en el navegador y en el servidor. No tengo que cambiar de
sintaxis mental al pasar del frontend al backend, lo cual en un proyecto de una
sola persona es una ventaja real de productividad.

---

### Express — El framework del backend

**Qué es**
Una librería que se monta sobre Node.js para manejar peticiones HTTP con menos
código. Node por sí solo puede recibir peticiones, pero tendrías que analizar la
URL a mano, decidir qué hacer con cada una, y armar la respuesta manualmente.

Express aporta dos conceptos:

- **Rutas**: "cuando llegue un POST a `/api/reportes`, ejecuta esta función"
- **Middlewares**: funciones que se ejecutan *antes* de llegar a la ruta, en
  cadena

**Cómo lo usé**
Los middlewares del proyecto, en el orden en que se ejecutan:

```
petición
   ↓
helmet          → añade cabeceras de seguridad
   ↓
cors            → política de origen cruzado
   ↓
express.json    → convierte el cuerpo JSON en objeto (máx. 100 KB)
   ↓
cookie-parser   → lee y verifica la firma de las cookies
   ↓
morgan          → registra la petición en el log
   ↓
[ruta específica]
   ↓
respuesta
```

Y en rutas puntuales hay middlewares adicionales: `requiereAdmin` verifica la
sesión antes de dejar pasar, y `limitadorEnvio` cuenta las peticiones por IP.

**Por qué Express**
Es el estándar de facto en Node, aporta lo necesario sin imponer una estructura
rígida de carpetas, y su modelo de middlewares encadenados encaja perfectamente
con capas de seguridad que se aplican en orden.

---

### PostgreSQL — La base de datos

**Qué es**
Un sistema de base de datos **relacional**. Guarda la información en tablas con
filas y columnas, y —esto es lo importante— **hace cumplir reglas** sobre esos
datos.

"Relacional" significa que las tablas se conectan entre sí y el motor garantiza
que esas conexiones sean válidas.

**Cómo la usé**
Tres tablas:

```
categorias_deepfake  →  reportes  →  evidencias
      (1)                (N)           (N)
```

Un reporte **pertenece a** una categoría. Un reporte **puede tener** varias
evidencias.

Las reglas que declaré:

| Regla | Qué garantiza |
|---|---|
| `FOREIGN KEY` | No se puede guardar un reporte con una categoría que no existe |
| `ON DELETE CASCADE` | Al borrar un reporte, sus evidencias se borran solas |
| `NOT NULL` | Los campos obligatorios no pueden quedar vacíos |
| `DEFAULT CURRENT_TIMESTAMP` | La fecha de registro se pone sola |

**Por qué relacional y no algo tipo MongoDB**
Porque mis datos *son* relacionales. Si usara una base documental, tendría que
garantizar desde el código que no queden evidencias huérfanas cuando se borre un
reporte. Con PostgreSQL, esa garantía la da el motor: **aunque mi código tuviera
un error, la base no aceptaría datos inconsistentes.**

**Por qué sin ORM**
Un ORM traduce automáticamente entre objetos de JavaScript y tablas SQL. Para
tres tablas, esa capa de abstracción añade más complejidad de la que quita, y me
impediría mostrar exactamente qué consulta se ejecuta. Uso el driver `pg` con SQL
escrito a mano y parametrizado.

---

### Nginx — El servidor web y proxy inverso

**Qué es**
Un servidor web que hace dos trabajos en este proyecto:

1. **Servir archivos estáticos**: cuando pides `index.html` o `styles.css`,
   Nginx los entrega directamente desde el disco.
2. **Proxy inverso**: cuando pides algo que empieza por `/api/`, Nginx no
   responde él, sino que reenvía la petición al backend y devuelve su respuesta.

Un proxy inverso es un intermediario que recibe las peticiones de fuera y decide
a qué servicio interno mandarlas.

**Cómo lo usé**
Tres reglas en `nginx/default.conf`:

```nginx
location / {          # cualquier cosa → archivo del frontend
    try_files $uri $uri/ =404;
}

location /api/ {      # datos → backend
    proxy_pass http://backend:3000/api/;
    client_max_body_size 16M;
}

location /uploads/ {  # archivos subidos → backend
    proxy_pass http://backend:3000/uploads/;
}
```

**Por qué es importante — esta es la respuesta clave**

Sin Nginx, el navegador tendría que hablar con dos servidores distintos: el
frontend en un puerto y la API en otro. Eso trae dos problemas:

- **CORS.** El navegador bloquea por seguridad las peticiones a un origen
  distinto del de la página. Habría que configurar permisos explícitos.
- **Exposición.** El backend tendría que estar accesible desde fuera.

Con Nginx al frente, para el navegador **todo viene del mismo lugar**
(`localhost:8080`). No hay CORS que resolver, y el backend puede quedar visible
solo dentro de la red interna de Docker.

---

### Docker — Los contenedores

**Qué es**
Docker empaqueta una aplicación junto con **todo lo que necesita para funcionar**
—su versión exacta de Node, sus librerías, su configuración— en una unidad
llamada contenedor, que se ejecuta igual en cualquier máquina.

**La diferencia con una máquina virtual** (esta pregunta es probable):
una máquina virtual simula un computador completo, con su propio sistema
operativo encima del tuyo. Un contenedor **comparte el núcleo del sistema
operativo anfitrión** y solo aísla los procesos y archivos. Por eso un contenedor
arranca en segundos y pesa megabytes, mientras una VM tarda minutos y pesa
gigabytes.

**Cómo lo usé**
Cuatro contenedores definidos en `docker-compose.yml`:

| Contenedor | Qué corre | Puerto |
|---|---|---|
| `alerta_db` | PostgreSQL 16 | 5433 |
| `alerta_backend` | Mi API en Node.js | 3000 |
| `alerta_nginx` | Servidor web | 8080 |
| `alerta_pgadmin` | Administrador visual de la BD | 5050 |

Se levantan todos con `docker compose up -d`.

**Los volúmenes** son la otra pieza. Un contenedor es desechable: si lo borras,
se va con todo lo que tenía dentro. Por eso los datos que deben sobrevivir viven
en volúmenes separados:

- `db_data` → los reportes
- `uploads_data` → los archivos de evidencia

Así puedo destruir y recrear el contenedor de la base de datos sin perder ni un
registro.

**El healthcheck.** El backend no puede arrancar antes que la base de datos. Lo
resolví con una condición: el backend espera a que PostgreSQL responda que está
*saludable*, no solo a que el contenedor esté *iniciado*. Un contenedor puede
estar arrancado pero la base todavía no aceptar conexiones.

**Por qué Docker**
Cuatro servicios con versiones fijas que funcionan igual en cualquier máquina.
Elimina el "en mi computador sí funciona", que es exactamente el riesgo que no
quieres correr el día de la sustentación.

---

### Git y GitHub — El control de versiones

**Qué es**
Git guarda el historial de todos los cambios del proyecto. Cada `commit` es una
fotografía del estado completo en un momento, con un mensaje que explica qué
cambió y por qué.

GitHub es el servicio que aloja ese historial en la nube y permite sincronizarlo
entre máquinas.

**Cómo lo usé**
23 commits con mensajes convencionales (`feat:`, `fix:`, `chore:`, `docs:`). Dos
máquinas sincronizadas: edito en el PC, ejecuto en la laptop, y GitHub es la
única fuente de verdad entre ambas.

**Lo que más vale la pena contar**
Durante el desarrollo subí por accidente un archivo con las contraseñas reales a
un repositorio público. La respuesta fue, en este orden:

1. **Rotar las cuatro credenciales**, porque borrar el archivo no deshace que
   estuvieron expuestas.
2. **Reescribir el historial** con `git filter-repo` para eliminarlas de todos
   los commits anteriores.
3. **Resincronizar** ambas máquinas.

Ese orden es la lección: en una filtración se rota primero y se limpia después.

---

## 3. Cómo está todo conectado

Esta es la explicación que más probablemente te pidan. Practícala en voz alta.

```
     El usuario abre localhost:8080 en su navegador
                        │
                        ▼
   ┌─────────────────────────────────────────────┐
   │  NGINX recibe TODAS las peticiones          │
   │  Es la única puerta de entrada              │
   └───────────┬─────────────────┬───────────────┘
               │                 │
        ¿pide un archivo?   ¿pide datos (/api/)?
               │                 │
               ▼                 ▼
      Lo entrega directo    Lo reenvía al BACKEND
      (HTML, CSS, JS,             │
       imágenes)                  ▼
                        ┌──────────────────────┐
                        │  NODE.JS + EXPRESS   │
                        │                      │
                        │  1. Middlewares      │
                        │     (seguridad,      │
                        │      límites, logs)  │
                        │  2. Ruta específica  │
                        │  3. Validación       │
                        └──────────┬───────────┘
                                   │
                            SQL parametrizado
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │     POSTGRESQL       │
                        │  Guarda o consulta   │
                        │  Verifica las reglas │
                        └──────────┬───────────┘
                                   │
                            devuelve filas
                                   │
                                   ▼
                        Express arma un JSON
                                   │
                                   ▼
                        Nginx lo pasa al navegador
                                   │
                                   ▼
                     JavaScript lo pinta en la página
```

**La frase que resume todo:**

> Nginx es la puerta, Node es la lógica, PostgreSQL es la memoria, y Docker es la
> caja que los mantiene juntos y hace que funcionen igual en cualquier máquina.

---

## 4. El recorrido completo de una petición

Si te piden trazar un caso concreto, usa este. Es el más completo del sistema.

### Caso: un usuario envía un reporte con una captura de pantalla

**1. En el navegador**
El usuario llena el formulario y pulsa "Enviar reporte". `main.js` intercepta el
envío, verifica que los campos obligatorios estén completos, y arma un
`FormData` —un formato que permite mandar texto y archivos en la misma petición.

**2. Sale la petición**
`POST` a `/api/reportes`, con el cuerpo en formato `multipart/form-data`.

**3. Nginx**
Ve que la ruta empieza por `/api/`, así que no la responde él: la reenvía al
contenedor `backend` en el puerto 3000. También aplica su límite de 16 MB.

**4. Middlewares de Express**, en orden:
- `helmet` pone las cabeceras de seguridad
- `morgan` registra la petición
- `limitadorEnvio` comprueba que esa IP no haya superado 10 reportes en 15 minutos
- `multer` recibe el archivo: verifica que el tipo declarado esté permitido y que
  no supere 15 MB, y lo guarda en disco **con un nombre aleatorio UUID**

**5. Validación en el servidor**
Se comprueban todos los campos: fecha válida, correo con formato correcto,
descripción entre 10 y 4000 caracteres, categoría numérica, y que no vengan
archivo y enlace a la vez. Si algo falla, se borra el archivo y se responde 400.

**6. Verificación del contenido real del archivo**
Se leen los primeros bytes del archivo guardado y se comparan con las firmas
binarias de los nueve formatos permitidos. Si alguien renombró un ejecutable a
`.jpg`, aquí se detecta: se borra el archivo y se rechaza la petición.

**7. Transacción en PostgreSQL**
```sql
BEGIN
  INSERT INTO reportes (...) VALUES ($1, $2, ...) RETURNING id_reporte
  INSERT INTO evidencias (id_reporte, tipo_evidencia, enlace_archivo) VALUES (...)
COMMIT
```
Los `$1, $2` son **parámetros**, no texto concatenado: por eso no hay inyección
SQL posible. Si cualquiera de los dos INSERT falla, se hace `ROLLBACK` y se borra
el archivo del disco.

**8. Respuesta**
`201 Created` con el número de expediente.

**9. De vuelta en el navegador**
`main.js` recibe el JSON, oculta el formulario y muestra la pantalla de
confirmación con el número de expediente en grande.

**Y si algo salió mal:** el usuario ve un mensaje claro y entendible. El detalle
técnico del error queda en el log del servidor, nunca se le envía al cliente.

---

## 5. Banco de preguntas

### Sobre el proyecto

**¿Por qué elegiste este tema?**
> Porque la suplantación con IA creció mucho más rápido que la capacidad de la
> gente para reconocerla —409% en un año en Colombia— y la información disponible
> está dispersa. No hay un lugar que enseñe a identificarla, diga qué hacer, y
> permita dejar constancia. El proyecto integra esas tres cosas.

**¿Detecta deepfakes automáticamente?**
> No, y está declarado dentro del propio sitio. No hay un modelo de detección
> detrás. Lo que hace es educar, orientar y registrar casos. Habría sido fácil
> simular un porcentaje de "probabilidad de deepfake", pero sería inventar un
> resultado sin respaldo técnico. La arquitectura sí está preparada para
> integrar un modelo real más adelante sin reescribir la aplicación.

**¿Qué fue lo más difícil?**
> Un fallo silencioso. Al adjuntar un archivo, el reporte se guardaba con éxito
> pero la evidencia nunca llegaba, y no aparecía ningún error. La causa era que
> el navegador ejecutaba una versión anterior del JavaScript desde su caché, que
> enviaba el formulario como JSON —formato donde un archivo simplemente
> desaparece. Los demás campos sí llegaban, por eso todo parecía correcto. Lo
> resolví añadiendo registros temporales en el servidor para ver exactamente qué
> llegaba, en vez de seguir cambiando código a ciegas.

**¿Cuánto código escribiste?**
> Unas 5.600 líneas propias: 8 páginas HTML, una hoja de estilos de 2.190 líneas,
> tres archivos JavaScript del navegador, seis del backend, el esquema SQL y la
> configuración de Docker y Nginx.

### Sobre las decisiones técnicas

**¿Por qué no usaste React o Bootstrap?**
> Un sitio de ocho páginas con un formulario y un panel no lo justifica. Sin
> framework carga más rápido, no arrastro dependencias que envejecen, y puedo
> explicar cada línea sin decir "eso lo hace la librería". En un proyecto donde
> tengo que defender cada decisión, eso pesa más que la comodidad.

**¿Por qué PostgreSQL y no MySQL o MongoDB?**
> Frente a MongoDB, porque mis datos son claramente relacionales y quiero que las
> relaciones las garantice el motor, no mi código. Frente a MySQL, PostgreSQL
> tiene mejor manejo de tipos y funciones como `json_agg`, que uso para traer
> cada reporte con sus evidencias en una sola consulta.

**¿Por qué Docker si el proyecto es local?**
> Por reproducibilidad. Los cuatro servicios tienen versiones fijas y funcionan
> igual en cualquier máquina. Desarrollo en un PC con Windows y ejecuto en una
> laptop con Arch Linux: sin Docker tendría que instalar y configurar PostgreSQL,
> Node y Nginx en cada una, con el riesgo de que las versiones no coincidan.

**¿Por qué Nginx si Node puede servir archivos?**
> Node puede, pero Nginx está optimizado para eso y me da algo más importante:
> un único origen. El navegador solo habla con Nginx, así que no hay problemas de
> CORS y el backend puede quedar oculto de la red externa. También me da un solo
> lugar donde aplicar límites de tamaño y enrutamiento.

**¿Por qué separaste el backend en carpetas?**
> Una responsabilidad por archivo. `server.js` solo configura y monta rutas,
> `routes/` define qué responde cada dirección, `middleware/` tiene lo que se
> ejecuta antes de llegar a una ruta, y `db.js` es el único que sabe cómo
> conectarse a PostgreSQL. Si cambia la forma de conexión, solo toco un archivo.

### Sobre la seguridad

**¿Cómo evitas la inyección SQL?**
> Con consultas parametrizadas. Nunca concateno datos del usuario dentro de la
> sentencia SQL. Escribo `WHERE id = $1` y paso el valor aparte; el driver se
> encarga de que ese valor se trate siempre como dato, nunca como código
> ejecutable. Aunque alguien escriba `'; DROP TABLE reportes;--` en un campo, se
> guarda como texto.

**¿Cómo validas los archivos que suben?**
> En cuatro capas. Primero, lista blanca de tipos MIME permitidos. Segundo,
> límite de 15 MB. Tercero, se guarda con nombre aleatorio, descartando por
> completo el nombre original —eso evita path traversal y sobrescritura. Y
> cuarto, la más importante: leo los primeros bytes del archivo y verifico que
> su firma binaria corresponda a un formato permitido. Si alguien renombra un
> ejecutable a `.jpg`, se detecta ahí y se rechaza.

**¿Y por qué escribiste esa verificación a mano?**
> Empecé usando la librería `file-type`, pero `npm audit` reveló que la versión
> compatible con mi proyecto tenía una vulnerabilidad de denegación de servicio
> —un bucle infinito en su analizador de formato ASF— sin parche disponible. Como
> solo necesito reconocer nueve formatos concretos, la reemplacé por 64 líneas
> propias. Menos superficie de ataque, sin dependencias y totalmente auditable.

**¿Cómo protegiste el panel?**
> Con cuatro capas. La contraseña se compara con `timingSafeEqual`, que tarda lo
> mismo sin importar dónde falle —una comparación normal devuelve antes cuando el
> primer carácter no coincide, y esa diferencia de tiempo se puede medir. Hay
> máximo cinco intentos por IP cada quince minutos. La sesión va en una cookie
> firmada: si alguien la modifica, la firma no coincide. Y es `httpOnly`, así que
> JavaScript no puede leerla.

**¿Dónde guardas las contraseñas?**
> En variables de entorno, en un archivo `.env` que está excluido del repositorio
> por `.gitignore`. En el repositorio solo hay un `.env.example` con valores
> ficticios que documenta qué variables hacen falta. Además, `docker-compose.yml`
> usa una sintaxis que hace que Docker se niegue a arrancar si falta una
> contraseña, en vez de usar silenciosamente un valor débil por defecto.

**¿Qué pasa si alguien envía muchos reportes seguidos?**
> Hay un límite de 10 reportes por IP cada 15 minutos, y de 5 intentos de login
> en el mismo periodo. Es una defensa básica contra saturación y fuerza bruta.

### Sobre la base de datos

**Explícame el modelo de datos.**
> Tres tablas. `categorias_deepfake` es un catálogo fijo de los cuatro tipos.
> `reportes` guarda un registro por incidente. `evidencias` guarda cero o más
> archivos por reporte. La relación es uno a muchos en ambos casos: una categoría
> tiene muchos reportes, un reporte tiene muchas evidencias.

**¿Qué pasa si borras un reporte que tiene evidencias?**
> Las evidencias se borran automáticamente, por el `ON DELETE CASCADE` en la
> clave foránea. No tengo que acordarme de hacerlo desde el código: lo garantiza
> el motor.

**¿Por qué usaste una transacción al guardar el reporte?**
> Porque guardar un reporte con evidencia son dos INSERT. Si el primero funciona
> y el segundo falla, quedaría un reporte sin su evidencia y un archivo huérfano
> en el disco. Con la transacción, o se guardan los dos o no se guarda ninguno.

### Sobre accesibilidad y diseño

**¿Qué hiciste en accesibilidad?**
> Enlace de salto al contenido en cada página, HTML semántico, todas las imágenes
> con texto alternativo, todo campo con su etiqueta asociada, `aria-live` para
> los mensajes que aparecen sin recargar, foco visible en todo elemento
> enfocable, respeto a `prefers-reduced-motion`, y verificación de contraste de
> todas las combinaciones de color contra el mínimo AA. Dos combinaciones
> fallaron durante el desarrollo y las corregí.

**¿Cómo lograste que sea adaptable?**
> Mobile-first: los estilos base son para pantalla pequeña y los `@media` van
> añadiendo complejidad. Son 14 puntos de quiebre, cada uno definido por dónde el
> contenido concreto empieza a verse mal, no por tamaños de dispositivo
> arbitrarios. El caso más claro es la tabla del panel: sus siete columnas se
> convierten en fichas apiladas por debajo de 760px.

---

## 6. Preguntas difíciles

Preguntas que buscan encontrar el límite de lo que sabes. La respuesta correcta
casi siempre incluye reconocer una limitación.

**¿Esto está listo para producción?**
> No, y por razones concretas: no hay HTTPS, el panel usa una contraseña
> compartida en vez de cuentas individuales, no hay pruebas automatizadas, y los
> archivos no pasan por un antivirus. Para un entorno académico y local cumple;
> para exponerlo públicamente habría que resolver esas cuatro cosas primero.

**¿Qué pasa si tu base de datos crece a un millón de registros?**
> El panel dejaría de funcionar bien: hoy trae todos los reportes en una sola
> consulta sin paginación. Habría que añadir paginación y probablemente índices
> sobre las columnas por las que se filtra. No lo implementé porque optimizar
> antes de tener el problema añade complejidad sin beneficio medible, pero está
> identificado como trabajo futuro.

**Si alguien roba tu archivo `.env`, ¿qué pasa?**
> Tendría acceso a la base de datos y al panel. Por eso está fuera del
> repositorio. De hecho me pasó: subí ese archivo por accidente. La respuesta fue
> rotar las cuatro credenciales primero —porque borrarlo no deshace la
> exposición— y después reescribir el historial de Git para eliminarlo de todos
> los commits anteriores.

**¿Cómo sabes que tu código es seguro?**
> No puedo afirmar que sea seguro en términos absolutos; puedo decir qué ataques
> concretos previne y cómo. Tengo identificados los vectores principales para una
> aplicación que recibe datos y archivos de desconocidos: inyección SQL, XSS,
> archivos maliciosos, fuerza bruta, filtración de errores. Para cada uno hay una
> medida específica. Lo que no tengo es una auditoría externa ni pruebas de
> penetración.

**¿Cuánto de esto entiendes realmente?**
Responde con honestidad y con hechos, no con generalidades:
> Puedo explicar cada decisión y por qué la tomé frente a las alternativas. Puedo
> trazar el recorrido completo de una petición desde el navegador hasta la base
> de datos y de vuelta. Durante el desarrollo diagnostiqué varios problemas
> siguiendo su causa raíz: el volumen de PostgreSQL que conservaba la contraseña
> vieja, el caché del navegador que hacía fallar la subida en silencio, Nginx
> que no relee su configuración al reiniciar el otro contenedor. Lo que estoy
> aprendiendo todavía es el ecosistema: qué librería existe para qué, qué
> convenciones sigue la comunidad.

**¿Por qué no hiciste pruebas automatizadas?**
> Es la ausencia más notoria del proyecto y la reconozco. Verifiqué de forma
> manual y con comprobaciones puntuales durante el desarrollo, pero eso no
> sustituye una suite de pruebas. Es lo primero en mi lista de trabajo futuro:
> empezaría por los validadores y la detección de tipo de archivo, que son
> funciones puras y fáciles de probar.

---

## 7. Guion de la demostración

Un orden que cuenta una historia, en unos 8 minutos.

### Antes de empezar

```bash
sudo systemctl start docker
cd ~/alerta-deepfake
git pull origin main
docker compose up -d --build
docker compose ps
curl -s http://localhost:8080/api/health
```

Ten abiertas de antemano: el navegador en `localhost:8080`, pgAdmin en
`localhost:5050`, y VS Code con el proyecto.

### El recorrido

**1. Inicio** (1 min)
Muestra el titular y la banda roja de urgencia. Explica que las tres tarjetas
están organizadas por intención del usuario —"quiero saber si esto es falso",
"ya me pasó", "quiero dejar constancia"— y no por temas, porque la gente llega
con una situación, no con una categoría.

**2. Conceptos** (1 min)
El diagrama de tres pasos de cómo funciona la IA generativa. Detente en la
comparativa contraseña/biometría: una contraseña se cambia en dos minutos, tu
cara no. Esa irreversibilidad es la razón por la que la ley les da tratamiento
especial.

**3. Tipologías** (1 min)
Muestra el selector "¿Qué te llegó?" y haz clic en uno para que salte al
expediente. Señala que cada señal explica el *porqué*, no solo el *qué*.

**4. Simulador** (1.5 min)
Responde dos o tres casos. Menciona el detalle que distingue este ejercicio: si
alguien contesta "todo es fraude", saca 4 de 6 pero recibe un mensaje específico
advirtiendo que desconfiar de todo también tiene un costo. El simulador no
premia la paranoia.

**5. Reportar** (2 min)
Llena el formulario en vivo y **adjunta un archivo**. Explica mientras tanto qué
está pasando por detrás: validación en el servidor, verificación del contenido
real del archivo, transacción en la base de datos. Muestra la pantalla de
confirmación con el número de expediente.

**6. Panel** (1.5 min)
Inicia sesión. Muestra que el reporte que acabas de crear ya está ahí, con su
evidencia descargable. Cambia su estado a "En revisión" y señala cómo se
actualizan las estadísticas al instante.

**7. pgAdmin** (1 min)
Este es el momento fuerte. Ejecuta:

```sql
SELECT r.id_reporte, r.nombre_afectado, c.nombre_categoria,
       r.estado_revision, e.tipo_evidencia, e.enlace_archivo
FROM reportes r
JOIN categorias_deepfake c ON r.id_categoria = c.id_categoria
LEFT JOIN evidencias e ON e.id_reporte = r.id_reporte
ORDER BY r.id_reporte DESC;
```

Muestra que el reporte que llenaste hace un minuto está realmente en la base de
datos, con su categoría y su evidencia relacionadas. Eso demuestra que el sistema
funciona de extremo a extremo, no que la pantalla se vea bonita.

**8. Responsive** (30 s)
Abre el sitio en el teléfono, o reduce la ventana del navegador. Muestra la tabla
del panel convirtiéndose en fichas.

### Si hay tiempo

Abre `docker compose ps` para mostrar los cuatro contenedores, y `docker compose
logs backend --tail=20` para mostrar las peticiones que acabas de hacer
registradas en el log.

---

## 8. Datos para tener presentes

| Dato | Valor |
|---|---|
| Líneas de código propio | ~5.600 |
| Páginas HTML | 8 |
| Endpoints de la API | 9 |
| Tablas en la base de datos | 3 |
| Contenedores Docker | 4 |
| Volúmenes persistentes | 3 |
| Dependencias de producción | 9 |
| Commits en Git | 23 |
| Puntos de quiebre responsive | 14 |
| Formatos de archivo aceptados | 9 |
| Casos en el simulador | 6 |
| Tamaño máximo de archivo | 15 MB |
| Límite de reportes por IP | 10 cada 15 min |
| Límite de intentos de login | 5 cada 15 min |

### Cifras del problema

| Dato | Valor |
|---|---|
| Casos de suplantación en Colombia, 2019 | 333 |
| Casos en 2020 | 1.527 |
| Crecimiento | 409% |

### Normativa

| Norma | Contenido |
|---|---|
| Ley 1273 de 2009 | Delitos informáticos. Protege la información y los datos como bien jurídico |
| Ley 1581 de 2012 | Habeas Data. Su artículo 5 incluye los datos biométricos entre los sensibles |

Artículos más relevantes de la Ley 1273: **269A** (acceso abusivo), **269F**
(violación de datos personales), **269G** (suplantación de sitios web), **269I**
(hurto por medios informáticos), **269J** (transferencia no consentida de
activos).

---

## 9. Qué hacer si no sabes algo

**No inventes.** Un profesor detecta una respuesta improvisada de inmediato, y
una sola respuesta inventada pone en duda todo lo que dijiste antes.

**Fórmulas que funcionan:**

> "No lo implementé y te digo por qué: [razón]. Si tuviera que hacerlo, empezaría
> por [enfoque]."

> "Eso no lo sé con certeza. Lo que sí puedo explicarte es [lo relacionado que sí
> dominas]."

> "No lo consideré en su momento. Ahora que lo mencionas, el riesgo sería [X] y
> se resolvería con [Y]."

**Reconocer un límite con criterio suma, no resta.** Es exactamente lo que
distingue a alguien que entiende su proyecto de alguien que solo lo copió.

---

## Recordatorio final

Tienes tres cosas sólidas para defender, y ninguna es que el sitio se vea bien:

1. **Cada decisión técnica tiene una razón**, y en varios casos rechazaste la
   opción cómoda por una mejor: sin framework, sin ORM, sin la librería
   vulnerable.

2. **Diagnosticaste problemas reales siguiendo su causa raíz**, no aplicando
   parches: el volumen de PostgreSQL, el caché del navegador, Nginx sin
   reiniciar, la filtración de credenciales.

3. **Declaras las limitaciones del proyecto dentro del propio proyecto.** El
   sitio dice que no detecta deepfakes. Esa honestidad es más defendible
   académicamente que una funcionalidad simulada.
