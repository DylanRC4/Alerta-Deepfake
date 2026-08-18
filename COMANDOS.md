# Comandos rápidos — Alerta Deepfake

Referencia para trabajar directamente desde la laptop Linux.
Todos los comandos se ejecutan dentro de `~/alerta-deepfake`.

---

## Arranque en 4 pasos

```bash
# 1. Docker debe estar corriendo (en Arch no arranca solo tras reiniciar)
sudo systemctl start docker

# 2. Ir al proyecto y traer los últimos cambios
cd ~/alerta-deepfake
git pull origin main

# 3. Levantar los servicios en segundo plano
docker compose up -d

# 4. Confirmar que los cuatro contenedores están arriba
docker compose ps
```

`alerta_db` debe decir **healthy**; los otros tres, **Up**.

Si cambiaste código del backend (carpeta `backend/`), añade `--build`:

```bash
docker compose up -d --build
```

---

## Dónde ver el sitio

Trabajando en la propia laptop Linux:

| Qué | Dirección |
|---|---|
| Sitio web | http://localhost:8080 |
| Estado de la API | http://localhost:8080/api/health |
| pgAdmin (ver la base de datos) | http://localhost:5050 |

### Para verlo desde el celular u otro equipo

Con datos compartidos del celular **la IP de la laptop cambia cada vez**. Averígualla así:

```bash
ip -4 addr show | grep inet | grep -v 127.0.0.1
```

Toma la dirección que aparezca (algo como `192.168.x.x`) y en el otro
dispositivo abre `http://ESA_IP:8080`. Ambos deben estar en la misma red.

---

## Ver qué está pasando

```bash
# Log del backend, en vivo (Ctrl+C para salir)
docker compose logs -f backend

# Últimas 30 líneas, sin quedarse enganchado
docker compose logs backend --tail=30

# Log de Nginx (errores 404, peticiones)
docker compose logs nginx --tail=30

# Todo junto
docker compose logs --tail=50
```

---

## Detener y reiniciar

```bash
# Detener todo (los datos se conservan)
docker compose stop

# Volver a arrancar
docker compose start

# Reiniciar solo el backend
docker compose restart backend

# Apagar y eliminar los contenedores (los datos se conservan)
docker compose down
```

---

## Después de cambiar algo

| Qué cambiaste | Qué hay que hacer |
|---|---|
| HTML, CSS o JS del frontend | Nada. Recarga el navegador con **Ctrl+Shift+R** |
| Código del backend (`backend/`) | `docker compose up -d --build` |
| El archivo `.env` | `docker compose up -d --force-recreate backend` |
| `nginx/default.conf` | `docker compose restart nginx` |
| `docker-compose.yml` | `docker compose up -d` |

**Por qué el `.env` necesita `--force-recreate`:** Node lee las variables de
entorno una sola vez, al arrancar. Un contenedor que ya está corriendo sigue
con los valores viejos en memoria aunque edites el archivo.

---

## Flujo de trabajo con Git

```bash
# Antes de empezar a trabajar: traer lo último
git pull origin main

# Ver qué cambiaste
git status
git --no-pager diff

# Guardar y subir
git add -A
git commit -m "descripción breve de lo que hiciste"
git push origin main
```

Si te pide la frase de contraseña de la llave SSH cada vez:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

Eso dura hasta que cierres esa terminal.

---

## Problemas frecuentes

**El navegador se queda cargando y no pasa nada**
Comprueba que los contenedores estén arriba con `docker compose ps`. Si
`alerta_backend` no aparece, Nginx se queda esperando indefinidamente.

**"Contraseña incorrecta" en el panel, aunque sea la correcta**
Superaste los 5 intentos permitidos en 15 minutos. El contador vive en
memoria, así que se borra reiniciando el backend:

```bash
docker compose up -d --force-recreate backend
```

**Un cambio del frontend no se ve**
Es caché del navegador. **Ctrl+Shift+R**, o abre una ventana de incógnito
para descartarlo del todo.

**Error 404 en un archivo que sí existe**
Si tocaste la configuración de Nginx, ese contenedor no la relee solo:

```bash
docker compose restart nginx
```

**`permission denied` al usar docker**
Tu usuario no está en el grupo docker. Se arregla una sola vez:

```bash
sudo usermod -aG docker $USER
```

Luego cierra sesión y vuelve a entrar para que tome efecto.

---

## Nunca ejecutes esto

```bash
docker compose down -v          # BORRA la base de datos y las evidencias
docker volume rm alerta-deepfake_db_data       # BORRA todos los reportes
docker volume rm alerta-deepfake_uploads_data  # BORRA los archivos subidos
docker system prune -a --volumes               # BORRA todo lo anterior
```

La bandera `-v` elimina los volúmenes, que es donde viven los datos reales.
Los reportes y las evidencias subidas no se recuperan.

---

## Verificación antes de sustentar

```bash
cd ~/alerta-deepfake
git pull origin main
docker compose up -d --build
docker compose ps
curl -s http://localhost:8080/api/health
```

Debe responder `{"status":"ok"}`. Después abre http://localhost:8080 y
recorre las seis secciones, envía un reporte de prueba y entra al panel.
