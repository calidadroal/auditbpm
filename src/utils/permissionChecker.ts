// src/utils/permissionChecker.ts
import { ROLES_PERMISOS, type PermisoNombre, type User } from '../types';

/**
 * Verifica si los overrides del usuario están vencidos.
 * @returns true si los overrides vencieron (se deben ignorar)
 */
export function overridesVencidos(user: User | null): boolean {
  if (!user) return false;
  if (!user.overrideActivo) return false;
  
  const fechaVencimiento = user.fechaVencimientoOverrides;
  if (!fechaVencimiento) return false; // Sin fecha = no vencen
  
  const ahora = new Date();
  const vencimiento = new Date(fechaVencimiento);
  
  return ahora > vencimiento;
}

/**
 * Verifica si un usuario tiene un permiso específico.
 * Orden de prioridad:
 * 1. Si es admin → siempre true (no se puede restringir)
 * 2. Si tiene overrideActivo, NO venció, y el permiso está definido → usa override
 * 3. Si no → usa el permiso heredado del rol base
 */
export function tienePermiso(user: User | null, permiso: PermisoNombre): boolean {
  if (!user) return false;

  // Admin siempre tiene todos los permisos
  if (user.role === 'admin') return true;

  // Si el override está activo, NO venció, y el permiso está definido
  if (user.overrideActivo && !overridesVencidos(user) && user.permisosOverride?.hasOwnProperty(permiso)) {
    return user.permisosOverride[permiso] === true;
  }

  // Usar permiso heredado del rol
  return ROLES_PERMISOS[user.role]?.[permiso] ?? false;
}

/**
 * Devuelve todos los permisos efectivos del usuario (rol + overrides aplicados)
 */
export function getPermisosEfectivos(user: User | null): Record<PermisoNombre, boolean> {
  if (!user) return {} as Record<PermisoNombre, boolean>;

  // Partir de los permisos base del rol
  const efectivos = { ...ROLES_PERMISOS[user.role] };

  // Aplicar overrides si están activos y no vencieron
  if (user.overrideActivo && !overridesVencidos(user) && user.permisosOverride) {
    Object.entries(user.permisosOverride).forEach(([key, value]) => {
      if (key in efectivos) {
        efectivos[key as PermisoNombre] = value as boolean;
      }
    });
  }

  return efectivos;
}

/**
 * Devuelve qué permisos son heredados del rol y cuáles son overrides
 */
export function getOrigenPermisos(user: User | null): Record<PermisoNombre, 'rol' | 'override'> {
  if (!user) return {} as Record<PermisoNombre, 'rol' | 'override'>;

  const origen: Record<string, 'rol' | 'override'> = {};
  const todosLosPermisos = Object.keys(ROLES_PERMISOS[user.role]) as PermisoNombre[];

  todosLosPermisos.forEach((permiso) => {
    if (user.overrideActivo && !overridesVencidos(user) && user.permisosOverride?.hasOwnProperty(permiso)) {
      origen[permiso] = 'override';
    } else {
      origen[permiso] = 'rol';
    }
  });

  return origen;
}