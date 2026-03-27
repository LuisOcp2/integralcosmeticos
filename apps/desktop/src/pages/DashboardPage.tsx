import React from 'react';
import { useAuthStore } from '../store/auth.store';

export default function DashboardPage() {
  const { usuario, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary-700">🧴 Integral Cosméticos</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {usuario?.nombre} {usuario?.apellido}
            <span className="ml-2 bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full">
              {usuario?.rol}
            </span>
          </span>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Ventas Hoy', value: '$0', icon: '🛒', color: 'bg-blue-50 text-blue-700' },
            { label: 'Productos', value: '0', icon: '🧴', color: 'bg-pink-50 text-pink-700' },
            { label: 'Stock Bajo', value: '0', icon: '⚠️', color: 'bg-yellow-50 text-yellow-700' },
            { label: 'Clientes', value: '0', icon: '👤', color: 'bg-green-50 text-green-700' },
          ].map((card) => (
            <div key={card.label} className={`rounded-xl p-5 ${card.color} shadow-sm`}>
              <div className="text-2xl mb-2">{card.icon}</div>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="text-sm opacity-75">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            🚀 Sistema inicializado correctamente
          </h2>
          <p className="text-gray-500">
            Los módulos de Productos, Inventario, Ventas y CRM están en desarrollo.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Fase 1 completada ✅ — Auth, Usuarios, Dashboard base
          </p>
        </div>
      </main>
    </div>
  );
}
