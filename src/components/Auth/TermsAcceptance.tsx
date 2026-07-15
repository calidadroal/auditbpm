// src/components/Auth/TermsAcceptance.tsx
import React, { useState, useRef } from 'react';
import { Shield } from 'lucide-react';

interface TermsAcceptanceProps {
  onAccept: () => void;
}

const TermsAcceptance: React.FC<TermsAcceptanceProps> = ({ onAccept }) => {
  const [acepta, setAcepta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    if (isAtBottom) {
      setScrolledToEnd(true);
    }
  };

  const handleMarkAsRead = () => {
    setScrolledToEnd(true);
  };

  const handleAccept = async () => {
    if (!acepta) {
      setError('Debes aceptar los Términos de Uso para continuar.');
      return;
    }

    if (!scrolledToEnd) {
      setError('Debes leer los términos hasta el final antes de aceptarlos. O haz clic en "Ya leí todo".');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAccept();
    } catch (error) {
      console.error('Error al guardar aceptación:', error);
      setError('Error al guardar tu aceptación. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-slate-900">TodoEnRegla</h1>
          <p className="text-sm text-slate-500 mt-2">
            Aceptación de Términos de Uso
          </p>
        </div>

        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            <strong>📋 Para continuar usando TodoEnRegla,</strong> debes leer y aceptar nuestros Términos de Uso.
          </p>
        </div>

        <div 
          ref={scrollRef}
          className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50"
          onScroll={handleScroll}
        >
          <div className="prose prose-sm max-w-none">
            <h3 className="text-lg font-bold text-gray-900">Términos de Uso</h3>
            <p className="text-gray-600 text-sm">Última actualización: 02 de julio de 2026</p>
            
            <h4 className="font-semibold mt-4">1. Licencia de Uso</h4>
            <p className="text-gray-700 text-sm">
              TodoEnRegla te otorga una licencia limitada, personal, no exclusiva e intransferible para utilizar la aplicación exclusivamente para tu uso interno o el de tu organización. Esta licencia NO implica la transferencia de la propiedad del software.
            </p>

            <h4 className="font-semibold mt-4">2. Restricciones</h4>
            <p className="text-gray-700 text-sm">
              El usuario NO podrá: copiar, modificar, adaptar, traducir o crear obras derivadas; realizar ingeniería inversa; redistribuir, sublicenciar, alquilar o arrendar el software; utilizar la aplicación para fines ilegales; eliminar o modificar avisos de propiedad intelectual.
            </p>

            <h4 className="font-semibold mt-4">3. Modelo de Pago</h4>
            <p className="text-gray-700 text-sm">
              TodoEnRegla opera bajo un modelo de suscripción. El acceso se proporciona mediante un período de prueba gratuito de 7 días. Al finalizar, el usuario deberá abonar las tarifas correspondientes al plan seleccionado. Los cobros se realizan de forma automática.
            </p>

            <h4 className="font-semibold mt-4">4. Limitación de Responsabilidad</h4>
            <p className="text-gray-700 text-sm">
              La aplicación se proporciona "TAL CUAL", sin garantías de ningún tipo. No garantizamos que esté libre de errores. No somos responsables de ningún daño directo, indirecto, incidental, especial o consecuente que surja del uso de la aplicación.
            </p>

            <h4 className="font-semibold mt-4">5. Propiedad Intelectual</h4>
            <p className="text-gray-700 text-sm">
              Todos los derechos de propiedad intelectual (marca, logo, código, diseño, contenido) son propiedad exclusiva de sus desarrolladores. Cualquier uso no autorizado será perseguido legalmente.
            </p>

            <h4 className="font-semibold mt-4">6. Terminación</h4>
            <p className="text-gray-700 text-sm">
              TodoEnRegla se reserva el derecho de suspender o cancelar tu acceso en cualquier momento si violas estos términos o realizas actividades fraudulentas.
            </p>

            <h4 className="font-semibold mt-4">7. Jurisdicción</h4>
            <p className="text-gray-700 text-sm">
              Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa será resuelta por los tribunales de Córdoba, Argentina.
            </p>

            <h4 className="font-semibold mt-4">8. Contacto</h4>
            <p className="text-gray-700 text-sm">
              Si tenes preguntas sobre estos términos, contactanos en:
              <br />
              <strong>todoenregla.app@gmail.com</strong>
            </p>

            <p className="text-sm text-gray-500 mt-4 italic">
              Versión: v1.0
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <span className="text-xs text-gray-500">
            {scrolledToEnd ? '✅ Has leído hasta el final' : '⬇️ Desplázate hasta el final o haz clic en "Ya leí todo"'}
          </span>
          {!scrolledToEnd && (
            <button
              type="button"
              onClick={handleMarkAsRead}
              className="text-xs text-green-600 hover:text-green-800 underline font-medium"
            >
              ✅ Ya leí todo
            </button>
          )}
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acepta}
              onChange={(e) => {
                setAcepta(e.target.checked);
                if (error) setError('');
              }}
              className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              disabled={!scrolledToEnd}
            />
            <span className="text-sm text-gray-700">
              He leído y acepto los{' '}
              <a 
                href="/terminos.html" 
                target="_blank" 
                className="text-green-600 hover:underline font-medium"
              >
                Términos de Uso
              </a>
              {' '}y entiendo que el uso de la aplicación puede derivar en cobros luego del período de prueba gratuito.
            </span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm font-bold">{error}</p>
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={loading || !acepta || !scrolledToEnd}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              loading || !acepta || !scrolledToEnd
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Guardando...
              </span>
            ) : (
              '✅ Aceptar y continuar'
            )}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Al aceptar, quedas vinculado legalmente a estos términos.
          <br />
          Versión: v1.0
        </p>
      </div>
    </div>
  );
};

export default TermsAcceptance;