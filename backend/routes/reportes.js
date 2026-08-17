const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const pool = require('../db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIPOS_EVIDENCIA_VALIDOS = ['Captura de pantalla', 'Audio', 'Video', 'Enlace', 'Otro'];

// Evita que el formulario público sea usado para saturar la base de datos
const limitadorEnvio = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máx. 10 reportes por IP cada 15 minutos
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Has enviado demasiados reportes en poco tiempo. Intenta de nuevo más tarde.' }
});

function validarReporte(body) {
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
  if (enlace_archivo && !tipo_evidencia) {
    errores.push('Si agregas un enlace de evidencia, selecciona también el tipo de evidencia');
  }
  if (tipo_evidencia && !TIPOS_EVIDENCIA_VALIDOS.includes(tipo_evidencia)) {
    errores.push('tipo_evidencia no es válido');
  }
  if (enlace_archivo && enlace_archivo.length > 2048) {
    errores.push('enlace_archivo es demasiado largo');
  }

  return errores;
}

// POST /api/reportes -> registrar un nuevo reporte (y su evidencia, si se adjunta)
router.post('/', limitadorEnvio, async (req, res) => {
  const errores = validarReporte(req.body || {});
  if (errores.length > 0) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
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

    if (enlace_archivo && tipo_evidencia) {
      await client.query(
        `INSERT INTO evidencias (id_reporte, tipo_evidencia, enlace_archivo)
         VALUES ($1, $2, $3)`,
        [idReporte, tipo_evidencia, enlace_archivo.trim()]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id_reporte: idReporte, mensaje: 'Reporte registrado correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
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
