const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const pool = require('../db');
const { SESSION_COOKIE, SESSION_MAX_AGE_MS, requiereAdmin } = require('../middleware/adminAuth');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// Limita intentos de login para dificultar fuerza bruta sobre la contraseña compartida
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.' }
});

function compararConstante(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

router.post('/login', limitadorLogin, (req, res) => {
  const { password } = req.body || {};
  if (!password || !ADMIN_PASSWORD || !compararConstante(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  res.cookie(SESSION_COOKIE, 'activa', {
    httpOnly: true,
    signed: true,
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE_MS
  });
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

router.get('/check', (req, res) => {
  const autenticado = Boolean(req.signedCookies && req.signedCookies[SESSION_COOKIE] === 'activa');
  res.json({ autenticado });
});

// GET /api/admin/estadisticas -> conteos para el panel (protegido)
router.get('/estadisticas', requiereAdmin, async (req, res) => {
  try {
    const [totalRes, porCategoriaRes, conEvidenciaRes, porEstadoRes] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM reportes'),
      pool.query(
        `SELECT c.nombre_categoria, c.nivel_riesgo, COUNT(r.id_reporte)::int AS total
         FROM categorias_deepfake c
         LEFT JOIN reportes r ON r.id_categoria = c.id_categoria
         GROUP BY c.id_categoria, c.nombre_categoria, c.nivel_riesgo
         ORDER BY total DESC`
      ),
      pool.query('SELECT COUNT(DISTINCT id_reporte)::int AS total FROM evidencias'),
      pool.query(
        `SELECT estado_revision, COUNT(*)::int AS total
         FROM reportes
         GROUP BY estado_revision
         ORDER BY total DESC`
      )
    ]);

    res.json({
      totalReportes: totalRes.rows[0].total,
      reportesConEvidencia: conEvidenciaRes.rows[0].total,
      porCategoria: porCategoriaRes.rows,
      porEstado: porEstadoRes.rows
    });
  } catch (err) {
    console.error('[GET /api/admin/estadisticas]', err);
    res.status(500).json({ error: 'No se pudieron obtener las estadísticas.' });
  }
});

module.exports = router;
