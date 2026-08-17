const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const crypto = require('crypto');
const FileType = require('file-type');
const pool = require('../db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIPOS_EVIDENCIA_VALIDOS = ['Captura de pantalla', 'Documento', 'Audio', 'Video', 'Enlace', 'Otro'];

// Tipos MIME permitidos -> extensión con la que se guarda el archivo en disco
const MIME_A_EXTENSION = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'video/mp4': '.mp4',
  'video/webm': '.webm'
};
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = MIME_A_EXTENSION[file.mimetype] || path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!MIME_A_EXTENSION[file.mimetype]) {
      return cb(new Error('TIPO_NO_PERMITIDO'));
    }
    cb(null, true);
  }
});

// Envuelve multer para devolver mensajes de error claros en vez de un 500 genérico
function subirArchivo(req, res, next) {
  upload.single('archivo_evidencia')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El archivo supera el tamaño máximo permitido (15 MB).' });
      }
      return res.status(400).json({ error: 'No se pudo procesar el archivo adjunto.' });
    } else if (err) {
      if (err.message === 'TIPO_NO_PERMITIDO') {
        return res.status(400).json({ error: 'El tipo de archivo no está permitido.' });
      }
      return res.status(400).json({ error: 'No se pudo procesar el archivo adjunto.' });
    }
    next();
  });
}

async function borrarArchivoSiExiste(rutaAbsoluta) {
  if (!rutaAbsoluta) return;
  try {
    await fsp.unlink(rutaAbsoluta);
  } catch {
    // Si ya no existe o no se pudo borrar, no es crítico: no interrumpe la respuesta al usuario.
  }
}

// Evita que el formulario público sea usado para saturar la base de datos o el disco
const limitadorEnvio = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máx. 10 reportes por IP cada 15 minutos
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Has enviado demasiados reportes en poco tiempo. Intenta de nuevo más tarde.' }
});

function validarReporte(body, tieneArchivo) {
  const errores = [];
  const {
    fecha_incidente,
    nombre_afectado,
    correo_contacto,
    id_categoria,
    descripcion_hechos,
    plataforma_origen,
    tipo_evidencia,
    enlace_archivo
  } = body;

  if (!fecha_incidente || Number.isNaN(Date.parse(fecha_incidente))) {
    errores.push('fecha_incidente es obligatoria y debe ser una fecha válida');
  }
  if (!nombre_afectado || nombre_afectado.trim().length < 2 || nombre_afectado.trim().length > 150) {
    errores.push('nombre_afectado es obligatorio (entre 2 y 150 caracteres)');
  }
  if (!correo_contacto || !EMAIL_REGEX.test(correo_contacto) || correo_contacto.length > 150) {
    errores.push('correo_contacto debe ser un correo electrónico válido');
  }
  if (!id_categoria || Number.isNaN(Number(id_categoria))) {
    errores.push('id_categoria es obligatorio y debe ser numérico');
  }
  if (!descripcion_hechos || descripcion_hechos.trim().length < 10 || descripcion_hechos.length > 4000) {
    errores.push('descripcion_hechos es obligatoria (mínimo 10 caracteres, máximo 4000)');
  }
  if (plataforma_origen && plataforma_origen.length > 100) {
    errores.push('plataforma_origen no puede superar 100 caracteres');
  }

  const hayEnlace = Boolean(enlace_archivo && enlace_archivo.trim());
  if (hayEnlace && tieneArchivo) {
    errores.push('Elige un solo método de evidencia: sube un archivo o pega un enlace, no ambos');
  }
  if ((hayEnlace || tieneArchivo) && !tipo_evidencia) {
    errores.push('Si agregas evidencia, selecciona también el tipo de evidencia');
  }
  if (tipo_evidencia && !TIPOS_EVIDENCIA_VALIDOS.includes(tipo_evidencia)) {
    errores.push('tipo_evidencia no es válido');
  }
  if (hayEnlace && enlace_archivo.length > 2048) {
    errores.push('enlace_archivo es demasiado largo');
  }

  return errores;
}

// POST /api/reportes -> registrar un nuevo reporte (con evidencia opcional: archivo o enlace)
router.post('/', limitadorEnvio, subirArchivo, async (req, res) => {
  const archivoSubido = req.file || null;
  const errores = validarReporte(req.body || {}, Boolean(archivoSubido));

  if (errores.length > 0) {
    await borrarArchivoSiExiste(archivoSubido && archivoSubido.path);
    return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
  }

  // Verifica el CONTENIDO real del archivo (magic bytes), no solo la extensión declarada.
  if (archivoSubido) {
    try {
      const tipoReal = await FileType.fromFile(archivoSubido.path);
      if (!tipoReal || !MIME_A_EXTENSION[tipoReal.mime]) {
        await borrarArchivoSiExiste(archivoSubido.path);
        return res.status(400).json({ error: 'El contenido del archivo no coincide con un tipo permitido.' });
      }
    } catch (err) {
      await borrarArchivoSiExiste(archivoSubido.path);
      console.error('[POST /api/reportes] error verificando archivo', err);
      return res.status(400).json({ error: 'No se pudo validar el archivo adjunto.' });
    }
  }

  const {
    fecha_incidente,
    nombre_afectado,
    correo_contacto,
    id_categoria,
    descripcion_hechos,
    plataforma_origen,
    tipo_evidencia,
    enlace_archivo
  } = req.body;

  const enlaceEvidenciaFinal = archivoSubido
    ? `/uploads/${archivoSubido.filename}`
    : (enlace_archivo && enlace_archivo.trim() ? enlace_archivo.trim() : null);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO reportes
         (fecha_incidente, nombre_afectado, correo_contacto, id_categoria, descripcion_hechos, plataforma_origen)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_reporte`,
      [
        fecha_incidente,
        nombre_afectado.trim(),
        correo_contacto.trim(),
        id_categoria,
        descripcion_hechos.trim(),
        plataforma_origen ? plataforma_origen.trim() : null
      ]
    );
    const idReporte = rows[0].id_reporte;

    if (enlaceEvidenciaFinal) {
      await client.query(
        `INSERT INTO evidencias (id_reporte, tipo_evidencia, enlace_archivo)
         VALUES ($1, $2, $3)`,
        [idReporte, tipo_evidencia, enlaceEvidenciaFinal]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id_reporte: idReporte, mensaje: 'Reporte registrado correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    await borrarArchivoSiExiste(archivoSubido && archivoSubido.path);
    console.error('[POST /api/reportes]', err);
    if (err.code === '23503') {
      // Violación de clave foránea -> id_categoria no existe
      return res.status(400).json({ error: 'La categoría seleccionada no existe' });
    }
    res.status(500).json({ error: 'No se pudo registrar el reporte. Intenta de nuevo más tarde.' });
  } finally {
    client.release();
  }
});

// GET /api/reportes -> listar reportes con su categoría y evidencias asociadas
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, c.nombre_categoria,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id_evidencia', e.id_evidencia,
                    'tipo_evidencia', e.tipo_evidencia,
                    'enlace_archivo', e.enlace_archivo
                  )
                ) FILTER (WHERE e.id_evidencia IS NOT NULL),
                '[]'
              ) AS evidencias
       FROM reportes r
       JOIN categorias_deepfake c ON r.id_categoria = c.id_categoria
       LEFT JOIN evidencias e ON e.id_reporte = r.id_reporte
       GROUP BY r.id_reporte, c.nombre_categoria
       ORDER BY r.fecha_registro DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/reportes]', err);
    res.status(500).json({ error: 'No se pudieron obtener los reportes.' });
  }
});

module.exports = router;
