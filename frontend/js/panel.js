// ============================================================
// Alerta Deepfake — Panel de administración (panel.html)
// Vanilla JS. Toda la seguridad real vive en el backend (cookie
// httpOnly firmada); este script solo maneja la interfaz.
// ============================================================

const panelLogin = document.querySelector('#panel-login');
const panelDashboard = document.querySelector('#panel-dashboard');

if (panelLogin && panelDashboard) {
  const formLogin = document.querySelector('#formulario-login');
  const loginError = document.querySelector('#login-error');
  const btnLogin = document.querySelector('#btn-login');
  const btnLogout = document.querySelector('#btn-logout');
  const btnRecargar = document.querySelector('#btn-recargar');
  const inputBuscar = document.querySelector('#buscar');
  const chips = document.querySelectorAll('[data-filtro-estado]');
  const conteoVisible = document.querySelector('#conteo-visible');

  const ESTADOS = ['Recibido', 'En revisión', 'Cerrado'];

  let reportes = [];
  let filtroEstado = 'todos';
  let textoBusqueda = '';

  function mostrarVista(autenticado) {
    panelLogin.hidden = autenticado;
    panelDashboard.hidden = !autenticado;
  }

  // ---------- Utilidades ----------
  function celda(texto, etiqueta) {
    const td = document.createElement('td');
    td.textContent = texto;
    if (etiqueta) td.dataset.etiqueta = etiqueta;
    return td;
  }

  // Solo http/https: bloquea javascript:, data: y demás esquemas peligrosos
  function esUrlSegura(url) {
    try {
      const u = new URL(url, window.location.origin);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function claseEstado(estado) {
    if (estado === 'Cerrado') return 'estado-cerrado';
    if (estado === 'En revisión') return 'estado-revision';
    return 'estado-recibido';
  }

  function formatearFecha(valor) {
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  // ---------- Indicadores ----------
  function renderStats(stats) {
    const cont = document.querySelector('#panel-stats');
    cont.innerHTML = '';

    const sinRevisar = (stats.porEstado || [])
      .filter((e) => e.estado_revision === 'Recibido')
      .reduce((s, e) => s + e.total, 0);

    const tarjetas = [
      { etiqueta: 'Reportes totales', valor: stats.totalReportes, destacado: false },
      { etiqueta: 'Sin revisar', valor: sinRevisar, destacado: sinRevisar > 0 },
      { etiqueta: 'Con evidencia', valor: stats.reportesConEvidencia, destacado: false }
    ];

    tarjetas.forEach((t) => {
      const art = document.createElement('article');
      art.className = `kpi${t.destacado ? ' kpi-alerta' : ''}`;
      const valor = document.createElement('span');
      valor.className = 'kpi-valor';
      valor.textContent = t.valor;
      const etiqueta = document.createElement('span');
      etiqueta.className = 'kpi-etiqueta';
      etiqueta.textContent = t.etiqueta;
      art.append(valor, etiqueta);
      cont.appendChild(art);
    });
  }

  // Barras proporcionales: comunican la distribución de un vistazo, mucho
  // mejor que una lista de números sueltos.
  function renderBarras(contenedor, datos, obtenerNombre, obtenerTotal, obtenerClase) {
    const cont = document.querySelector(contenedor);
    cont.innerHTML = '';

    if (!datos || datos.length === 0) {
      cont.innerHTML = '<p class="celda-vacia">Sin datos todavía.</p>';
      return;
    }

    const maximo = Math.max(...datos.map(obtenerTotal), 1);

    datos.forEach((d) => {
      const fila = document.createElement('div');
      fila.className = 'barra-fila';

      const nombre = document.createElement('span');
      nombre.className = 'barra-nombre';
      nombre.textContent = obtenerNombre(d);

      const pista = document.createElement('span');
      pista.className = 'barra-pista';
      const relleno = document.createElement('span');
      relleno.className = `barra-relleno ${obtenerClase ? obtenerClase(d) : ''}`;
      relleno.style.width = `${(obtenerTotal(d) / maximo) * 100}%`;
      pista.appendChild(relleno);

      const total = document.createElement('span');
      total.className = 'barra-total';
      total.textContent = obtenerTotal(d);

      fila.append(nombre, pista, total);
      cont.appendChild(fila);
    });
  }

  // ---------- Selector de estado ----------
  function crearCeldaEstado(reporte) {
    const td = document.createElement('td');
    td.dataset.etiqueta = 'Estado';

    const envoltorio = document.createElement('div');
    envoltorio.className = 'estado-control';

    const select = document.createElement('select');
    select.className = `select-estado ${claseEstado(reporte.estado_revision)}`;
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
      const anterior = reporte.estado_revision;
      const nuevo = select.value;
      select.disabled = true;
      aviso.textContent = '…';
      aviso.className = 'aviso-estado';

      try {
        const resp = await fetch(`/api/reportes/${reporte.id_reporte}/estado`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado_revision: nuevo })
        });
        const resultado = await resp.json();
        if (!resp.ok) throw new Error(resultado.error || 'No se pudo actualizar');

        reporte.estado_revision = resultado.estado_revision;
        select.className = `select-estado ${claseEstado(reporte.estado_revision)}`;
        aviso.textContent = '✓';
        aviso.className = 'aviso-estado ok';
        setTimeout(() => { aviso.textContent = ''; }, 2000);

        cargarEstadisticas();
        // Si el filtro activo ya no incluye este reporte, se retira de la vista
        if (filtroEstado !== 'todos' && filtroEstado !== reporte.estado_revision) {
          renderTabla();
        }
      } catch (err) {
        select.value = anterior;
        aviso.textContent = err.message;
        aviso.className = 'aviso-estado error';
      } finally {
        select.disabled = false;
      }
    });

    envoltorio.append(select, aviso);
    td.appendChild(envoltorio);
    return td;
  }

  // ---------- Tabla ----------
  function reportesFiltrados() {
    const q = textoBusqueda.trim().toLowerCase();
    return reportes.filter((r) => {
      if (filtroEstado !== 'todos' && r.estado_revision !== filtroEstado) return false;
      if (!q) return true;
      return [r.nombre_afectado, r.correo_contacto, r.plataforma_origen, r.nombre_categoria, r.descripcion_hechos]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(q));
    });
  }

  function renderTabla() {
    const tbody = document.querySelector('#tabla-reportes tbody');
    tbody.innerHTML = '';
    const lista = reportesFiltrados();

    conteoVisible.textContent = lista.length === reportes.length
      ? `${reportes.length} ${reportes.length === 1 ? 'reporte' : 'reportes'}`
      : `${lista.length} de ${reportes.length} reportes`;

    if (lista.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.className = 'celda-vacia';
      td.textContent = reportes.length === 0
        ? 'Todavía no hay reportes registrados.'
        : 'Ningún reporte coincide con el filtro.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    lista.forEach((r) => {
      const tr = document.createElement('tr');

      const tdExp = document.createElement('td');
      tdExp.dataset.etiqueta = 'Expediente';
      const num = document.createElement('span');
      num.className = 'num-expediente';
      num.textContent = r.id_reporte;
      tdExp.appendChild(num);
      tr.appendChild(tdExp);

      tr.appendChild(celda(formatearFecha(r.fecha_incidente), 'Incidente'));

      const tdPersona = document.createElement('td');
      tdPersona.dataset.etiqueta = 'Persona afectada';
      const nombre = document.createElement('strong');
      nombre.textContent = r.nombre_afectado;
      const correo = document.createElement('span');
      correo.className = 'dato-secundario';
      correo.textContent = r.correo_contacto;
      tdPersona.append(nombre, correo);
      tr.appendChild(tdPersona);

      tr.appendChild(celda(r.nombre_categoria, 'Tipo de caso'));
      tr.appendChild(celda(r.plataforma_origen || '—', 'Plataforma'));

      const tdEvidencia = document.createElement('td');
      tdEvidencia.dataset.etiqueta = 'Evidencia';
      const evidencias = r.evidencias || [];
      if (evidencias.length === 0) {
        tdEvidencia.innerHTML = '<span class="dato-secundario">Sin evidencia</span>';
      } else {
        evidencias.forEach((ev) => {
          if (!esUrlSegura(ev.enlace_archivo)) {
            tdEvidencia.appendChild(document.createTextNode(`${ev.tipo_evidencia} (enlace no válido)`));
            return;
          }
          const grupo = document.createElement('span');
          grupo.className = 'grupo-evidencia';

          const a = document.createElement('a');
          a.href = ev.enlace_archivo;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = ev.tipo_evidencia;
          grupo.appendChild(a);

          // El atributo download solo funciona en archivos del propio sitio
          if (ev.enlace_archivo.startsWith('/uploads/')) {
            const descarga = document.createElement('a');
            descarga.href = ev.enlace_archivo;
            descarga.download = '';
            descarga.className = 'enlace-descarga';
            descarga.title = 'Descargar archivo';
            descarga.textContent = '⬇';
            descarga.setAttribute('aria-label', `Descargar ${ev.tipo_evidencia}`);
            grupo.appendChild(descarga);
          }
          tdEvidencia.appendChild(grupo);
        });
      }
      tr.appendChild(tdEvidencia);
      tr.appendChild(crearCeldaEstado(r));
      tbody.appendChild(tr);
    });
  }

  // ---------- Carga de datos ----------
  async function cargarEstadisticas() {
    const resp = await fetch('/api/admin/estadisticas');
    if (resp.status === 401) { mostrarVista(false); return; }
    const stats = await resp.json();

    renderStats(stats);
    renderBarras('#panel-stats-categoria', stats.porCategoria,
      (d) => d.nombre_categoria, (d) => d.total,
      (d) => (d.nivel_riesgo === 'Alto' ? 'barra-alto' : 'barra-medio'));
    renderBarras('#panel-stats-estado', stats.porEstado,
      (d) => d.estado_revision, (d) => d.total,
      (d) => `barra-${claseEstado(d.estado_revision).replace('estado-', '')}`);
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

    const stats = await statsResp.json();
    renderStats(stats);
    renderBarras('#panel-stats-categoria', stats.porCategoria,
      (d) => d.nombre_categoria, (d) => d.total,
      (d) => (d.nivel_riesgo === 'Alto' ? 'barra-alto' : 'barra-medio'));
    renderBarras('#panel-stats-estado', stats.porEstado,
      (d) => d.estado_revision, (d) => d.total,
      (d) => `barra-${claseEstado(d.estado_revision).replace('estado-', '')}`);

    reportes = await reportesResp.json();
    renderTabla();
  }

  // ---------- Filtros ----------
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('activo'));
      chip.classList.add('activo');
      filtroEstado = chip.dataset.filtroEstado;
      renderTabla();
    });
  });

  inputBuscar.addEventListener('input', () => {
    textoBusqueda = inputBuscar.value;
    renderTabla();
  });

  btnRecargar.addEventListener('click', async () => {
    btnRecargar.disabled = true;
    btnRecargar.textContent = 'Actualizando…';
    await cargarDatos();
    btnRecargar.disabled = false;
    btnRecargar.textContent = 'Actualizar';
  });

  // ---------- Sesión ----------
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.className = 'mensaje-estado';
    loginError.textContent = '';
    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando…';

    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: formLogin.querySelector('#panel-password').value })
      });
      const resultado = await resp.json();
      if (!resp.ok) throw new Error(resultado.error || 'No se pudo iniciar sesión');

      formLogin.reset();
      mostrarVista(true);
      cargarDatos();
    } catch (err) {
      loginError.className = 'mensaje-estado visible error';
      loginError.textContent = err.message;
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = 'Entrar';
    }
  });

  btnLogout.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    reportes = [];
    mostrarVista(false);
  });

  async function verificarSesion() {
    const r = await fetch('/api/admin/check');
    const { autenticado } = await r.json();
    mostrarVista(autenticado);
    if (autenticado) cargarDatos();
  }

  verificarSesion();
}
