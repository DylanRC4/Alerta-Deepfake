// ============================================================
// Alerta Deepfake — Panel de administración (panel.html)
// Vanilla JS, sin frameworks. Toda la seguridad real vive en el
// backend (cookie httpOnly firmada); este script solo maneja la UI.
// ============================================================

const panelLogin = document.querySelector('#panel-login');
const panelDashboard = document.querySelector('#panel-dashboard');

if (panelLogin && panelDashboard) {
  const formLogin = document.querySelector('#formulario-login');
  const loginError = document.querySelector('#login-error');
  const btnLogout = document.querySelector('#btn-logout');

  function mostrarVista(autenticado) {
    panelLogin.hidden = autenticado;
    panelDashboard.hidden = !autenticado;
  }

  function crearCeldaTexto(texto) {
    const td = document.createElement('td');
    td.textContent = texto;
    return td;
  }

  // Solo se acepta http/https para los enlaces de evidencia (bloquea javascript:, data:, etc.)
  function esUrlSegura(url) {
    try {
      const u = new URL(url, window.location.origin);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function renderStats(stats) {
    const cont = document.querySelector('#panel-stats');
    cont.innerHTML = '';
    const resumen = [
      { titulo: 'Total de reportes', valor: stats.totalReportes },
      { titulo: 'Con evidencia adjunta', valor: stats.reportesConEvidencia }
    ];
    resumen.forEach((item) => {
      const art = document.createElement('article');
      art.className = 'tarjeta';
      const eyebrow = document.createElement('span');
      eyebrow.className = 'expediente-numero';
      eyebrow.textContent = item.titulo;
      const valor = document.createElement('p');
      valor.style.fontFamily = 'var(--font-display)';
      valor.style.fontSize = '2rem';
      valor.style.fontWeight = '700';
      valor.style.margin = '0';
      valor.textContent = item.valor;
      art.appendChild(eyebrow);
      art.appendChild(valor);
      cont.appendChild(art);
    });

    const contEstado = document.querySelector('#panel-stats-estado');
    contEstado.innerHTML = '';
    (stats.porEstado || []).forEach((e) => {
      const art = document.createElement('article');
      art.className = 'tarjeta';
      const eyebrow = document.createElement('span');
      eyebrow.className = 'expediente-numero';
      eyebrow.textContent = e.estado_revision;
      const valor = document.createElement('p');
      valor.style.fontFamily = 'var(--font-display)';
      valor.style.fontSize = '1.6rem';
      valor.style.fontWeight = '700';
      valor.style.margin = '0';
      valor.textContent = e.total;
      art.appendChild(eyebrow);
      art.appendChild(valor);
      contEstado.appendChild(art);
    });

    const contCat = document.querySelector('#panel-stats-categoria');
    contCat.innerHTML = '';
    stats.porCategoria.forEach((cat) => {
      const art = document.createElement('article');
      art.className = 'tarjeta';
      const riesgo = document.createElement('span');
      riesgo.className = `riesgo riesgo-${(cat.nivel_riesgo || '').toLowerCase()}`;
      riesgo.textContent = cat.nivel_riesgo;
      const h4 = document.createElement('h3');
      h4.textContent = cat.nombre_categoria;
      const valor = document.createElement('p');
      valor.style.fontFamily = 'var(--font-display)';
      valor.style.fontSize = '1.6rem';
      valor.style.fontWeight = '700';
      valor.style.margin = '0';
      valor.textContent = cat.total;
      art.appendChild(riesgo);
      art.appendChild(h4);
      art.appendChild(valor);
      contCat.appendChild(art);
    });
  }

  const ESTADOS = ['Recibido', 'En revisión', 'Cerrado'];

  // Celda con selector para cambiar el estado de revisión del reporte.
  // Guarda al instante contra la API y da feedback visual del resultado.
  function crearCeldaEstado(reporte) {
    const td = document.createElement('td');
    const select = document.createElement('select');
    select.className = 'select-estado';
    select.setAttribute('aria-label', `Estado del reporte ${reporte.id_reporte}`);

    ESTADOS.forEach((estado) => {
      const opt = document.createElement('option');
      opt.value = estado;
      opt.textContent = estado;
      if (estado === reporte.estado_revision) opt.selected = true;
      select.appendChild(opt);
    });

    const aviso = document.createElement('span');
    aviso.className = 'aviso-estado';
    aviso.setAttribute('role', 'status');

    select.addEventListener('change', async () => {
      const valorAnterior = reporte.estado_revision;
      const nuevoEstado = select.value;
      select.disabled = true;
      aviso.textContent = 'Guardando…';
      aviso.className = 'aviso-estado';

      try {
        const resp = await fetch(`/api/reportes/${reporte.id_reporte}/estado`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado_revision: nuevoEstado })
        });
        const resultado = await resp.json();
        if (!resp.ok) throw new Error(resultado.error || 'No se pudo actualizar');

        reporte.estado_revision = resultado.estado_revision;
        aviso.textContent = '✓';
        aviso.className = 'aviso-estado ok';
        cargarEstadisticas(); // los contadores por estado cambian
      } catch (err) {
        select.value = valorAnterior; // revierte visualmente si falló
        aviso.textContent = err.message;
        aviso.className = 'aviso-estado error';
      } finally {
        select.disabled = false;
      }
    });

    td.appendChild(select);
    td.appendChild(aviso);
    return td;
  }

  function renderTabla(reportes) {
    const tbody = document.querySelector('#tabla-reportes tbody');
    tbody.innerHTML = '';

    if (reportes.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 8;
      td.textContent = 'Todavía no hay reportes registrados.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    reportes.forEach((r) => {
      const tr = document.createElement('tr');
      tr.appendChild(crearCeldaTexto(r.id_reporte));
      tr.appendChild(crearCeldaTexto(new Date(r.fecha_incidente).toLocaleDateString('es-CO')));
      tr.appendChild(crearCeldaTexto(r.nombre_afectado));
      tr.appendChild(crearCeldaTexto(r.correo_contacto));
      tr.appendChild(crearCeldaTexto(r.nombre_categoria));
      tr.appendChild(crearCeldaTexto(r.plataforma_origen || '—'));

      const tdEvidencia = document.createElement('td');
      const evidencias = r.evidencias || [];
      if (evidencias.length === 0) {
        tdEvidencia.textContent = '—';
      } else {
        evidencias.forEach((ev, i) => {
          if (esUrlSegura(ev.enlace_archivo)) {
            const esArchivoPropio = ev.enlace_archivo.startsWith('/uploads/');

            const a = document.createElement('a');
            a.href = ev.enlace_archivo;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = ev.tipo_evidencia;
            tdEvidencia.appendChild(a);

            // Solo para archivos subidos a este sitio: un enlace externo (Drive, Imgur...)
            // lo controla el otro servicio, no podemos forzar su descarga desde aquí.
            if (esArchivoPropio) {
              const descarga = document.createElement('a');
              descarga.href = ev.enlace_archivo;
              descarga.download = '';
              descarga.className = 'enlace-descarga';
              descarga.title = 'Descargar archivo';
              descarga.textContent = '⬇';
              descarga.setAttribute('aria-label', `Descargar ${ev.tipo_evidencia}`);
              tdEvidencia.appendChild(descarga);
            }
          } else {
            tdEvidencia.appendChild(document.createTextNode(`${ev.tipo_evidencia} (enlace no válido)`));
          }
          if (i < evidencias.length - 1) tdEvidencia.appendChild(document.createTextNode(', '));
        });
      }
      tr.appendChild(tdEvidencia);
      tr.appendChild(crearCeldaEstado(r));
      tbody.appendChild(tr);
    });
  }

  async function cargarEstadisticas() {
    const statsResp = await fetch('/api/admin/estadisticas');
    if (statsResp.status === 401) {
      mostrarVista(false);
      return;
    }
    renderStats(await statsResp.json());
  }

  async function cargarDatos() {
    const [reportesResp, statsResp] = await Promise.all([
      fetch('/api/reportes'),
      fetch('/api/admin/estadisticas')
    ]);

    if (reportesResp.status === 401 || statsResp.status === 401) {
      mostrarVista(false);
      return;
    }

    renderStats(await statsResp.json());
    renderTabla(await reportesResp.json());
  }

  async function verificarSesion() {
    const r = await fetch('/api/admin/check');
    const { autenticado } = await r.json();
    mostrarVista(autenticado);
    if (autenticado) cargarDatos();
  }

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.className = 'mensaje-estado';
    loginError.textContent = '';

    const password = formLogin.querySelector('#panel-password').value;

    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const resultado = await resp.json();
      if (!resp.ok) throw new Error(resultado.error || 'No se pudo iniciar sesión');

      formLogin.reset();
      mostrarVista(true);
      cargarDatos();
    } catch (err) {
      loginError.className = 'mensaje-estado visible error';
      loginError.textContent = err.message;
    }
  });

  btnLogout.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    mostrarVista(false);
  });

  verificarSesion();
}
