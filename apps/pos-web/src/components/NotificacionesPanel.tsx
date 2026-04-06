import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';

type Notificacion = {
  id: string;
  tipo: 'INFO' | 'ALERTA' | 'ERROR' | 'EXITO' | 'RECORDATORIO';
  categoria:
    | 'STOCK'
    | 'VENTA'
    | 'CRM'
    | 'RRHH'
    | 'FINANZAS'
    | 'DOCUMENTO'
    | 'SISTEMA'
    | 'TAREA'
    | 'GENERAL';
  titulo: string;
  mensaje: string;
  leida: boolean;
  accionRuta?: string | null;
  createdAt: string;
};

type ResumenNotificaciones = {
  noLeidas: number;
};

type ListadoNotificaciones = {
  items: Notificacion[];
};

const categoriaEmoji: Record<Notificacion['categoria'], string> = {
  STOCK: '📦',
  VENTA: '💰',
  CRM: '👥',
  RRHH: '🧑‍💼',
  FINANZAS: '📊',
  DOCUMENTO: '📄',
  SISTEMA: '🛠️',
  TAREA: '✅',
  GENERAL: '🔔',
};

const tipoColor: Record<Notificacion['tipo'], string> = {
  INFO: 'border-blue-200 bg-blue-50/60',
  ALERTA: 'border-amber-200 bg-amber-50/60',
  ERROR: 'border-rose-200 bg-rose-50/60',
  EXITO: 'border-emerald-200 bg-emerald-50/60',
  RECORDATORIO: 'border-violet-200 bg-violet-50/60',
};

function getRelativeTime(isoDate: string): string {
  const now = Date.now();
  const date = new Date(isoDate).getTime();
  const diffMs = Math.max(0, now - date);
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(isoDate));
}

function getSocketOrigin() {
  const apiUrl = import.meta.env.VITE_API_URL ?? '/api/v1';
  return new URL(apiUrl, window.location.origin).origin;
}

export default function NotificacionesPanel() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  const token = useMemo(() => localStorage.getItem('pos_token'), []);

  const loadResumen = useCallback(async () => {
    try {
      const { data } = await apiClient.get<ResumenNotificaciones>('/notificaciones/resumen');
      setNoLeidas(data.noLeidas ?? 0);
    } catch {
      // ignore
    }
  }, []);

  const loadNotificaciones = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<ListadoNotificaciones>('/notificaciones', {
        params: { page: 1, limit: 25 },
      });
      setNotificaciones(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResumen();
    const interval = window.setInterval(() => {
      void loadResumen();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [loadResumen]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket: Socket = io(`${getSocketOrigin()}/notificaciones`, {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('nueva-notificacion', (notificacion: Notificacion) => {
      setNotificaciones((prev) => [notificacion, ...prev].slice(0, 50));
      setNoLeidas((prev) => prev + 1);
      toast.success(notificacion.titulo || 'Nueva notificacion');
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      void loadNotificaciones();
    }
  }, [isOpen, loadNotificaciones]);

  const marcarLeida = useCallback(
    async (notificacion: Notificacion) => {
      if (!notificacion.leida) {
        await apiClient.patch(`/notificaciones/${notificacion.id}/leer`);
        setNotificaciones((prev) =>
          prev.map((item) => (item.id === notificacion.id ? { ...item, leida: true } : item)),
        );
        setNoLeidas((prev) => Math.max(0, prev - 1));
      }

      if (notificacion.accionRuta) {
        setIsOpen(false);
        navigate(notificacion.accionRuta);
      }
    },
    [navigate],
  );

  const marcarTodasLeidas = useCallback(async () => {
    await apiClient.patch('/notificaciones/leer-todas');
    setNotificaciones((prev) => prev.map((item) => ({ ...item, leida: true })));
    setNoLeidas(0);
  }, []);

  return (
    <>
      <button
        type="button"
        title="Notificaciones"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-outline-variant bg-surface shadow-sm transition-colors hover:bg-surface-2"
      >
        <Bell className="h-5 w-5 text-on-surface" />
        {noLeidas > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-white">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="Cerrar panel"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/30"
          />

          <aside className="fixed right-0 top-0 z-50 h-screen w-full max-w-md border-l border-outline-variant bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
              <div>
                <h3 className="text-base font-bold text-on-background">Notificaciones</h3>
                <p className="text-xs text-on-surface-variant">{noLeidas} sin leer</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void marcarTodasLeidas()}
                  className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-2"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Marcar todas
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-[calc(100vh-64px)] overflow-y-auto p-3">
              {loading ? (
                <p className="p-3 text-sm text-on-surface-variant">Cargando...</p>
              ) : notificaciones.length === 0 ? (
                <p className="p-3 text-sm text-on-surface-variant">No hay notificaciones.</p>
              ) : (
                <ul className="space-y-2">
                  {notificaciones.map((notificacion) => (
                    <li key={notificacion.id}>
                      <button
                        type="button"
                        onClick={() => void marcarLeida(notificacion)}
                        className={`w-full rounded-xl border p-3 text-left transition-colors hover:bg-surface-2 ${
                          notificacion.leida
                            ? 'border-outline-variant bg-surface'
                            : `${tipoColor[notificacion.tipo]} border`
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{categoriaEmoji[notificacion.categoria]}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-on-background">
                              {notificacion.titulo}
                            </p>
                            <p className="mt-1 text-xs text-on-surface-variant">
                              {notificacion.mensaje}
                            </p>
                            <p className="mt-1 text-[11px] text-on-surface-variant/80">
                              {getRelativeTime(notificacion.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
