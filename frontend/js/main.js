// ============================================================
// Alerta Deepfake — JS compartido (sin frameworks)
// Cada bloque solo se activa si el elemento existe en la página.
// ============================================================

// ---------- Aparición progresiva de secciones ----------
// Se marca <html> como "js" para que el CSS active la animación solo cuando
// este script realmente corre: si falla, el contenido queda visible igual.
(function revelarAlDesplazar() {
  const elementos = document.querySelectorAll('[data-revelar]');
  if (elementos.length === 0) return;

  const prefiereMenosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefiereMenosMovimiento || !('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('js');

  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('visible');
        observador.unobserve(entrada.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

  elementos.forEach((el) => observador.observe(el));
})();

// ---------- Menú móvil accesible ----------
const navToggle = document.querySelector('.nav-toggle');
const navLista = document.querySelector('.nav-lista');
if (navToggle && navLista) {
  navToggle.addEventListener('click', () => {
    const abierto = navLista.classList.toggle('abierto');
    navToggle.setAttribute('aria-expanded', String(abierto));
  });
}

// ---------- Formulario de reporte (reporte.html) ----------
const formReporte = document.querySelector('#formulario-reporte');
if (formReporte) {
  const selectCategoria = formReporte.querySelector('#id_categoria');
  const mensajeEstado = document.querySelector('#mensaje-estado');
  const inputArchivo = formReporte.querySelector('#archivo_evidencia');
  const inputEnlace = formReporte.querySelector('#enlace_archivo');

  // Cargar categorías desde la API para el <select>
  fetch('/api/categorias')
    .then(r => r.json())
    .then(categorias => {
      categorias.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id_categoria;
        opt.textContent = `${cat.nombre_categoria} (riesgo ${cat.nivel_riesgo})`;
        selectCategoria.appendChild(opt);
      });
    })
    .catch(() => {
      selectCategoria.innerHTML = '<option value="">No se pudieron cargar las categorías</option>';
    });

  // Evidencia: archivo O enlace, no ambos a la vez
  if (inputArchivo && inputEnlace) {
    inputArchivo.addEventListener('change', () => {
      const hayArchivo = inputArchivo.files.length > 0;
      inputEnlace.disabled = hayArchivo;
      if (hayArchivo) inputEnlace.value = '';
    });
    inputEnlace.addEventListener('input', () => {
      const hayEnlace = inputEnlace.value.trim() !== '';
      inputArchivo.disabled = hayEnlace;
      if (hayEnlace) inputArchivo.value = '';
    });
  }

  formReporte.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!formReporte.checkValidity()) {
      formReporte.reportValidity();
      return;
    }

    const formData = new FormData(formReporte);

    mensajeEstado.className = 'mensaje-estado visible';
    mensajeEstado.textContent = 'Enviando reporte...';

    try {
      const resp = await fetch('/api/reportes', {
        method: 'POST',
        body: formData
      });
      const resultado = await resp.json();

      if (!resp.ok) {
        const detalle = Array.isArray(resultado.detalles) ? ` (${resultado.detalles.join('; ')})` : '';
        throw new Error((resultado.error || 'No se pudo registrar el reporte') + detalle);
      }

      mensajeEstado.className = 'mensaje-estado visible exito';
      mensajeEstado.innerHTML = `<span class="expediente-numero">Expediente N.° ${Number(resultado.id_reporte)}</span>Reporte registrado correctamente. Guarda este número como referencia.`;
      formReporte.reset();
      inputArchivo.disabled = false;
      inputEnlace.disabled = false;
    } catch (err) {
      mensajeEstado.className = 'mensaje-estado visible error';
      mensajeEstado.textContent = `Error: ${err.message}`;
    }
  });
}

// El simulador vive en su propio archivo (js/simulador.js), que solo se
// carga en simulador.html.
