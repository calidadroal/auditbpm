// src/hooks/usePermissions.ts
import { useAuth } from '../context/AuthContext';
import { tienePermiso, getPermisosEfectivos } from '../utils/permissionChecker';
import type { PermisoNombre } from '../types';

/**
 * Hook para usar en cualquier componente.
 * Reemplaza a useAppContext().isAdmin por usePermissions().can('permiso')
 */
export function usePermissions() {
  const { user } = useAuth();

  return {
    /** Verifica si el usuario actual tiene un permiso específico */
    can: (permiso: PermisoNombre): boolean => tienePermiso(user, permiso),

    /** Todos los permisos efectivos del usuario (rol + overrides) */
    permisos: getPermisosEfectivos(user),

    /** El usuario actual */
    user,

    /** Shorthands para los permisos más usados */
    isAdmin: user?.role === 'admin',
    canAuditar: tienePermiso(user, 'ejecutar_auditoria'),
    canGestionar: tienePermiso(user, 'gestionar_usuarios'),
    canExportar: tienePermiso(user, 'exportar_reportes'),
    canVerDashboard: tienePermiso(user, 'ver_dashboard'),
    canCrearAuditoria: tienePermiso(user, 'crear_auditoria'),
  };
}