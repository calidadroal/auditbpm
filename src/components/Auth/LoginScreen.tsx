// src/components/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, AlertTriangle } from 'lucide-react';
import { resetUserPassword } from '../../firebase';

const LoginScreen: React.FC = () => {
  const { login, register, trialExpired } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [errorTerminos, setErrorTerminos] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setErrorTerminos('');
    
    if (isRegister && !aceptaTerminos) {
      setErrorTerminos('Debes aceptar los Términos de Uso para crear una cuenta.');
      return;
    }
    
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
        setSuccess('✅ Usuario registrado correctamente. Revisa tu email para confirmar.');
        setIsRegister(false);
        setAceptaTerminos(false);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No existe un usuario con este email.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Contraseña incorrecta.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este email ya está registrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Espera unos minutos.');
      } else {
        setError(err.message || 'Error de autenticación.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email) { setError('Ingresa tu email para recuperar la contraseña.'); return; }
    setLoading(true);
    try {
      await resetUserPassword(email);
      setSuccess('Te enviamos un email para restablecer tu contraseña. Revisa tu bandeja de entrada.');
      setResetMode(false);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') setError('No existe un usuario con este email.');
      else if (err.code === 'auth/invalid-email') setError('Email inválido.');
      else setError('Error al enviar el email de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-slate-900">AuditBPM</h1>
          <p className="text-sm text-slate-500 mt-2">
            {resetMode ? 'Recuperar Contraseña' : 'Gastronomía & Seguridad Operativa'}
          </p>
        </div>

        {trialExpired && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="font-bold text-red-800 text-sm">Prueba gratuita finalizada</p>
            </div>
            <p className="text-xs text-red-600">
              Tu período de prueba de 7 días ha terminado. Contactanos para suscribirte y seguir usando AuditBPM.
            </p>
            <a href="mailto:todoenregla.app@gmail.com" className="inline-block mt-2 text-sm text-blue-600 font-bold hover:underline">
              Contactar para suscribirme
            </a>
          </div>
        )}

        {resetMode ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 h-10 px-3 mt-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="usuario@ejemplo.com" required />
              <p className="text-xs text-slate-400 mt-1">Te enviaremos un link para restablecer tu contraseña.</p>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-red-700 text-xs font-bold">{error}</p></div>}
            {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3"><p className="text-green-700 text-xs font-bold">{success}</p></div>}
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {loading ? 'Enviando...' : 'Enviar Email de Recuperación'}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => { setResetMode(false); setError(''); setSuccess(''); }} className="text-sm text-blue-600 font-bold hover:underline">
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 h-10 px-3 mt-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="usuario@ejemplo.com" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 h-10 px-3 mt-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="........" required minLength={6} />
            </div>
            
            {isRegister && (
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={(e) => {
                      setAceptaTerminos(e.target.checked);
                      if (errorTerminos) setErrorTerminos('');
                    }}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700">
                    Acepto los{' '}
                    <a 
                      href="/terminos.html" 
                      target="_blank" 
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Términos de Uso
                    </a>
                    {' '}y entiendo que el uso de la aplicación puede derivar en cobros luego del período de prueba gratuito.
                  </span>
                </label>
                {errorTerminos && (
                  <p className="text-xs text-red-600">{errorTerminos}</p>
                )}
              </div>
            )}

            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-red-700 text-xs font-bold">{error}</p></div>}
            {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3"><p className="text-green-700 text-xs font-bold">{success}</p></div>}
            
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Procesando...
                </span>
              ) : isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </button>
            
            <div className="text-center space-y-2">
              <button 
                type="button" 
                onClick={() => { 
                  setIsRegister(!isRegister); 
                  setError(''); 
                  setSuccess('');
                  setErrorTerminos('');
                  setAceptaTerminos(false);
                }} 
                className="text-sm text-blue-600 font-bold hover:underline block w-full"
              >
                {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
              </button>
              {!isRegister && (
                <button type="button" onClick={() => { setResetMode(true); setError(''); setSuccess(''); }} className="text-xs text-slate-500 hover:text-blue-600 hover:underline">
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
          </form>
        )}
        
        <div className="mt-6 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-400 text-center">Sistema de Auditoría Interna v2.0</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;