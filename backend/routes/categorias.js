const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/categorias -> catálogo para el select del formulario
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM categorias_deepfake');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
