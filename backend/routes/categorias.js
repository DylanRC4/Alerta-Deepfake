const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/categorias -> catálogo para el select del formulario
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM categorias_deepfake ORDER BY id_categoria'
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/categorias]', err);
    res.status(500).json({ error: 'No se pudieron obtener las categorías.' });
  }
});

module.exports = router;
