import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import api from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.accessToken, data.usuario);
      navigate('/');
    } catch {
      setError('Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen" style={{ fontFamily: "'Manrope', sans-serif" }}>
      {/* Left Side: Brand Panel */}
      <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center" style={{ backgroundColor: '#2E1B0C' }}>
        <div className="z-10 text-center flex flex-col items-center px-12">
          <div className="mb-8 p-6 rounded-full border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-20 h-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C9 2 6 5 6 8c0 4 6 10 6 10s6-6 6-10c0-3-2.686-6-6-6z" />
              <circle cx="12" cy="8" r="2" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-white text-5xl font-extrabold tracking-tight mb-4">
            Integral Cosméticos
          </h1>
          <p className="text-lg font-medium tracking-widest uppercase" style={{ color: '#FBA9E5' }}>
            Sistema de Gestión de Ventas
          </p>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
      </section>

      {/* Right Side: Login Form */}
      <section className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 sm:px-12 md:px-24" style={{ backgroundColor: '#F6F2F4' }}>
        <div className="w-full max-w-md">
          <div className="bg-white p-10 rounded-xl" style={{ boxShadow: '0 24px 48px -12px rgba(42,23,9,0.08)' }}>
            <header className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#1c1b1d' }}>
                Bienvenido
              </h2>
              <p className="text-sm font-medium" style={{ color: '#785d4a' }}>
                Ingrese sus credenciales para acceder al panel.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: '#5a4230' }} htmlFor="email">
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@integral.com"
                  required
                  className="w-full px-4 py-4 rounded-xl border transition-all duration-200 outline-none text-sm"
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#dac0c5',
                    color: '#1c1b1d',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#A43E63')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#dac0c5')}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: '#5a4230' }} htmlFor="password">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-4 pr-12 rounded-xl border transition-all duration-200 outline-none text-sm"
                    style={{
                      backgroundColor: '#ffffff',
                      borderColor: '#dac0c5',
                      color: '#1c1b1d',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#A43E63')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#dac0c5')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 focus:outline-none"
                    style={{ color: '#877176' }}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.97 9.97 0 015.39 1.56M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: '#ffdad6', color: '#93000a' }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 text-white font-bold text-sm tracking-widest uppercase rounded-full transition-all duration-200 disabled:opacity-60"
                  style={{ backgroundColor: '#A43E63' }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#85264b')}
                  onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#A43E63')}
                >
                  {loading ? 'Iniciando sesión...' : 'Ingresar'}
                </button>
              </div>
            </form>

            <footer className="mt-8 pt-8 border-t" style={{ borderColor: '#e5e1e3' }}>
              <p className="text-center text-xs" style={{ color: 'rgba(120,93,74,0.6)' }}>
                ¿Problemas de acceso? Contacte al administrador.
              </p>
            </footer>
          </div>

          {/* Version footer */}
          <div className="flex justify-between items-center mt-6 px-1">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(115,89,70,0.6)', fontSize: '10px' }}>
              v1.0.0 · Integral Cosméticos
            </span>
            <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(115,89,70,0.6)', fontSize: '10px' }}>
              © 2026
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
