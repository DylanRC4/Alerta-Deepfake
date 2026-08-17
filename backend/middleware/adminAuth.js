const SESSION_COOKIE = 'admin_session';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 horas

/**
 * Middleware que exige una sesión de administrador válida (cookie firmada
 * por cookie-parser con SESSION_SECRET). No hay usuarios ni roles: es una
 * sola contraseña compartida, suficiente para el alcance de este proyecto
 * (una persona -la profesora- revisando los reportes).
 */
function requiereAdmin(req, res, next) {
  if (req.signedCookies && req.signedCookies[SESSION_COOKIE] === 'activa') {
    return next();
  }
  res.status(401).json({ error: 'No autenticado' });
}

module.exports = { SESSION_COOKIE, SESSION_MAX_AGE_MS, requiereAdmin };
