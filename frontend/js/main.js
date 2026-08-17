// ============================================================
// Alerta Deepfake — JS compartido (sin frameworks)
// Cada bloque solo se activa si el elemento existe en la página.
// ============================================================

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

// ---------- Simulador de casos (simulador.html) ----------
const simulador = document.querySelector('#simulador');
if (simulador) {
  const casos = [
    {
      contexto: 'Recibes un audio de WhatsApp de un "familiar" pidiendo dinero urgente para una emergencia médica. La voz suena igual, pero el mensaje es apurado y evita hacer una videollamada.',
      esFalso: true,
      pista: 'La clonación de voz por IA puede imitar el timbre real, pero rara vez sostiene una conversación espontánea. Pedir dinero con urgencia y evitar la videollamada son señales de alerta.'
    },
    {
      contexto: 'Un video de un funcionario público circula anunciando una medida que nunca se mencionó en canales oficiales. El parpadeo se ve poco natural y el audio no siempre coincide con el movimiento de los labios.',
      esFalso: true,
      pista: 'Parpadeo irregular, iluminación inconsistente en el rostro y desincronización labial son indicadores típicos de video manipulado con IA generativa.'
    },
    {
      contexto: 'Tu banco te envía un correo desde el dominio oficial confirmando una transacción que tú mismo realizaste hace unos minutos, con los mismos datos que aparecen en tu app.',
      esFalso: false,
      pista: 'Coincide con una acción real que hiciste, viene del dominio oficial y no pide información adicional: no presenta señales de suplantación.'
    },
    {
      contexto: 'Un perfil nuevo en redes, creado hace dos días, con pocas fotos y muchos seguidores comprados, te escribe ofreciendo una inversión con "rentabilidad garantizada".',
      esFalso: true,
      pista: 'Perfil reciente, poca actividad orgánica y promesas de rentabilidad garantizada son un patrón clásico de perfil falso usado para estafas.'
    }
  ];

  let indice = 0;
  const elContexto = simulador.querySelector('#caso-contexto');
  const elRetro = simulador.querySelector('#caso-retro');
  const elProgreso = simulador.querySelector('#progreso-simulador');
  const botones = simulador.querySelectorAll('[data-respuesta]');

  function mostrarCaso() {
    const caso = casos[indice];
    elContexto.textContent = caso.contexto;
    elRetro.className = 'caso-retro';
    elRetro.textContent = '';
    elProgreso.textContent = `Caso ${indice + 1} de ${casos.length}`;
    botones.forEach(b => (b.disabled = false));
    simulador.querySelector('#siguiente-caso').hidden = true;
  }

  botones.forEach(boton => {
    boton.addEventListener('click', () => {
      const caso = casos[indice];
      const respuestaFalso = boton.dataset.respuesta === 'falso';
      const acierto = respuestaFalso === caso.esFalso;

      elRetro.className = `caso-retro visible ${acierto ? 'correcto' : 'incorrecto'}`;
      elRetro.textContent = `${acierto ? 'Correcto. ' : 'No exactamente. '}${caso.pista}`;
      botones.forEach(b => (b.disabled = true));

      const siguiente = simulador.querySelector('#siguiente-caso');
      siguiente.hidden = indice >= casos.length - 1;
    });
  });

  const siguienteBtn = simulador.querySelector('#siguiente-caso');
  if (siguienteBtn) {
    siguienteBtn.addEventListener('click', () => {
      indice = Math.min(indice + 1, casos.length - 1);
      mostrarCaso();
    });
  }

  mostrarCaso();
}
