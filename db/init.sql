-- Se ejecuta automáticamente la primera vez que se levanta el contenedor db.
-- Modelo entidad-relación del documento de arquitectura (Fase 3), en sintaxis
-- nativa de PostgreSQL (SERIAL), tal como estaba en el documento original.

CREATE TABLE IF NOT EXISTS categorias_deepfake (
    id_categoria SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(100) NOT NULL,
    nivel_riesgo VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS reportes (
    id_reporte SERIAL PRIMARY KEY,
    fecha_incidente DATE NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nombre_afectado VARCHAR(150) NOT NULL,
    correo_contacto VARCHAR(150) NOT NULL,
    id_categoria INT NOT NULL,
    descripcion_hechos TEXT NOT NULL,
    plataforma_origen VARCHAR(100),
    estado_revision VARCHAR(50) DEFAULT 'Recibido',
    CONSTRAINT fk_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES categorias_deepfake(id_categoria)
);

CREATE TABLE IF NOT EXISTS evidencias (
    id_evidencia SERIAL PRIMARY KEY,
    id_reporte INT NOT NULL,
    tipo_evidencia VARCHAR(50) NOT NULL,
    enlace_archivo TEXT NOT NULL,
    CONSTRAINT fk_reporte
        FOREIGN KEY (id_reporte)
        REFERENCES reportes(id_reporte)
        ON DELETE CASCADE
);

INSERT INTO categorias_deepfake (nombre_categoria, nivel_riesgo) VALUES
    ('Clonación de voz', 'Alto'),
    ('Generación de rostro (Imágenes)', 'Medio'),
    ('Video falso (Deepfake)', 'Alto'),
    ('Creación de perfil falso', 'Medio');
