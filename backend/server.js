require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const UPLOAD_DIR = path.join(__dirname, 'uploads');

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/reportes', require('./routes/reportes'));

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
