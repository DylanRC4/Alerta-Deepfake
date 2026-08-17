const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/reportes -> registrar un nuevo reporte (usado por reporte.html)
router.post('/', async (req, res) => {
  const {
    fecha_incidente,
    nombre_afectado,
    correo_contacto,
    id_categoria,
    descripcion_hechos,
    plataforma_origen
  } = req.body;

  if (!fecha_incidente || !nombre_afectado || !correo_contacto || !id_categoria || !descripcion_hechos) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO reportes
         (fecha_incidente, nombre_afectado, correo_contacto, id_categoria, descripcion_hechos, plataforma_origen)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_reporte`,
      [fecha_incidente, nombre_afectado, correo_contacto, id_categoria, descripcion_hechos, plataforma_origen || null]
    );
    res.status(201).json({ id_reporte: rows[0].id_reporte, mensaje: 'Reporte registrado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reportes -> listar reportes con el nombre de su categoría
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, c.nombre_categoria
       FROM reportes r
       JOIN categorias_deepfake c ON r.id_categoria = c.id_categoria
       ORDER BY r.fecha_registro DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
