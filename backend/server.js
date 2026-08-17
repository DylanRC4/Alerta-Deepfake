require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// El panel de administración necesita estas dos variables sí o sí:
// ADMIN_PASSWORD para el login, SESSION_SECRET para firmar la cookie de sesión.
// Fallar rápido y claro en vez de dejar el panel silenciosamente inseguro.
if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
  console.error('Faltan variables de entorno requeridas: ADMIN_PASSWORD y/o SESSION_SECRET. Revisa tu archivo .env.');
  process.exit(1);
}

const app = express();
const UPLOAD_DIR = path.join(__dirname, 'uploads');

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/admin', require('./routes/admin'));

// Sirve los archivos de evidencia subidos (nombre aleatorio, ya validados al subirlos)
app.use('/uploads', express.static(UPLOAD_DIR, {
  dotfiles: 'deny',
  index: false,
  setHeaders: (res) => res.setHeader('Content-Disposition', 'inline')
}));

// 404 para rutas no definidas
app.use((req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' });
});

// Manejador de errores centralizado: nunca se expone el detalle interno al cliente
app.use((err, req, res, next) => {
  console.error('[Error no controlado]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend escuchando en el puerto ${PORT}`));
