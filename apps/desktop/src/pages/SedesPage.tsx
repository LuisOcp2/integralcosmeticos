import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ISede, TipoSede } from '@cosmeticos/shared-types';
import api from '../lib/api';
import AppLayout from './components/AppLayout';
import { tokens } from '../styles/tokens';

type SedeForm = {
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  responsable: string;
  tipo: TipoSede;
  moneda: string;
  impuestoPorcentaje: string;
};

const emptyForm: SedeForm = {
  nombre: '',
  direccion: '',
  ciudad: '',
  telefono: '',
  responsable: '',
  tipo: TipoSede.TIENDA,
  moneda: 'COP',
  impuestoPorcentaje: '19',
};

const tipoColor: Record<string, { bg: string; color: string }> = {
  PRINCIPAL: { bg: '#ffd9e1', color: tokens.color.primary },
  TIENDA: { bg: tokens.color.infoBg, color: tokens.color.info },
  BODEGA: { bg: tokens.color.warningBg, color: tokens.color.warning },
};

async function getSedes(): Promise<ISede[]> {
  const { data } = await api.get('/sedes');
  return data;
}

function SedeModal({
  sede,
  onClose,
  onSaved,
}: {
  sede: ISede | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SedeForm>(() =>
    sede
      ? {
          nombre: sede.nombre,
          direccion: sede.direccion,
          ciudad: sede.ciudad,
          telefono: sede.telefono ?? '',
          responsable: sede.responsable ?? '',
          tipo: sede.tipo,
          moneda: sede.moneda ?? 'COP',
          impuestoPorcentaje: String(Number(sede.impuestoPorcentaje ?? 19)),
        }
      : emptyForm,
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre.trim(),
        direccion: form.direccion.trim(),
        ciudad: form.ciudad.trim(),
        telefono: form.telefono.trim() || undefined,
        responsable: form.responsable.trim() || undefined,
        tipo: form.tipo,
        moneda: form.moneda.trim().toUpperCase() || 'COP',
        impuestoPorcentaje: Number(form.impuestoPorcentaje || 0),
      };

      if (sede) {
        await api.patch(`/sedes/${sede.id}`, payload);
      } else {
        await api.post('/sedes', payload);
      }
    },
    onSuccess: onSaved,
  });

  const onField =
    <K extends keyof SedeForm>(key: K) =>
    (value: SedeForm[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: 'rgba(46,27,12,0.5)' }}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{ backgroundColor: tokens.color.bgCard }}
      >
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ backgroundColor: tokens.color.bgDark }}
        >
          <div>
            <h3 className="text-xl font-black text-white">{sede ? 'Editar sede' : 'Nueva sede'}</h3>
            <p className="text-sm" style={{ color: tokens.color.accentSoft }}>
              Configuración operacional por tienda
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white" type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="md:col-span-2">
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              Nombre
            </span>
            <input
              value={form.nombre}
              onChange={(e) => onField('nombre')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
              placeholder="Sede Centro"
            />
          </label>

          <label className="md:col-span-2">
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              Direccion
            </span>
            <input
              value={form.direccion}
              onChange={(e) => onField('direccion')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
            />
          </label>

          <label>
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              Ciudad
            </span>
            <input
              value={form.ciudad}
              onChange={(e) => onField('ciudad')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
            />
          </label>

          <label>
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              Telefono
            </span>
            <input
              value={form.telefono}
              onChange={(e) => onField('telefono')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
            />
          </label>

          <label className="md:col-span-2">
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              Administrador responsable
            </span>
            <input
              value={form.responsable}
              onChange={(e) => onField('responsable')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
              placeholder="Nombre del administrador"
            />
          </label>

          <label>
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              Tipo
            </span>
            <select
              value={form.tipo}
              onChange={(e) => onField('tipo')(e.target.value as TipoSede)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
            >
              <option value={TipoSede.TIENDA}>TIENDA</option>
              <option value={TipoSede.BODEGA}>BODEGA</option>
              <option value={TipoSede.PRINCIPAL}>PRINCIPAL</option>
            </select>
          </label>

          <label>
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              Moneda
            </span>
            <input
              value={form.moneda}
              onChange={(e) => onField('moneda')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
              placeholder="COP"
            />
          </label>

          <label className="md:col-span-2">
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              Impuesto (%)
            </span>
            <input
              type="number"
              min={0}
              max={100}
              value={form.impuestoPorcentaje}
              onChange={(e) => onField('impuestoPorcentaje')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
            />
          </label>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border font-bold"
            style={{ borderColor: tokens.color.border, color: tokens.color.textMuted }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex-1 py-3 rounded-xl font-black text-white disabled:opacity-70"
            style={{ backgroundColor: tokens.color.bgDark }}
          >
            {saveMutation.isPending ? 'Guardando...' : sede ? 'Guardar cambios' : 'Crear sede'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SedesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ISede | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sedes'],
    queryFn: getSedes,
    refetchInterval: 60000,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sedes/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sedes'] });
    },
  });

  const sedes = data ?? [];
  const activas = sedes.filter((s) => s.activo !== false).length;
  const ciudades = useMemo(() => new Set(sedes.map((s) => s.ciudad)).size, [sedes]);

  return (
    <AppLayout>
      {(showModal || editing) && (
        <SedeModal
          sede={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditing(null);
            void queryClient.invalidateQueries({ queryKey: ['sedes'] });
          }}
        />
      )}

      <div className="space-y-8">
        <header className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-on-secondary-fixed tracking-tight">
              Sedes
            </h1>
            <p className="text-secondary font-medium mt-1">Puntos de venta y bodegas registrados</p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-5 py-3 rounded-xl font-black text-sm text-white uppercase tracking-wider"
            style={{ backgroundColor: tokens.color.bgDark }}
          >
            Nueva sede
          </button>
        </header>

        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-low p-5 rounded-2xl border-l-4 border-primary">
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                Total sedes
              </p>
              <p className="text-2xl font-black text-on-secondary-fixed">{sedes.length}</p>
            </div>
            <div
              className="p-5 rounded-2xl border-l-4"
              style={{ backgroundColor: tokens.color.successBg, borderColor: tokens.color.success }}
            >
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                Sedes activas
              </p>
              <p className="text-2xl font-black" style={{ color: tokens.color.success }}>
                {activas}
              </p>
            </div>
            <div className="bg-surface-container-low p-5 rounded-2xl border-l-4 border-secondary">
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                Ciudades
              </p>
              <p className="text-2xl font-black text-on-secondary-fixed">{ciudades}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl h-44 bg-surface-container" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest">
            <span className="material-symbols-outlined text-5xl text-error">error</span>
            <p className="text-sm font-bold text-secondary">No fue posible cargar las sedes</p>
          </div>
        ) : sedes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest">
            <span className="material-symbols-outlined text-5xl text-outline">location_on</span>
            <p className="text-sm font-bold text-secondary">No hay sedes registradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sedes.map((sede) => {
              const tc = tipoColor[sede.tipo] ?? { bg: '#f5f5f5', color: '#546e7a' };

              return (
                <div
                  key={sede.id}
                  className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden"
                >
                  <div className="p-5" style={{ backgroundColor: tokens.color.bgDark }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-white">{sede.nombre}</h3>
                        <p className="text-sm" style={{ color: tokens.color.accentSoft }}>
                          {sede.ciudad}
                        </p>
                      </div>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-black"
                        style={{ backgroundColor: tc.bg, color: tc.color }}
                      >
                        {sede.tipo}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <p className="text-sm text-secondary">{sede.direccion}</p>
                    {sede.telefono && (
                      <p className="text-sm text-secondary">Tel: {sede.telefono}</p>
                    )}
                    {sede.responsable && (
                      <p className="text-sm text-secondary">Administrador: {sede.responsable}</p>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div
                        className="px-3 py-2 rounded-lg text-xs font-bold"
                        style={{
                          backgroundColor: tokens.color.bgSoft,
                          color: tokens.color.textMuted,
                        }}
                      >
                        Moneda: {sede.moneda ?? 'COP'}
                      </div>
                      <div
                        className="px-3 py-2 rounded-lg text-xs font-bold text-right"
                        style={{
                          backgroundColor: tokens.color.bgSoft,
                          color: tokens.color.textMuted,
                        }}
                      >
                        Impuesto: {Number(sede.impuestoPorcentaje ?? 19).toFixed(0)}%
                      </div>
                    </div>

                    <div className="pt-2 border-t border-outline-variant/10 flex items-center justify-between">
                      <span className="text-xs text-secondary font-medium">
                        ID: {sede.id.slice(0, 8)}...
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(sede)}
                          className="p-2 rounded-lg hover:bg-surface-container"
                          title="Editar sede"
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 18, color: tokens.color.textMuted }}
                          >
                            edit
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMutation.mutate(sede.id)}
                          className="p-2 rounded-lg hover:bg-surface-container"
                          title="Desactivar sede"
                          disabled={removeMutation.isPending}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 18, color: tokens.color.danger }}
                          >
                            delete
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
