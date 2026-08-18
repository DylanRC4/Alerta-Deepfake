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
  const btnEnviar = formReporte.querySelector('#btn-enviar');
  const envoltorio = document.querySelector('.reporte-envoltorio');
  const confirmacion = document.querySelector('#confirmacion');

  const selectTipoEvidencia = formReporte.querySelector('#tipo_evidencia');
  const inputArchivo = formReporte.querySelector('#archivo_evidencia');
  const inputEnlace = formReporte.querySelector('#enlace_archivo');
  const detalleEvidencia = formReporte.querySelector('#evidencia-detalle');
  const campoArchivo = formReporte.querySelector('#campo-archivo');
  const campoEnlace = formReporte.querySelector('#campo-enlace');
  const radiosEvidencia = formReporte.querySelectorAll('input[name="modo_evidencia"]');

  const textarea = formReporte.querySelector('#descripcion_hechos');
  const contador = formReporte.querySelector('#contador-descripcion');

  // ----- Categorías desde la API -----
  fetch('/api/categorias')
    .then((r) => r.json())
    .then((categorias) => {
      categorias.forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat.id_categoria;
        opt.textContent = `${cat.nombre_categoria} — riesgo ${cat.nivel_riesgo.toLowerCase()}`;
        selectCategoria.appendChild(opt);
      });
    })
    .catch(() => {
      selectCategoria.innerHTML = '<option value="">No se pudieron cargar las categorías</option>';
    });

  // ----- Contador de caracteres -----
  if (textarea && contador) {
    const actualizarContador = () => {
      const n = textarea.value.length;
      contador.textContent = `${n} / ${textarea.maxLength}`;
      contador.classList.toggle('contador-corto', n > 0 && n < textarea.minLength);
    };
    textarea.addEventListener('input', actualizarContador);
    actualizarContador();
  }

  // ----- Elección del modo de evidencia -----
  // Un solo camino visible a la vez: evita el estado confuso de tener
  // archivo y enlace disponibles simultáneamente cuando solo se admite uno.
  function aplicarModoEvidencia(modo) {
    const hayEvidencia = modo !== 'ninguna';
    detalleEvidencia.hidden = !hayEvidencia;
    campoArchivo.hidden = modo !== 'archivo';
    campoEnlace.hidden = modo !== 'enlace';

    selectTipoEvidencia.required = hayEvidencia;
    selectTipoEvidencia.disabled = !hayEvidencia;
    inputArchivo.disabled = modo !== 'archivo';
    inputEnlace.disabled = modo !== 'enlace';

    // Limpia lo que deja de aplicar para no enviar datos de un modo descartado
    if (modo !== 'archivo') inputArchivo.value = '';
    if (modo !== 'enlace') inputEnlace.value = '';
    if (!hayEvidencia) selectTipoEvidencia.value = '';

    // Sugiere el tipo cuando el modo lo hace evidente
    if (modo === 'enlace' && !selectTipoEvidencia.value) {
      selectTipoEvidencia.value = 'Enlace';
    }
  }

  radiosEvidencia.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked) aplicarModoEvidencia(radio.value);
    });
  });
  aplicarModoEvidencia('ninguna');

  // Si eligen un archivo, ajusta el tipo según lo que realmente subieron
  inputArchivo.addEventListener('change', () => {
    const archivo = inputArchivo.files[0];
    if (!archivo || selectTipoEvidencia.value) return;
    const t = archivo.type;
    if (t.startsWith('image/')) selectTipoEvidencia.value = 'Captura de pantalla';
    else if (t === 'application/pdf') selectTipoEvidencia.value = 'Documento';
    else if (t.startsWith('audio/')) selectTipoEvidencia.value = 'Audio';
    else if (t.startsWith('video/')) selectTipoEvidencia.value = 'Video';
  });

  // ----- Envío -----
  function mostrarError(texto) {
    mensajeEstado.className = 'mensaje-estado visible error';
    mensajeEstado.textContent = texto;
    mensajeEstado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  formReporte.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!formReporte.checkValidity()) {
      formReporte.reportValidity();
      return;
    }

    const modo = formReporte.querySelector('input[name="modo_evidencia"]:checked').value;
    if (modo === 'archivo' && inputArchivo.files.length === 0) {
      mostrarError('Elegiste subir un archivo pero no seleccionaste ninguno.');
      inputArchivo.focus();
      return;
    }
    if (modo === 'enlace' && inputEnlace.value.trim() === '') {
      mostrarError('Elegiste pegar un enlace pero el campo está vacío.');
      inputEnlace.focus();
      return;
    }

    const formData = new FormData(formReporte);
    formData.delete('modo_evidencia'); // campo solo de interfaz, el backend no lo usa

    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando…';
    mensajeEstado.className = 'mensaje-estado visible';
    mensajeEstado.textContent = 'Enviando reporte…';

    try {
      const resp = await fetch('/api/reportes', { method: 'POST', body: formData });
      const resultado = await resp.json();

      if (!resp.ok) {
        const detalle = Array.isArray(resultado.detalles) ? ` ${resultado.detalles.join('. ')}.` : '';
        throw new Error((resultado.error || 'No se pudo registrar el reporte') + detalle);
      }

      document.querySelector('#numero-expediente').textContent = `N.° ${Number(resultado.id_reporte)}`;
      envoltorio.hidden = true;
      confirmacion.hidden = false;
      confirmacion.focus();
      confirmacion.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      mostrarError(err.message);
    } finally {
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar reporte';
    }
  });

  // ----- Reportar otro caso -----
  const btnOtro = document.querySelector('#btn-otro-reporte');
  if (btnOtro) {
    btnOtro.addEventListener('click', () => {
      formReporte.reset();
      aplicarModoEvidencia('ninguna');
      if (textarea && contador) contador.textContent = `0 / ${textarea.maxLength}`;
      mensajeEstado.className = 'mensaje-estado';
      mensajeEstado.textContent = '';
      confirmacion.hidden = true;
      envoltorio.hidden = false;
      formReporte.scrollIntoView({ behavior: 'smooth', block: 'start' });
      selectCategoria.focus();
    });
  }
}

// El simulador vive en su propio archivo (js/simulador.js), que solo se
// carga en simulador.html.
