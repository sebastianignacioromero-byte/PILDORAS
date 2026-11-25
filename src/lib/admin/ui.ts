// Interfaz del panel de administración: inicio de sesión, lista de fichas y editor.
// Corre solo en el navegador. Toda escritura pasa por la función guardar_ficha de Supabase.
import type { SupabaseClient } from '@supabase/supabase-js';
import criterios from '../../datos/ejemplo/criterios.json';
import { VALORES_FORMA, VALORES_GEOMETRICA, VALORES_LIBERACION, VALORES_RANURA, VALORES_VEREDICTO, type Veredicto } from '../../tipos';
import { esCapsula, svgComprimido } from '../comprimido';
import { FORMAS_PREDEFINIDAS } from '../formas-predefinidas';
import { ETIQUETA_FORMA, ETIQUETA_GEOMETRICA, ETIQUETA_LIBERACION, ETIQUETA_RANURA, VEREDICTOS } from '../textos';
import { aPedido, aplicarFiltros, desdeFila, POR_PAGINA, type Filtros } from './fichas';
import { aplicarReglaRanura, hayCambios, validarFicha, type FichaEditable } from './reglas';
import { crearCliente, entrar, esAdmin, salir, usuarioActual } from './sesion';

const UNIDADES = ['mg', 'mcg', 'g', 'UI', '%'];
const ORIENTACIONES = [0, 45, 90, 135];
const veredictoDe = new Map(criterios.map((c) => [c.codigo, c.veredicto as Veredicto]));

const escapar = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Miniatura decorativa (el texto del botón da el significado). */
function mini(f: Pick<FichaEditable, 'formaGeometrica' | 'ranura' | 'ranuraOrientacion' | 'formaFarmaceutica'>): string {
  return svgComprimido({ forma: f.formaGeometrica, ranura: f.ranura, orientacion: f.ranuraOrientacion, formaFarmaceutica: f.formaFarmaceutica })
    .replace('role="img"', 'aria-hidden="true"')
    .replace(/ aria-label="[^"]*"/, '');
}

function etiquetaVeredicto(criterio: string | null): string {
  const v = criterio ? veredictoDe.get(criterio) : undefined;
  if (!v) return '<span class="sin-veredicto">Sin criterio</span>';
  return `<span class="etiqueta-v" style="background:${VEREDICTOS[v].color}">${VEREDICTOS[v].etiqueta}</span>`;
}

export function iniciarPanel(raiz: HTMLElement): void {
  const url = raiz.dataset.supabaseUrl;
  const clave = raiz.dataset.supabaseClave;
  if (!url || !clave) {
    raiz.innerHTML = '<p class="aviso-panel">El panel necesita la conexión con Supabase, que no está configurada en este sitio.</p>';
    return;
  }
  const cliente = crearCliente(url, clave);
  void mostrarSegunSesion(raiz, cliente);
}

async function mostrarSegunSesion(raiz: HTMLElement, cliente: SupabaseClient) {
  const usuario = await usuarioActual(cliente);
  if (!usuario) return mostrarAcceso(raiz, cliente);
  if (!(await esAdmin(cliente, usuario.id))) {
    raiz.innerHTML = `<div class="tarjeta aviso-panel"><p>Su usuario no tiene permisos de administrador.</p>
      <button type="button" class="boton-sec" data-salir>Salir</button></div>`;
    raiz.querySelector('[data-salir]')!.addEventListener('click', async () => (await salir(cliente), mostrarAcceso(raiz, cliente)));
    return;
  }
  new Panel(raiz, cliente, usuario.correo).iniciar();
}

function mostrarAcceso(raiz: HTMLElement, cliente: SupabaseClient) {
  raiz.innerHTML = `<form class="tarjeta acceso" novalidate>
    <h2>Entrar al panel</h2>
    <label for="adm-correo">Correo</label><input id="adm-correo" type="email" autocomplete="username" required />
    <label for="adm-clave">Contraseña</label><input id="adm-clave" type="password" autocomplete="current-password" required />
    <button type="submit" class="boton">Entrar</button>
    <p class="estado-acceso" role="status"></p></form>`;
  const form = raiz.querySelector('form')!;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const estado = form.querySelector<HTMLElement>('.estado-acceso')!;
    estado.textContent = 'Entrando…';
    const error = await entrar(cliente, form.querySelector<HTMLInputElement>('#adm-correo')!.value, form.querySelector<HTMLInputElement>('#adm-clave')!.value);
    if (error) return void (estado.textContent = error);
    await mostrarSegunSesion(raiz, cliente);
  });
}

class Panel {
  private filtros: Filtros = { soloSinRevisar: true, estado: '', criterio: '', laboratorio: '', busqueda: '', pagina: 0 };
  private lista: FichaEditable[] = [];
  private total = 0;
  private original: FichaEditable | null = null;
  private actual: FichaEditable | null = null;
  private temporizador: number | undefined;

  constructor(private raiz: HTMLElement, private cliente: SupabaseClient, private correo: string) {}

  iniciar() {
    this.raiz.innerHTML = `
      <div class="barra-panel"><span>Panel de fichas · ${escapar(this.correo)}</span><button type="button" class="boton-sec" data-salir>Salir</button></div>
      <div class="trabajo">
        <aside class="tarjeta columna-lista">
          <label for="adm-buscar">Buscar por nombre o principio activo</label>
          <input id="adm-buscar" type="search" autocomplete="off" />
          <label class="casilla"><input type="checkbox" data-filtro="soloSinRevisar" checked /> Solo forma sin revisar</label>
          <div class="filtros">
            <label>Filtrar por estado<select data-filtro="estado"><option value="">Todos</option><option value="publicado">Publicada</option><option value="borrador">Borrador</option></select></label>
            <label>Filtrar por criterio<select data-filtro="criterio"><option value="">Todos</option>${criterios.map((c) => `<option value="${c.codigo}">${c.codigo}</option>`).join('')}</select></label>
            <label>Filtrar por laboratorio<select data-filtro="laboratorio"><option value="">Todos</option></select></label>
          </div>
          <p class="conteo" role="status"></p>
          <ul class="lista-fichas"></ul>
          <div class="paginas"><button type="button" class="boton-sec" data-pagina="-1">Anterior</button><button type="button" class="boton-sec" data-pagina="1">Siguiente</button></div>
        </aside>
        <section class="editor"><p class="tarjeta vacio">Elija una ficha de la lista.</p></section>
      </div>
      <datalist id="adm-dcis"></datalist>`;
    this.raiz.querySelector('[data-salir]')!.addEventListener('click', async () => {
      if (!this.puedeDescartar()) return;
      await salir(this.cliente);
      mostrarAcceso(this.raiz, this.cliente);
    });
    this.raiz.querySelector<HTMLInputElement>('#adm-buscar')!.addEventListener('input', (ev) => {
      window.clearTimeout(this.temporizador);
      this.temporizador = window.setTimeout(() => {
        this.filtros = { ...this.filtros, busqueda: (ev.target as HTMLInputElement).value, pagina: 0 };
        void this.cargarLista();
      }, 300);
    });
    this.raiz.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-filtro]').forEach((el) =>
      el.addEventListener('change', () => {
        const valor = el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked : el.value;
        this.filtros = { ...this.filtros, [el.dataset.filtro!]: valor, pagina: 0 };
        void this.cargarLista();
      }),
    );
    this.raiz.querySelectorAll<HTMLButtonElement>('[data-pagina]').forEach((b) =>
      b.addEventListener('click', () => {
        const pagina = this.filtros.pagina + Number(b.dataset.pagina);
        if (pagina < 0 || pagina * POR_PAGINA >= this.total) return;
        this.filtros = { ...this.filtros, pagina };
        void this.cargarLista();
      }),
    );
    void this.cargarLista();
    void this.cargarOpciones();
  }

  private async cargarOpciones() {
    const labs = new Set<string>();
    for (let desde = 0; ; desde += 1000) {
      const { data } = await this.cliente.from('v_admin_fichas').select('laboratorio').range(desde, desde + 999);
      (data ?? []).forEach((r: { laboratorio: string | null }) => r.laboratorio && labs.add(r.laboratorio));
      if (!data || data.length < 1000) break;
    }
    const sel = this.raiz.querySelector<HTMLSelectElement>('[data-filtro="laboratorio"]')!;
    sel.insertAdjacentHTML('beforeend', [...labs].sort().map((l) => `<option>${escapar(l)}</option>`).join(''));
    const { data: dcis } = await this.cliente.from('principios_activos').select('dci').order('dci').range(0, 4999);
    this.raiz.querySelector('#adm-dcis')!.innerHTML = (dcis ?? []).map((d: { dci: string }) => `<option value="${escapar(d.dci)}"></option>`).join('');
  }

  private async cargarLista(): Promise<void> {
    const conteo = this.raiz.querySelector<HTMLElement>('.conteo')!;
    conteo.textContent = 'Cargando…';
    const { data, count, error } = await aplicarFiltros(this.cliente.from('v_admin_fichas').select('*', { count: 'exact' }), this.filtros);
    if (error) return void (conteo.textContent = `No se pudo cargar la lista: ${error.message}`);
    this.lista = (data ?? []).map(desdeFila);
    this.total = count ?? this.lista.length;
    const desde = this.filtros.pagina * POR_PAGINA;
    conteo.textContent = this.total ? `${desde + 1}–${desde + this.lista.length} de ${this.total} fichas` : 'No hay fichas con estos filtros.';
    this.pintarLista();
  }

  private pintarLista() {
    const ul = this.raiz.querySelector<HTMLUListElement>('.lista-fichas')!;
    ul.innerHTML = this.lista
      .map(
        (f) => `<li data-id="${f.id}" class="${this.actual?.id === f.id ? 'activa' : ''}" tabindex="0">
          <span class="mini">${mini(f)}</span>
          <span class="datos"><strong>${escapar(f.nombreComercial)}</strong><span class="lab">${escapar(f.laboratorio)}</span>${etiquetaVeredicto(f.criterio)}</span>
          <span class="punto ${f.formaRevisada ? 'revisada' : ''}" title="${f.formaRevisada ? 'Forma revisada' : 'Forma sin revisar'}"></span>
        </li>`,
      )
      .join('');
    ul.querySelectorAll<HTMLLIElement>('li').forEach((li) => {
      const abrir = () => this.abrir(Number(li.dataset.id));
      li.addEventListener('click', abrir);
      li.addEventListener('keydown', (ev) => ev.key === 'Enter' && abrir());
    });
  }

  private puedeDescartar(): boolean {
    if (!this.original || !this.actual || !hayCambios(this.original, this.actual)) return true;
    return window.confirm('Hay cambios sin guardar en esta ficha. ¿Descartarlos?');
  }

  private abrir(id: number) {
    if (this.actual?.id === id) return;
    if (!this.puedeDescartar()) return;
    const f = this.lista.find((x) => x.id === id);
    if (!f) return;
    this.original = structuredClone(f);
    this.actual = structuredClone(f);
    this.pintarLista();
    this.pintarEditor();
  }

  /** Aplica un cambio, la regla de ranura y criterio, y vuelve a dibujar el editor. */
  private cambiar(parcial: Partial<FichaEditable>, repintar = true) {
    if (!this.actual) return;
    const forma = 'ranura' in parcial || 'formaFarmaceutica' in parcial || 'liberacion' in parcial;
    this.actual = { ...this.actual, ...parcial };
    if (forma) this.actual = aplicarReglaRanura(this.actual);
    if (repintar) this.pintarEditor();
    else this.pintarVistaPrevia();
  }

  private pintarVistaPrevia() {
    const f = this.actual!;
    this.raiz.querySelector('.vista-previa')!.innerHTML = svgComprimido({
      forma: f.formaGeometrica, ranura: f.ranura, orientacion: f.ranuraOrientacion, formaFarmaceutica: f.formaFarmaceutica,
    });
  }

  private pintarEditor() {
    const f = this.actual!;
    const ed = this.raiz.querySelector<HTMLElement>('.editor')!;
    const capsula = esCapsula(f.formaFarmaceutica);
    const activo = (cond: boolean) => (cond ? ' class="activo" aria-pressed="true"' : ' aria-pressed="false"');
    ed.innerHTML = `
      <div class="tarjeta pila-ed">
        <h2>${escapar(f.nombreComercial)}</h2>
        <div class="vista-previa"></div>
        ${capsula ? '<p class="apagado">Las cápsulas siempre se dibujan como cápsula.</p>' : `
        <h3>Formas predefinidas</h3>
        <div class="botones-formas">${FORMAS_PREDEFINIDAS.map((p) => `<button type="button" data-predefinida="${p.numero}"${activo(f.formaGeometrica === p.forma && f.ranura === p.ranura)}>
          ${mini({ ...f, formaGeometrica: p.forma, ranura: p.ranura, ranuraOrientacion: 0 })}<span>${p.numero}. ${p.nombre}</span></button>`).join('')}</div>
        <h3>Forma</h3>
        <div class="botones-formas chicos">${VALORES_GEOMETRICA.map((g) => `<button type="button" data-forma="${g}"${activo(f.formaGeometrica === g)}>${mini({ ...f, formaGeometrica: g, ranura: 'sin_ranura' })}<span>${ETIQUETA_GEOMETRICA[g]}</span></button>`).join('')}</div>
        <h3>Ranura</h3>
        <div class="botones-formas chicos">${VALORES_RANURA.map((r) => `<button type="button" data-ranura="${r}"${activo(f.ranura === r)}>${mini({ ...f, ranura: r })}<span>${ETIQUETA_RANURA[r]}</span></button>`).join('')}</div>
        <h3>Orientación de la ranura</h3>
        <div class="botones-texto">${ORIENTACIONES.map((o) => `<button type="button" data-orientacion="${o}"${activo(f.ranuraOrientacion === o)}>${o}°</button>`).join('')}</div>`}
      </div>
      <div class="tarjeta pila-ed">
        <label for="adm-criterio">Criterio</label>
        <div class="fila-criterio"><select id="adm-criterio"><option value="">(sin criterio)</option>
          ${VALORES_VEREDICTO.map((v) => `<optgroup label="${VEREDICTOS[v].etiqueta}">${criterios.filter((c) => c.veredicto === v).map((c) => `<option value="${c.codigo}"${f.criterio === c.codigo ? ' selected' : ''}>${c.codigo} · ${escapar(c.titulo)}</option>`).join('')}</optgroup>`).join('')}
        </select>${etiquetaVeredicto(f.criterio)}</div>
        <label for="adm-estado">Estado</label>
        <select id="adm-estado"><option value="publicado"${f.estado === 'publicado' ? ' selected' : ''}>Publicada</option><option value="borrador"${f.estado === 'borrador' ? ' selected' : ''}>Borrador</option>${f.estado === 'archivado' ? '<option value="archivado" selected>Archivada</option>' : ''}</select>
        <label for="adm-nota">Nota para el paciente (se publica)</label>
        <textarea id="adm-nota" rows="2">${escapar(f.nota)}</textarea>
      </div>
      <div class="tarjeta pila-ed">
        <label for="adm-nombre">Nombre comercial</label><input id="adm-nombre" value="${escapar(f.nombreComercial)}" />
        <label for="adm-lab">Laboratorio</label><input id="adm-lab" value="${escapar(f.laboratorio)}" />
        <label for="adm-ff">Forma farmacéutica</label>
        <select id="adm-ff">${VALORES_FORMA.map((v) => `<option value="${v}"${f.formaFarmaceutica === v ? ' selected' : ''}>${ETIQUETA_FORMA[v]}</option>`).join('')}</select>
        <label for="adm-lib">Liberación</label>
        <select id="adm-lib">${VALORES_LIBERACION.map((v) => `<option value="${v}"${f.liberacion === v ? ' selected' : ''}>${ETIQUETA_LIBERACION[v]}</option>`).join('')}</select>
        <h3>Principios activos</h3>
        <div class="principios">${f.principios.map((p, i) => `<div class="fila-pa" data-i="${i}">
          <input aria-label="Principio activo ${i + 1}" list="adm-dcis" data-campo="dci" value="${escapar(p.dci)}" />
          <input aria-label="Cantidad ${i + 1}" type="number" min="0" step="any" data-campo="cantidad" value="${p.cantidad ?? ''}" />
          <select aria-label="Unidad ${i + 1}" data-campo="unidad">${UNIDADES.map((u) => `<option${p.unidad === u ? ' selected' : ''}>${u}</option>`).join('')}</select>
          <button type="button" class="boton-sec" data-quitar="${i}" aria-label="Quitar principio activo ${i + 1}">Quitar</button></div>`).join('')}</div>
        <button type="button" class="boton-sec" data-agregar>Agregar principio activo</button>
      </div>
      <div class="acciones">
        <ul class="errores" role="alert"></ul>
        <p class="estado-guardar" role="status"></p>
        <button type="button" class="boton" data-guardar>Guardar</button>
        <button type="button" class="boton" data-guardar-siguiente>Guardar y siguiente</button>
      </div>`;
    this.pintarVistaPrevia();
    this.enlazarEditor(ed);
  }

  private enlazarEditor(ed: HTMLElement) {
    const f = () => this.actual!;
    ed.querySelectorAll<HTMLButtonElement>('[data-predefinida]').forEach((b) =>
      b.addEventListener('click', () => {
        const p = FORMAS_PREDEFINIDAS.find((x) => x.numero === Number(b.dataset.predefinida))!;
        this.cambiar({ formaGeometrica: p.forma, ranura: p.ranura, ranuraOrientacion: p.orientacion });
      }),
    );
    ed.querySelectorAll<HTMLButtonElement>('[data-forma]').forEach((b) => b.addEventListener('click', () => this.cambiar({ formaGeometrica: b.dataset.forma as FichaEditable['formaGeometrica'] })));
    ed.querySelectorAll<HTMLButtonElement>('[data-ranura]').forEach((b) => b.addEventListener('click', () => this.cambiar({ ranura: b.dataset.ranura as FichaEditable['ranura'] })));
    ed.querySelectorAll<HTMLButtonElement>('[data-orientacion]').forEach((b) => b.addEventListener('click', () => this.cambiar({ ranuraOrientacion: Number(b.dataset.orientacion) })));
    const valor = (sel: string) => ed.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(sel)!;
    valor('#adm-criterio').addEventListener('change', (ev) => this.cambiar({ criterio: (ev.target as HTMLSelectElement).value || null }));
    valor('#adm-estado').addEventListener('change', (ev) => this.cambiar({ estado: (ev.target as HTMLSelectElement).value as FichaEditable['estado'] }, false));
    valor('#adm-nota').addEventListener('input', (ev) => this.cambiar({ nota: (ev.target as HTMLTextAreaElement).value }, false));
    valor('#adm-nombre').addEventListener('input', (ev) => this.cambiar({ nombreComercial: (ev.target as HTMLInputElement).value }, false));
    valor('#adm-lab').addEventListener('input', (ev) => this.cambiar({ laboratorio: (ev.target as HTMLInputElement).value }, false));
    valor('#adm-ff').addEventListener('change', (ev) => this.cambiar({ formaFarmaceutica: (ev.target as HTMLSelectElement).value as FichaEditable['formaFarmaceutica'] }));
    valor('#adm-lib').addEventListener('change', (ev) => this.cambiar({ liberacion: (ev.target as HTMLSelectElement).value as FichaEditable['liberacion'] }));
    ed.querySelectorAll<HTMLElement>('.fila-pa').forEach((fila) => {
      const i = Number(fila.dataset.i);
      fila.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-campo]').forEach((el) =>
        el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
          const principios = f().principios.map((p) => ({ ...p }));
          const campo = el.dataset.campo!;
          if (campo === 'cantidad') principios[i].cantidad = el.value === '' ? null : Number(el.value);
          else (principios[i] as Record<string, unknown>)[campo] = el.value;
          this.cambiar({ principios }, false);
        }),
      );
    });
    ed.querySelectorAll<HTMLButtonElement>('[data-quitar]').forEach((b) =>
      b.addEventListener('click', () => this.cambiar({ principios: f().principios.filter((_, i) => i !== Number(b.dataset.quitar)) })),
    );
    ed.querySelector('[data-agregar]')!.addEventListener('click', () => this.cambiar({ principios: [...f().principios, { dci: '', cantidad: null, unidad: 'mg' }] }));
    ed.querySelector('[data-guardar]')!.addEventListener('click', () => void this.guardar(false));
    ed.querySelector('[data-guardar-siguiente]')!.addEventListener('click', () => void this.guardar(true));
  }

  private async guardar(siguiente: boolean) {
    const f = this.actual!;
    const errores = this.raiz.querySelector<HTMLUListElement>('.errores')!;
    const estado = this.raiz.querySelector<HTMLElement>('.estado-guardar')!;
    const problemas = validarFicha(f);
    errores.innerHTML = problemas.map((p) => `<li>${escapar(p)}</li>`).join('');
    if (problemas.length) return;
    estado.textContent = 'Guardando…';
    const indice = this.lista.findIndex((x) => x.id === f.id);
    const siguienteId = this.lista[indice + 1]?.id;
    const { error } = await this.cliente.rpc('guardar_ficha', { p: aPedido(f) });
    if (error) return void (estado.textContent = `No se pudo guardar: ${error.message}`);
    this.original = structuredClone(f);
    await this.cargarLista();
    estado.textContent = '';
    if (siguiente) {
      const destino = this.lista.find((x) => x.id === siguienteId) ?? this.lista[Math.min(indice, this.lista.length - 1)];
      this.actual = null;
      if (destino) return this.abrir(destino.id);
      this.raiz.querySelector('.editor')!.innerHTML = '<p class="tarjeta vacio">No quedan fichas en esta lista.</p>';
      return;
    }
    const recargada = this.lista.find((x) => x.id === f.id);
    if (recargada) this.original = structuredClone(this.actual!);
    this.raiz.querySelector<HTMLElement>('.estado-guardar')!.textContent = 'Guardado. El sitio público se actualiza en menos de una hora.';
  }
}
