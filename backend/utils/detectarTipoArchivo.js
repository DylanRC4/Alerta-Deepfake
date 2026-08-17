const fsp = require('fs/promises');

/**
 * Detecta el tipo MIME real de un archivo leyendo sus primeros bytes
 * (magic bytes / firma binaria), en vez de confiar en la extensión o el
 * Content-Type declarado por el cliente.
 *
 * Implementación propia y acotada a los tipos que este proyecto acepta
 * (en vez de una librería genérica de detección de tipos) para evitar
 * depender de un paquete con vulnerabilidades conocidas de denegación de
 * servicio en parsers de formatos que ni siquiera usamos (ej. ASF/WMA).
 *
 * @param {string} rutaArchivo
 * @returns {Promise<string|null>} el MIME detectado, o null si no coincide con ninguno conocido
 */
async function detectarTipoReal(rutaArchivo) {
  const fh = await fsp.open(rutaArchivo, 'r');
  try {
    const buffer = Buffer.alloc(64);
    const { bytesRead } = await fh.read(buffer, 0, 64, 0);
    const b = buffer.subarray(0, bytesRead);

    const esRIFF = b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF';

    if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
      return 'image/jpeg';
    }
    if (b.length >= 8 && b.toString('hex', 0, 8) === '89504e470d0a1a0a') {
      return 'image/png';
    }
    if (esRIFF && b.toString('ascii', 8, 12) === 'WEBP') {
      return 'image/webp';
    }
    if (b.length >= 4 && b.toString('ascii', 0, 4) === '%PDF') {
      return 'application/pdf';
    }
    if (b.length >= 3 && b.toString('ascii', 0, 3) === 'ID3') {
      return 'audio/mpeg';
    }
    if (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0) {
      // Frame sync de MPEG audio sin cabecera ID3
      return 'audio/mpeg';
    }
    if (esRIFF && b.toString('ascii', 8, 12) === 'WAVE') {
      return 'audio/wav';
    }
    if (b.length >= 4 && b.toString('ascii', 0, 4) === 'OggS') {
      return 'audio/ogg';
    }
    if (b.length >= 8 && b.toString('ascii', 4, 8) === 'ftyp') {
      return 'video/mp4';
    }
    if (b.length >= 4 && b.toString('hex', 0, 4) === '1a45dfa3') {
      // Cabecera EBML (WebM/Matroska)
      return 'video/webm';
    }

    return null;
  } finally {
    await fh.close();
  }
}

module.exports = { detectarTipoReal };
