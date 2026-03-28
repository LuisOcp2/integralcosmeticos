import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ICategoria,
  IMarca,
  IParametroConfiguracion,
  ITipoDocumentoConfiguracion,
  Rol,
} from '@cosmeticos/shared-types';
import api from '../lib/api';
import AppLayout from './components/AppLayout';
import { tokens } from '../styles/tokens';
import { useAuthStore } from '../store/auth.store';

type MaestroResponse = {
  categorias: ICategoria[];
  marcas: IMarca[];
  tiposDocumento: ITipoDocumentoConfiguracion[];
  parametros: IParametroConfiguracion[];
};

type ParametroForm = {
  clave: string;
  valor: string;
  descripcion: string;
  tipoDato: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  modulo: string;
};

const emptyParametroForm: ParametroForm = {
  clave: '',
  valor: '',
  descripcion: '',
  tipoDato: 'STRING',
  modulo: '',
};

function extractError(error: any, fallback = 'No se pudo completar la operacion'): string {
  const backendMessage =
    error?.response?.data?.message && Array.isArray(error.response.data.message)
      ? error.response.data.message.join('. ')
      : error?.response?.data?.message;
  return backendMessage || error?.message || fallback;
}

async function getConfiguracionesMaestro(): Promise<MaestroResponse> {
  const { data } = await api.get('/configuraciones/maestro');
  return data;
}

function ToolbarInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border-2 px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
      style={{ backgroundColor: '#fff', borderColor: 'rgba(135,113,118,0.24)' }}
    />
  );
}

function MiniCrudCard({
  title,
  subtitle,
  addLabel,
  nameLabel,
  items,
  canManage,
  onCreate,
  onUpdate,
  onToggleActive,
}: {
  title: string;
  subtitle: string;
  addLabel: string;
  nameLabel: string;
  items: { id: string; nombre: string; activo: boolean }[];
  canManage: boolean;
  onCreate: (nombre: string) => Promise<void>;
  onUpdate: (id: string, nombre: string) => Promise<void>;
  onToggleActive: (id: string, activo: boolean) => Promise<void>;
}) {
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <article
      className="rounded-2xl p-4 sm:p-5"
      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(218,192,197,0.45)' }}
    >
      <div className="mb-4">
        <h3 className="text-lg font-black" style={{ color: tokens.color.textStrong }}>
          {title}
        </h3>
        <p className="text-sm" style={{ color: tokens.color.textSoft }}>
          {subtitle}
        </p>
      </div>

      {error && (
        <div
          className="mb-3 rounded-xl px-3 py-2 text-sm font-semibold"
          style={{ backgroundColor: 'rgba(186,26,26,0.12)', color: tokens.color.danger }}
        >
          {error}
        </div>
      )}

      {canManage && (
        <div className="flex gap-2 mb-4">
          <ToolbarInput value={nuevoNombre} onChange={setNuevoNombre} placeholder={nameLabel} />
          <button
            type="button"
            onClick={() => {
              setError(null);
              void onCreate(nuevoNombre.trim())
                .then(() => setNuevoNombre(''))
                .catch((e) => setError(extractError(e)));
            }}
            className="px-3 py-2.5 rounded-xl text-sm font-black text-white"
            style={{ backgroundColor: tokens.color.bgDark }}
          >
            {addLabel}
          </button>
        </div>
      )}

      <div className="space-y-2 max-h-72 overflow-auto pr-1">
        {items.length === 0 ? (
          <p className="text-sm font-semibold" style={{ color: tokens.color.textMuted }}>
            No hay registros activos.
          </p>
        ) : (
          items.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-xl border px-3 py-2.5 flex items-center gap-2"
                style={{ borderColor: 'rgba(218,192,197,0.45)', backgroundColor: '#fcf8fa' }}
              >
                {isEditing ? (
                  <input
                    value={editingNombre}
                    onChange={(e) => setEditingNombre(e.target.value)}
                    className="flex-1 rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary"
                    style={{ borderColor: 'rgba(135,113,118,0.28)' }}
                  />
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: tokens.color.textStrong }}>
                      {item.nombre}
                    </p>
                    <p
                      className="text-[11px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: item.activo ? '#2e7d32' : tokens.color.textMuted }}
                    >
                      {item.activo ? 'Activo' : 'Desactivado'}
                    </p>
                  </div>
                )}

                {canManage && (
                  <>
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="text-xs font-black px-2.5 py-1.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(46,125,50,0.12)', color: '#2e7d32' }}
                          onClick={() => {
                            setError(null);
                            void onUpdate(item.id, editingNombre.trim())
                              .then(() => {
                                setEditingId(null);
                                setEditingNombre('');
                              })
                              .catch((e) => setError(extractError(e)));
                          }}
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
                          style={{
                            backgroundColor: 'rgba(115,89,70,0.12)',
                            color: tokens.color.textMuted,
                          }}
                          onClick={() => {
                            setEditingId(null);
                            setEditingNombre('');
                          }}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="text-xs font-black px-2.5 py-1.5 rounded-lg"
                          style={{
                            backgroundColor: 'rgba(133,38,75,0.14)',
                            color: tokens.color.primary,
                          }}
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingNombre(item.nombre);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-xs font-black px-2.5 py-1.5 rounded-lg"
                          style={{
                            backgroundColor: item.activo
                              ? 'rgba(186,26,26,0.12)'
                              : 'rgba(46,125,50,0.12)',
                            color: item.activo ? tokens.color.danger : '#2e7d32',
                          }}
                          onClick={() => {
                            setError(null);
                            void onToggleActive(item.id, item.activo).catch((e) =>
                              setError(extractError(e)),
                            );
                          }}
                        >
                          {item.activo ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}

function TiposDocumentoCard({
  tipos,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
}: {
  tipos: ITipoDocumentoConfiguracion[];
  canManage: boolean;
  onCreate: (payload: { codigo: string; nombre: string; descripcion?: string }) => Promise<void>;
  onUpdate: (
    id: string,
    payload: { codigo?: string; nombre?: string; descripcion?: string },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentEditing = tipos.find((tipo) => tipo.id === editingId) ?? null;
  const [editingForm, setEditingForm] = useState({ codigo: '', nombre: '', descripcion: '' });

  return (
    <article
      className="rounded-2xl p-4 sm:p-5"
      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(218,192,197,0.45)' }}
    >
      <div className="mb-4">
        <h3 className="text-lg font-black" style={{ color: tokens.color.textStrong }}>
          Tipos de documento
        </h3>
        <p className="text-sm" style={{ color: tokens.color.textSoft }}>
          Catalogo dinamico para registro de clientes.
        </p>
      </div>

      {error && (
        <div
          className="mb-3 rounded-xl px-3 py-2 text-sm font-semibold"
          style={{ backgroundColor: 'rgba(186,26,26,0.12)', color: tokens.color.danger }}
        >
          {error}
        </div>
      )}

      {canManage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          <ToolbarInput value={codigo} onChange={setCodigo} placeholder="Codigo (CC, NIT, CE...)" />
          <ToolbarInput value={nombre} onChange={setNombre} placeholder="Nombre visible" />
          <div className="sm:col-span-2 flex gap-2">
            <ToolbarInput
              value={descripcion}
              onChange={setDescripcion}
              placeholder="Descripcion opcional"
            />
            <button
              type="button"
              className="px-3 py-2.5 rounded-xl text-sm font-black text-white"
              style={{ backgroundColor: tokens.color.bgDark }}
              onClick={() => {
                setError(null);
                void onCreate({ codigo, nombre, descripcion })
                  .then(() => {
                    setCodigo('');
                    setNombre('');
                    setDescripcion('');
                  })
                  .catch((e) => setError(extractError(e)));
              }}
            >
              Agregar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-72 overflow-auto pr-1">
        {tipos.map((tipo) => {
          const isEditing = editingId === tipo.id;
          return (
            <div
              key={tipo.id}
              className="rounded-xl border px-3 py-2.5"
              style={{ borderColor: 'rgba(218,192,197,0.45)', backgroundColor: '#fcf8fa' }}
            >
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <ToolbarInput
                    value={editingForm.codigo}
                    onChange={(value) => setEditingForm((prev) => ({ ...prev, codigo: value }))}
                    placeholder="Codigo"
                  />
                  <ToolbarInput
                    value={editingForm.nombre}
                    onChange={(value) => setEditingForm((prev) => ({ ...prev, nombre: value }))}
                    placeholder="Nombre"
                  />
                  <div className="sm:col-span-2 flex gap-2">
                    <ToolbarInput
                      value={editingForm.descripcion}
                      onChange={(value) =>
                        setEditingForm((prev) => ({ ...prev, descripcion: value }))
                      }
                      placeholder="Descripcion"
                    />
                    <button
                      type="button"
                      className="text-xs font-black px-2.5 py-1.5 rounded-lg"
                      style={{ backgroundColor: 'rgba(46,125,50,0.12)', color: '#2e7d32' }}
                      onClick={() => {
                        setError(null);
                        void onUpdate(tipo.id, editingForm)
                          .then(() => {
                            setEditingId(null);
                            setEditingForm({ codigo: '', nombre: '', descripcion: '' });
                          })
                          .catch((e) => setError(extractError(e)));
                      }}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
                      style={{
                        backgroundColor: 'rgba(115,89,70,0.12)',
                        color: tokens.color.textMuted,
                      }}
                      onClick={() => {
                        setEditingId(null);
                        setEditingForm({ codigo: '', nombre: '', descripcion: '' });
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black" style={{ color: tokens.color.textStrong }}>
                      {tipo.codigo}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: tokens.color.textMuted }}>
                      {tipo.nombre}
                    </p>
                  </div>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        className="text-xs font-black px-2.5 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: 'rgba(133,38,75,0.14)',
                          color: tokens.color.primary,
                        }}
                        onClick={() => {
                          setEditingId(tipo.id);
                          setEditingForm({
                            codigo: tipo.codigo,
                            nombre: tipo.nombre,
                            descripcion: tipo.descripcion || '',
                          });
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="text-xs font-black px-2.5 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: 'rgba(186,26,26,0.12)',
                          color: tokens.color.danger,
                        }}
                        onClick={() => {
                          setError(null);
                          void onDelete(tipo.id).catch((e) => setError(extractError(e)));
                        }}
                      >
                        Desactivar
                      </button>
                    </>
                  )}
                </div>
              )}
              {!isEditing && tipo.descripcion && (
                <p className="text-xs mt-1" style={{ color: tokens.color.textSoft }}>
                  {tipo.descripcion}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {tipos.length === 0 && (
        <p className="text-sm font-semibold" style={{ color: tokens.color.textMuted }}>
          No hay tipos activos.
        </p>
      )}
      {currentEditing && !canManage && (
        <p className="text-xs" style={{ color: tokens.color.textMuted }}>
          {currentEditing.nombre}
        </p>
      )}
    </article>
  );
}

function ParametrosCard({
  parametros,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
}: {
  parametros: IParametroConfiguracion[];
  canManage: boolean;
  onCreate: (payload: ParametroForm) => Promise<void>;
  onUpdate: (id: string, payload: Partial<ParametroForm>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState<ParametroForm>(emptyParametroForm);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  return (
    <article
      className="rounded-2xl p-4 sm:p-5"
      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(218,192,197,0.45)' }}
    >
      <div className="mb-4">
        <h3 className="text-lg font-black" style={{ color: tokens.color.textStrong }}>
          Parametros del sistema
        </h3>
        <p className="text-sm" style={{ color: tokens.color.textSoft }}>
          Valores maestros para comportamiento global del software.
        </p>
      </div>

      {error && (
        <div
          className="mb-3 rounded-xl px-3 py-2 text-sm font-semibold"
          style={{ backgroundColor: 'rgba(186,26,26,0.12)', color: tokens.color.danger }}
        >
          {error}
        </div>
      )}

      {canManage && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto] gap-2 mb-4">
          <ToolbarInput
            value={form.clave}
            onChange={(value) => setForm((prev) => ({ ...prev, clave: value }))}
            placeholder="Clave (ej: venta.moneda)"
          />
          <ToolbarInput
            value={form.valor}
            onChange={(value) => setForm((prev) => ({ ...prev, valor: value }))}
            placeholder="Valor"
          />
          <select
            value={form.tipoDato}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                tipoDato: e.target.value as ParametroForm['tipoDato'],
              }))
            }
            className="rounded-xl border-2 px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            style={{ backgroundColor: '#fff', borderColor: 'rgba(135,113,118,0.24)' }}
          >
            <option value="STRING">STRING</option>
            <option value="NUMBER">NUMBER</option>
            <option value="BOOLEAN">BOOLEAN</option>
            <option value="JSON">JSON</option>
          </select>
          <ToolbarInput
            value={form.modulo}
            onChange={(value) => setForm((prev) => ({ ...prev, modulo: value }))}
            placeholder="Modulo (opcional)"
          />
          <button
            type="button"
            className="px-3 py-2.5 rounded-xl text-sm font-black text-white"
            style={{ backgroundColor: tokens.color.bgDark }}
            onClick={() => {
              setError(null);
              void onCreate(form)
                .then(() => setForm(emptyParametroForm))
                .catch((e) => setError(extractError(e)));
            }}
          >
            Crear
          </button>
          <div className="lg:col-span-5">
            <ToolbarInput
              value={form.descripcion}
              onChange={(value) => setForm((prev) => ({ ...prev, descripcion: value }))}
              placeholder="Descripcion de uso (opcional)"
            />
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-auto pr-1">
        {parametros.length === 0 ? (
          <p className="text-sm font-semibold" style={{ color: tokens.color.textMuted }}>
            No hay parametros activos.
          </p>
        ) : (
          parametros.map((parametro) => {
            const isEditing = editingId === parametro.id;
            return (
              <div
                key={parametro.id}
                className="rounded-xl border px-3 py-2.5"
                style={{ borderColor: 'rgba(218,192,197,0.45)', backgroundColor: '#fcf8fa' }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-black truncate"
                      style={{ color: tokens.color.textStrong }}
                    >
                      {parametro.clave}
                    </p>
                    <p className="text-xs" style={{ color: tokens.color.textSoft }}>
                      Tipo: {parametro.tipoDato}{' '}
                      {parametro.modulo ? `| Modulo: ${parametro.modulo}` : ''}
                    </p>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary"
                        style={{ borderColor: 'rgba(135,113,118,0.28)' }}
                      />
                      <button
                        type="button"
                        className="text-xs font-black px-2.5 py-1.5 rounded-lg"
                        style={{ backgroundColor: 'rgba(46,125,50,0.12)', color: '#2e7d32' }}
                        onClick={() => {
                          setError(null);
                          void onUpdate(parametro.id, { valor: editingValue })
                            .then(() => {
                              setEditingId(null);
                              setEditingValue('');
                            })
                            .catch((e) => setError(extractError(e)));
                        }}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: 'rgba(115,89,70,0.12)',
                          color: tokens.color.textMuted,
                        }}
                        onClick={() => {
                          setEditingId(null);
                          setEditingValue('');
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: tokens.color.textMuted }}
                      >
                        {parametro.valor ?? '-'}
                      </p>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            className="text-xs font-black px-2.5 py-1.5 rounded-lg"
                            style={{
                              backgroundColor: 'rgba(133,38,75,0.14)',
                              color: tokens.color.primary,
                            }}
                            onClick={() => {
                              setEditingId(parametro.id);
                              setEditingValue(parametro.valor ?? '');
                            }}
                          >
                            Editar valor
                          </button>
                          <button
                            type="button"
                            className="text-xs font-black px-2.5 py-1.5 rounded-lg"
                            style={{
                              backgroundColor: 'rgba(186,26,26,0.12)',
                              color: tokens.color.danger,
                            }}
                            onClick={() => {
                              setError(null);
                              void onDelete(parametro.id).catch((e) => setError(extractError(e)));
                            }}
                          >
                            Desactivar
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
                {parametro.descripcion && (
                  <p className="text-xs mt-1" style={{ color: tokens.color.textSoft }}>
                    {parametro.descripcion}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}

export default function ConfiguracionesPage() {
  const queryClient = useQueryClient();
  const usuario = useAuthStore((state) => state.usuario);
  const canManage = usuario?.rol === Rol.ADMIN;

  const maestroQuery = useQuery({
    queryKey: ['configuraciones', 'maestro'],
    queryFn: getConfiguracionesMaestro,
    refetchInterval: 60000,
  });

  const categorias = maestroQuery.data?.categorias ?? [];
  const marcas = maestroQuery.data?.marcas ?? [];
  const tiposDocumento = maestroQuery.data?.tiposDocumento ?? [];
  const parametros = maestroQuery.data?.parametros ?? [];

  const totals = useMemo(
    () => ({
      categorias: categorias.length,
      marcas: marcas.length,
      tiposDocumento: tiposDocumento.length,
      parametros: parametros.length,
    }),
    [categorias.length, marcas.length, tiposDocumento.length, parametros.length],
  );

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['categorias'] });
    await queryClient.invalidateQueries({ queryKey: ['marcas'] });
    await queryClient.invalidateQueries({ queryKey: ['configuraciones'] });
  };

  const createCategoria = useMutation({
    mutationFn: async (nombre: string) => api.post('/categorias', { nombre }),
    onSuccess: invalidateAll,
  });
  const updateCategoria = useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) =>
      api.patch(`/categorias/${id}`, { nombre }),
    onSuccess: invalidateAll,
  });
  const deleteCategoria = useMutation({
    mutationFn: async (id: string) => api.delete(`/categorias/${id}`),
    onSuccess: invalidateAll,
  });
  const restoreCategoria = useMutation({
    mutationFn: async (id: string) => api.patch(`/categorias/${id}/reactivar`),
    onSuccess: invalidateAll,
  });

  const createMarca = useMutation({
    mutationFn: async (nombre: string) => api.post('/marcas', { nombre }),
    onSuccess: invalidateAll,
  });
  const updateMarca = useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) =>
      api.patch(`/marcas/${id}`, { nombre }),
    onSuccess: invalidateAll,
  });
  const deleteMarca = useMutation({
    mutationFn: async (id: string) => api.delete(`/marcas/${id}`),
    onSuccess: invalidateAll,
  });
  const restoreMarca = useMutation({
    mutationFn: async (id: string) => api.patch(`/marcas/${id}/reactivar`),
    onSuccess: invalidateAll,
  });

  const createTipoDocumento = useMutation({
    mutationFn: async (payload: { codigo: string; nombre: string; descripcion?: string }) =>
      api.post('/configuraciones/tipos-documento', payload),
    onSuccess: invalidateAll,
  });
  const updateTipoDocumento = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { codigo?: string; nombre?: string; descripcion?: string };
    }) => api.patch(`/configuraciones/tipos-documento/${id}`, payload),
    onSuccess: invalidateAll,
  });
  const deleteTipoDocumento = useMutation({
    mutationFn: async (id: string) => api.delete(`/configuraciones/tipos-documento/${id}`),
    onSuccess: invalidateAll,
  });

  const createParametro = useMutation({
    mutationFn: async (payload: ParametroForm) => api.post('/configuraciones/parametros', payload),
    onSuccess: invalidateAll,
  });
  const updateParametro = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ParametroForm> }) =>
      api.patch(`/configuraciones/parametros/${id}`, payload),
    onSuccess: invalidateAll,
  });
  const deleteParametro = useMutation({
    mutationFn: async (id: string) => api.delete(`/configuraciones/parametros/${id}`),
    onSuccess: invalidateAll,
  });

  return (
    <AppLayout>
      <div className="space-y-6 sm:space-y-8" style={{ backgroundColor: tokens.color.bgPage }}>
        <header
          className="rounded-3xl p-5 sm:p-7"
          style={{
            background: 'linear-gradient(125deg, #ffffff 0%, #f3eff1 52%, #f6f2f4 100%)',
            border: '1px solid rgba(218,192,197,0.45)',
          }}
        >
          <p
            className="text-xs font-black uppercase tracking-[0.2em]"
            style={{ color: tokens.color.textMuted }}
          >
            Modulo Maestro
          </p>
          <h1
            className="mt-1 text-3xl sm:text-4xl font-black"
            style={{ color: tokens.color.textStrong }}
          >
            Configuraciones del Sistema
          </h1>
          <p
            className="mt-2 text-sm sm:text-base max-w-3xl"
            style={{ color: tokens.color.textSoft }}
          >
            Administra categorias, marcas, tipos de documento y parametros generales sin cambiar
            codigo.
          </p>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Categorias', value: totals.categorias, color: tokens.color.primary },
            { label: 'Marcas', value: totals.marcas, color: tokens.color.accent },
            { label: 'Tipos Documento', value: totals.tiposDocumento, color: '#735946' },
            { label: 'Parametros', value: totals.parametros, color: '#2e7d32' },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-2xl p-4"
              style={{ backgroundColor: '#ffffff', border: '1px solid rgba(218,192,197,0.35)' }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: tokens.color.textMuted }}
              >
                {item.label}
              </p>
              <p className="text-2xl font-black mt-1" style={{ color: item.color }}>
                {item.value}
              </p>
            </article>
          ))}
        </section>

        {maestroQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 rounded-2xl animate-pulse"
                style={{ backgroundColor: tokens.color.bgSoft }}
              />
            ))}
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <MiniCrudCard
                title="Categorias"
                subtitle="Segmenta el catalogo para reportes y busquedas"
                addLabel="Agregar"
                nameLabel="Nombre de categoria"
                items={categorias.map((c) => ({ id: c.id, nombre: c.nombre, activo: c.activo }))}
                canManage={canManage}
                onCreate={async (nombre) => {
                  if (!nombre) throw new Error('Nombre obligatorio');
                  await createCategoria.mutateAsync(nombre);
                }}
                onUpdate={async (id, nombre) => {
                  if (!nombre) throw new Error('Nombre obligatorio');
                  await updateCategoria.mutateAsync({ id, nombre });
                }}
                onToggleActive={async (id, activo) => {
                  if (activo) {
                    await deleteCategoria.mutateAsync(id);
                    return;
                  }
                  await restoreCategoria.mutateAsync(id);
                }}
              />

              <MiniCrudCard
                title="Marcas"
                subtitle="Relaciona el fabricante en productos y compras"
                addLabel="Agregar"
                nameLabel="Nombre de marca"
                items={marcas.map((m) => ({ id: m.id, nombre: m.nombre, activo: m.activo }))}
                canManage={canManage}
                onCreate={async (nombre) => {
                  if (!nombre) throw new Error('Nombre obligatorio');
                  await createMarca.mutateAsync(nombre);
                }}
                onUpdate={async (id, nombre) => {
                  if (!nombre) throw new Error('Nombre obligatorio');
                  await updateMarca.mutateAsync({ id, nombre });
                }}
                onToggleActive={async (id, activo) => {
                  if (activo) {
                    await deleteMarca.mutateAsync(id);
                    return;
                  }
                  await restoreMarca.mutateAsync(id);
                }}
              />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <TiposDocumentoCard
                tipos={tiposDocumento}
                canManage={canManage}
                onCreate={async (payload) => {
                  if (!payload.codigo.trim() || !payload.nombre.trim()) {
                    throw new Error('Codigo y nombre son obligatorios');
                  }
                  await createTipoDocumento.mutateAsync({
                    codigo: payload.codigo.trim().toUpperCase(),
                    nombre: payload.nombre.trim(),
                    descripcion: payload.descripcion?.trim() || undefined,
                  });
                }}
                onUpdate={async (id, payload) => {
                  await updateTipoDocumento.mutateAsync({
                    id,
                    payload: {
                      codigo: payload.codigo?.trim().toUpperCase(),
                      nombre: payload.nombre?.trim(),
                      descripcion: payload.descripcion?.trim() || undefined,
                    },
                  });
                }}
                onDelete={async (id) => {
                  await deleteTipoDocumento.mutateAsync(id);
                }}
              />

              <ParametrosCard
                parametros={parametros}
                canManage={canManage}
                onCreate={async (payload) => {
                  if (!payload.clave.trim()) throw new Error('La clave es obligatoria');
                  await createParametro.mutateAsync(payload);
                }}
                onUpdate={async (id, payload) => {
                  await updateParametro.mutateAsync({ id, payload });
                }}
                onDelete={async (id) => {
                  await deleteParametro.mutateAsync(id);
                }}
              />
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
