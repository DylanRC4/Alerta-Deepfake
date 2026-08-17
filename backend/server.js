require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/reportes', require('./routes/reportes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend escuchando en el puerto ${PORT}`));
