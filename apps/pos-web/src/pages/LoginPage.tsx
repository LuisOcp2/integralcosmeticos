import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const user = await login(email, password);
    if (user) {
      navigate('/pos', { replace: true });
    }
  };

  return (
    <div className="h-screen w-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm flex flex-col gap-8 px-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center shadow-elevation2">
            <span className="material-icon text-on-primary text-4xl filled">local_pharmacy</span>
          </div>
          <h1 className="text-on-background font-bold text-2xl text-center">Integral Cosméticos</h1>
          <p className="text-on-surface-variant text-sm text-center">
            Sistema POS – Inicia sesión para continuar
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-on-surface-variant text-sm font-medium" htmlFor="email">
              Correo electrónico
            </label>
            <div className="flex items-center gap-2 bg-surface-2 border border-outline-variant rounded-2xl px-4 h-12 focus-within:border-primary transition-colors">
              <span className="material-icon text-outline text-lg">email</span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@cosmeticos.com"
                required
                className="flex-1 bg-transparent text-on-background text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-on-surface-variant text-sm font-medium" htmlFor="password">
              Contraseña
            </label>
            <div className="flex items-center gap-2 bg-surface-2 border border-outline-variant rounded-2xl px-4 h-12 focus-within:border-primary transition-colors">
              <span className="material-icon text-outline text-lg">lock</span>
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="flex-1 bg-transparent text-on-background text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="text-outline hover:text-on-background transition-colors"
              >
                <span className="material-icon text-lg">
                  {showPwd ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-error-container rounded-2xl px-4 py-3">
              <span className="material-icon text-error text-lg">error</span>
              <p className="text-on-error-container text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-2xl bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-elevation1 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-icon text-xl">login</span>
                Ingresar al sistema
              </>
            )}
          </button>
        </form>

        <p className="text-center text-outline text-xs">Integral Cosméticos · POS v1.0</p>
      </div>
    </div>
  );
}
