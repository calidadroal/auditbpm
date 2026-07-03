// src/components/QR/QRScanner.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { validateQRToken } from '../../firebase';
import { useAppContext } from '../../context/AppContext';
import { QrCode, CheckCircle, AlertCircle, Camera, CameraOff } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess?: () => void;
  onClose?: () => void;
  required?: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose, required = false }) => {
  const { setSelectedSector } = useAppContext();
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [scannedSector, setScannedSector] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [showManual, setShowManual] = useState(false);

  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const mountedRef = useRef(true);
  const scannerDivId = 'qr-reader';

  useEffect(() => {
    mountedRef.current = true;

    // Iniciar cámara con un pequeño delay para evitar conflictos con Strict Mode
    if (!success && !cameraActive && !isStartingRef.current) {
      const timer = setTimeout(() => {
        if (mountedRef.current && !cameraActive && !isStartingRef.current) {
          startCamera();
        }
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, []);

  const getCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);
      if (devices.length > 0) {
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera'));
        setSelectedCamera(backCamera ? backCamera.id : devices[0].id);
        return devices;
      }
    } catch (err) {
      console.error('Error obteniendo cámaras:', err);
    }
    return [];
  };

  const startCamera = async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      const devices = await getCameras();
      if (devices.length === 0) {
        setError('No se encontraron cámaras. Usá la entrada manual.');
        setShowManual(true);
        isStartingRef.current = false;
        return;
      }

      // Detener instancia anterior si existe
      if (html5QrRef.current) {
        try {
          await html5QrRef.current.stop();
          html5QrRef.current.clear();
        } catch (e) {
          // Ignorar errores al detener
        }
        html5QrRef.current = null;
      }

      // Pequeña pausa para asegurar limpieza
      await new Promise(resolve => setTimeout(resolve, 200));

      if (!mountedRef.current) {
        isStartingRef.current = false;
        return;
      }

      html5QrRef.current = new Html5Qrcode(scannerDivId);
      const cameraId = selectedCamera || devices[0].id;

      await html5QrRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          stopCamera();
          handleValidateToken(decodedText);
        },
        () => {
          // Ignorar errores de escaneo parcial
        }
      );

      if (mountedRef.current) {
        setCameraActive(true);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error iniciando cámara:', err);
      if (mountedRef.current) {
        setError('No se pudo acceder a la cámara. Verificá los permisos o usá entrada manual.');
        setShowManual(true);
        setCameraActive(false);
      }
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopCamera = () => {
    if (html5QrRef.current) {
      try {
        html5QrRef.current.stop().then(() => {
          if (mountedRef.current) setCameraActive(false);
        }).catch(() => {
          if (mountedRef.current) setCameraActive(false);
        });
      } catch (e) {
        if (mountedRef.current) setCameraActive(false);
      }
    }
  };

  const switchCamera = async () => {
    stopCamera();
    await new Promise(resolve => setTimeout(resolve, 300));
    const devices = await getCameras();
    const currentIndex = devices.findIndex(d => d.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedCamera(devices[nextIndex]?.id || devices[0]?.id);
    setTimeout(() => startCamera(), 500);
  };

  const handleValidateToken = async (token: string) => {
    if (!token.trim()) {
      setError('QR no detectado correctamente');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await validateQRToken(token.trim());
      
      if (result.isValid && result.sector) {
        setSelectedSector(result.sector);
        setScannedSector(result.sector);
        setSuccess(true);
        setError(null);
        stopCamera();
        
        if (onScanSuccess) {
          setTimeout(() => {
            onScanSuccess();
          }, 800);
        }
      } else {
        setError(result.errors[0] || 'QR inválido o inactivo');
        setSuccess(false);
        setScannedSector(null);
        if (!cameraActive) {
          setTimeout(() => startCamera(), 1500);
        }
      }
    } catch (err) {
      console.error('Error validando QR:', err);
      setError('Error al validar el QR. Verifique su conexión.');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleManualValidate = () => {
    handleValidateToken(manualToken);
  };

  const handleClear = () => {
    setSelectedSector(null);
    setScannedSector(null);
    setSuccess(false);
    setError(null);
    setManualToken('');
    setShowManual(false);
    startCamera();
  };

  return (
    <div className="bg-white rounded-lg border-2 border-dashed border-blue-300 p-4">
      {success && scannedSector ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="font-bold text-green-800">✅ QR Validado Correctamente</p>
              <p className="text-sm text-green-700">
                Sector: <strong>{scannedSector.name}</strong>
              </p>
            </div>
          </div>
          {!required && (
            <button
              onClick={handleClear}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Escanear otro QR
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-gray-700">
                  {cameraActive ? 'Escaneando QR...' : 'Cámara'}
                </p>
              </div>
              <div className="flex gap-2">
                {cameras.length > 1 && (
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    🔄 Cambiar cámara
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setShowManual(!showManual);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  {showManual ? (
                    <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> Usar cámara</span>
                  ) : (
                    <span className="flex items-center gap-1"><CameraOff className="w-3 h-3" /> Entrada manual</span>
                  )}
                </button>
              </div>
            </div>

            {!showManual ? (
              <div 
                id={scannerDivId} 
                className="w-full rounded-lg overflow-hidden"
                style={{ minHeight: '300px' }}
              />
            ) : (
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Ingresá el token manualmente:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Pegue el token del QR aquí"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleManualValidate();
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleManualValidate}
                    disabled={loading || !manualToken.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {loading ? 'Validando...' : 'Validar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-blue-700">Validando token...</p>
            </div>
          )}

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 <strong>Tip:</strong> Apuntá la cámara al QR impreso. Si no funciona, usá la entrada manual con el token del PDF.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default QRScanner;