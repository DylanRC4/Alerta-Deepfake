// ============================================================
// Alerta Deepfake — Simulador de casos (simulador.html)
// Vanilla JS. Casos ilustrativos con fines educativos: incluye
// situaciones legítimas a propósito, para no entrenar la idea de
// que todo mensaje es un fraude.
// ============================================================

const simulador = document.querySelector('#simulador');

if (simulador) {
  const casos = [
    {
      canal: 'Nota de voz · WhatsApp',
      contexto: 'Recibes un audio de un "familiar" pidiendo dinero urgente para una emergencia médica. La voz suena idéntica, pero el mensaje es apurado, insiste en que no llames a nadie más y evita hacer una videollamada.',
      esFalso: true,
      tipologia: 'Clonación de voz',
      pista: 'La IA puede imitar el timbre de una voz con pocos segundos de audio, pero rara vez sostiene una conversación espontánea. Pedir dinero con urgencia y evitar la videollamada son las dos señales más fuertes.'
    },
    {
      canal: 'Video reenviado · Cadena de mensajería',
      contexto: 'Circula un video de un funcionario público anunciando una medida que no aparece en ningún canal oficial. El parpadeo se ve poco natural y el audio no siempre coincide con el movimiento de los labios.',
      esFalso: true,
      tipologia: 'Video falso (deepfake)',
      pista: 'Parpadeo irregular, iluminación inconsistente en el rostro y desincronización labial son indicadores típicos. Si el anuncio fuera real, estaría en medios y canales verificados, no solo en cadenas.'
    },
    {
      canal: 'Correo electrónico · Dominio del banco',
      contexto: 'Tu banco te envía un correo desde su dominio oficial confirmando una transacción que tú mismo hiciste hace unos minutos, con los mismos datos que ves en tu aplicación. No te pide responder ni ingresar nada.',
      esFalso: false,
      tipologia: null,
      pista: 'Coincide con una acción real que acabas de hacer, viene del dominio oficial y no solicita información adicional ni te apura. No presenta señales de suplantación: desconfiar aquí sería un falso positivo.'
    },
    {
      canal: 'Mensaje directo · Red social',
      contexto: 'Un perfil creado hace dos semanas, con pocas fotos y miles de seguidores que casi no comentan, te escribe ofreciendo una inversión con "rentabilidad garantizada". Insiste en seguir la conversación por otra aplicación.',
      esFalso: true,
      tipologia: 'Creación de perfil falso',
      pista: 'Cuenta reciente, seguidores sin interacción real, promesa de rentabilidad garantizada y prisa por salir de la plataforma moderada. Son cuatro señales juntas del mismo patrón.'
    },
    {
      canal: 'Llamada entrante · Número desconocido',
      contexto: 'Te llaman diciendo ser de soporte técnico de tu banco. Ya saben tu nombre completo y los últimos cuatro dígitos de tu tarjeta. Te piden el código de seis dígitos que acaba de llegarte por mensaje para "verificar tu identidad".',
      esFalso: true,
      tipologia: 'Suplantación con ingeniería social',
      pista: 'Ninguna entidad legítima pide un código de verificación por teléfono: ese código existe justamente para autorizar una operación. Conocer tus datos parciales no prueba nada, pueden venir de una filtración previa.'
    },
    {
      canal: 'Videollamada · Contacto guardado',
      contexto: 'Una amiga te hace una videollamada desde su número de siempre. Responde con naturalidad cuando le preguntas por algo que solo ustedes dos saben, y no te pide nada. Solo quería contarte cómo le fue en una entrevista.',
      esFalso: false,
      tipologia: null,
      pista: 'Videollamada en vivo desde un número conocido, respuesta espontánea a una pregunta imprevista y ninguna solicitud de dinero o datos. Esta verificación —preguntar algo que no está en redes— es exactamente la recomendada.'
    }
  ];

  const elContexto = simulador.querySelector('#caso-contexto');
  const elCanal = simulador.querySelector('#caso-canal');
  const elRetro = simulador.querySelector('#caso-retro');
  const elProgreso = simulador.querySelector('#progreso-simulador');
  const elMarcador = simulador.querySelector('#marcador');
  const elBarra = simulador.querySelector('#barra-progreso');
  const elRelleno = simulador.querySelector('#progreso-relleno');
  const casoActivo = simulador.querySelector('#caso-activo');
  const botones = simulador.querySelectorAll('[data-respuesta]');
  const btnSiguiente = simulador.querySelector('#siguiente-caso');
  const btnReiniciar = simulador.querySelector('#reiniciar');
  const panelResultado = simulador.querySelector('#resultado-final');

  let indice = 0;
  let aciertos = 0;
  let respondido = false;
  // Se cuentan aparte los casos legítimos marcados como fraude: un puntaje
  // alto a base de desconfiar de todo no es criterio, y no debe premiarse.
  let falsosPositivos = 0;

  function actualizarProgreso() {
    elProgreso.textContent = `Caso ${indice + 1} de ${casos.length}`;
    elMarcador.textContent = aciertos === 1 ? '1 acierto' : `${aciertos} aciertos`;
    const porcentaje = (indice / casos.length) * 100;
    elRelleno.style.width = `${porcentaje}%`;
    elBarra.setAttribute('aria-valuenow', String(indice));
    elBarra.setAttribute('aria-valuemax', String(casos.length));
  }

  function mostrarCaso() {
    const caso = casos[indice];
    elCanal.textContent = caso.canal;
    elContexto.textContent = caso.contexto;
    elRetro.className = 'caso-retro';
    elRetro.textContent = '';
    botones.forEach((b) => { b.disabled = false; });
    btnSiguiente.hidden = true;
    respondido = false;
    actualizarProgreso();
  }

  function textoResultado(puntaje, total, erroresEnLegitimos) {
    const legitimosTotales = casos.filter((c) => !c.esFalso).length;
    const fraudesTotales = total - legitimosTotales;
    const legitimosAcertados = legitimosTotales - erroresEnLegitimos;
    const fraudesAcertados = puntaje - legitimosAcertados;

    // Patrón "todo me parece fraude": detectó los fraudes, pero marcó como
    // sospechosos todos los casos legítimos. Es desconfianza indiscriminada,
    // no criterio, y no debe premiarse aunque el puntaje sea alto.
    if (
      legitimosTotales > 0 &&
      erroresEnLegitimos === legitimosTotales &&
      fraudesAcertados >= fraudesTotales * 0.75
    ) {
      return {
        titulo: 'Cuidado con desconfiar de todo',
        mensaje: `Detectaste bien los fraudes, pero marcaste como sospechosos los ${legitimosTotales} casos que eran legítimos. Desconfiar de todo tiene un costo real: lleva a ignorar avisos verdaderos del banco o a dudar de personas cercanas. El objetivo no es sospechar siempre, sino saber verificar.`
      };
    }

    if (puntaje === total) {
      return {
        titulo: 'Criterio afinado',
        mensaje: 'Identificaste correctamente todos los casos, incluidos los legítimos. Ese equilibrio es lo importante: reconocer el fraude sin desconfiar de todo. Aun así, la tecnología mejora rápido, así que verificar por otro canal sigue siendo la mejor defensa.'
      };
    }
    if (puntaje >= Math.ceil(total * 0.66)) {
      return {
        titulo: 'Vas por buen camino',
        mensaje: 'Reconoces la mayoría de las señales. Repasa los casos que fallaste y revisa las tipologías: los detalles que se escapan suelen ser los que más se usan en los fraudes reales.'
      };
    }
    if (puntaje >= Math.ceil(total * 0.33)) {
      return {
        titulo: 'Conviene repasar',
        mensaje: 'Identificaste algunas señales, pero varias se te escaparon. Dale una vuelta a la sección de tipologías: cada tipo de suplantación deja rastros distintos y saber cuáles buscar cambia mucho el resultado.'
      };
    }
    return {
      titulo: 'Empieza por las tipologías',
      mensaje: 'Vale la pena revisar la guía antes de volver a intentarlo. No es un mal resultado: estos casos están diseñados para ser difíciles, y justamente por eso funcionan tan bien en la vida real.'
    };
  }

  function mostrarResultado() {
    casoActivo.hidden = true;
    elRelleno.style.width = '100%';
    elBarra.setAttribute('aria-valuenow', String(casos.length));
    elProgreso.textContent = `${casos.length} de ${casos.length} casos`;
    elMarcador.textContent = aciertos === 1 ? '1 acierto' : `${aciertos} aciertos`;

    const { titulo, mensaje } = textoResultado(aciertos, casos.length, falsosPositivos);
    simulador.querySelector('#resultado-aciertos').textContent = aciertos;
    simulador.querySelector('#resultado-titulo').textContent = titulo;
    simulador.querySelector('#resultado-mensaje').textContent = mensaje;

    panelResultado.hidden = false;
    panelResultado.focus();
  }

  botones.forEach((boton) => {
    boton.addEventListener('click', () => {
      if (respondido) return;
      respondido = true;

      const caso = casos[indice];
      const respondioFalso = boton.dataset.respuesta === 'falso';
      const acierto = respondioFalso === caso.esFalso;
      if (acierto) aciertos += 1;
      if (!acierto && !caso.esFalso) falsosPositivos += 1;

      elRetro.className = `caso-retro visible ${acierto ? 'correcto' : 'incorrecto'}`;
      elRetro.textContent = '';

      const encabezado = document.createElement('strong');
      encabezado.className = 'retro-titulo';
      encabezado.textContent = acierto ? '✓ Correcto' : '✗ No exactamente';
      elRetro.appendChild(encabezado);

      if (caso.tipologia) {
        const etiqueta = document.createElement('span');
        etiqueta.className = 'retro-tipologia';
        etiqueta.textContent = caso.tipologia;
        elRetro.appendChild(etiqueta);
      }

      const explicacion = document.createElement('p');
      explicacion.textContent = caso.pista;
      elRetro.appendChild(explicacion);

      botones.forEach((b) => { b.disabled = true; });
      btnSiguiente.hidden = false;
      btnSiguiente.textContent = indice >= casos.length - 1 ? 'Ver mi resultado →' : 'Siguiente caso →';
      elMarcador.textContent = aciertos === 1 ? '1 acierto' : `${aciertos} aciertos`;
    });
  });

  btnSiguiente.addEventListener('click', () => {
    if (indice >= casos.length - 1) {
      mostrarResultado();
      return;
    }
    indice += 1;
    mostrarCaso();
    casoActivo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  btnReiniciar.addEventListener('click', () => {
    indice = 0;
    aciertos = 0;
    falsosPositivos = 0;
    panelResultado.hidden = true;
    casoActivo.hidden = false;
    mostrarCaso();
    casoActivo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  mostrarCaso();
}
