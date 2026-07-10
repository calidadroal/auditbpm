// src/types/index.ts

export type UserRole = 'admin' | 'auditor' | 'lector' | 'gestor' | 'operador' | 'coordinador';

export type RespuestaValor = 'C' | 'CP' | 'NC' | 'NA';
export type RespuestaChecklist = 'CUMPLE' | 'NO_CUMPLE';
export type ClasificacionRiesgo = 'conforme' | 'a_mejorar' | 'riesgo_alto';
export type NivelDesvio = 'critico' | 'mayor' | 'menor' | 'ninguno';
export type NivelRiesgoMunicipal = 'bajo' | 'medio' | 'critico';
export type FrecuenciaAuditoria = 'diaria' | 'semanal' | 'quincenal' | 'mensual' | 'trimestral';
export type CategoriaRequisito = 'municipal' | 'nacional' | 'seguros' | 'sanidad' | 'bomberos' | 'otro';
export type TipoCuestionario = 'auditoria' | 'checklist' | 'gestion_comercio';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  assignedSites: string[];
  assignedQuestionnaires?: string[];
  active: boolean;
  trialEndsAt?: any;
  permisosOverride?: Record<string, boolean>;
  overrideActivo?: boolean;
  permisosActualizadosPor?: string;
  permisosActualizadosEn?: any;
  fechaVencimientoOverrides?: string | null;
  empresaId?: string;
  createdAt: any;
  updatedAt: any;
  termsAccepted?: boolean;
  termsVersion?: string;
  termsAcceptedAt?: string | null;
  isTrial?: boolean;
  plan?: string;
}

export interface HabilitacionItem {
  numero: string;
  fechaVencimiento: string | null;
}

export interface HabilitacionesSitio {
  establecimiento?: HabilitacionItem;
  rne?: HabilitacionItem;
  comercio?: HabilitacionItem;
}

export interface RequisitoAplicado {
  numero?: string;
  fechaVencimiento?: string | null;
  archivoUrl?: string;
}

export interface Requisito {
  id: string;
  nombre: string;
  categoria: CategoriaRequisito;
  descripcion?: string;
  pideNumero: boolean;
  pideFechaVencimiento: boolean;
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface Site {
  id: string;
  name: string;
  description?: string;
  sectors?: string[];
  address?: string;
  city?: string;
  active: boolean;
  isTrial?: boolean;
  notificationEmails?: string[];
  habilitaciones?: HabilitacionesSitio;
  responsableTecnico?: string;
  requisitosAplicados?: { [requisitoId: string]: RequisitoAplicado };
  createdAt: any;
  updatedAt: any;
}

export interface SectorQR {
  id: string;
  name: string;
  qrToken: string;
  siteId: string;
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface QRGroupConfig {
  sectorQRId: string;
  qrToken: string;
  siteId: string;
  sectorName: string;
  siteName: string;
}

export interface QuestionnaireConfig {
  id: string;
  name: string;
  description?: string;
  norma: string;
  tipo: TipoCuestionario;
  requireQR: boolean;
  requirePhotos: boolean;
  minimumTimeMinutes: number;
  allowPartialSave: boolean;
  requireLocation: boolean;
  questions: QuestionnaireQuestion[];
  preguntasGestion?: PreguntaGestion[];
  sitioIds: string[];
  qrGroups?: string[];
  qrGroupsConfig?: { [grupo: string]: QRGroupConfig };
  sectorizado?: boolean;
  notificationEmails?: string[];
  notifyOnCritical?: boolean;
  notifyOnRecurrence?: boolean;
  notifyOnScoreBelow?: number | null;
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface QuestionnaireQuestion {
  id: string;
  text: string;
  type: 'cumplimiento';
  required: boolean;
  requirePhoto: boolean;
  requireComment: boolean;
  instructions: string;
  norma: string;
  puntoNorma: string;
  esCriticoInocuidad: boolean;
  nivelDesvio: NivelDesvio;
  nivelRiesgoMunicipal?: NivelRiesgoMunicipal;
  minimumTimeSeconds: number;
  order: number;
  group?: string;
}

export interface AuditResponse {
  questionId: string;
  questionText: string;
  questionType: string;
  puntoNorma: string;
  norma: string;
  esCriticoInocuidad: boolean;
  nivelDesvio: NivelDesvio;
  nivelRiesgoMunicipal?: NivelRiesgoMunicipal;
  valor: RespuestaValor | RespuestaChecklist;
  comentario: string;
  photoURLs: string[];
  responseTimeSeconds: number;
  startedAt: any;
  completedAt: any;
}

export interface Geolocalizacion {
  lat: number;
  lng: number;
  precision?: number;
  timestamp?: number;
}

export interface AuditRecord {
  id: string;
  siteId: string;
  siteName: string;
  sectorId?: string;
  sectorName?: string;
  questionnaireId: string;
  questionnaireName: string;
  norma: string;
  tipoCuestionario?: TipoCuestionario;
  auditorId: string;
  auditorEmail: string;
  auditorName: string;
  responses: AuditResponse[];
  score: number;
  totalAplicables: number;
  totalCumplen: number;
  totalCumplenParcial: number;
  totalNoCumplen: number;
  totalNoAplica: number;
  criticosNC: number;
  criticosMunicipalesNC?: number;
  mediosMunicipalesNC?: number;
  clasificacion: ClasificacionRiesgo;
  recurrenciaDetectada: boolean;
  recurrenciaDetalle: string;
  desviosSistematicos: string[];
  startedAt: any;
  completedAt: any;
  durationMinutes: number;
  qrToken?: string;
  qrValidatedAt?: any;
  status: 'in_progress' | 'completed' | 'partial';
  geolocalizacion?: Geolocalizacion | null;
  establecimiento?: string | null;
  observacionesGenerales?: string | null;
  createdAt: any;
  updatedAt: any;
}

export interface AuditSchedule {
  id: string;
  siteId: string;
  siteName: string;
  frecuencia: FrecuenciaAuditoria;
  proximaAuditoria: any;
  ultimaAuditoria?: any;
  cuestionarioIds: string[];
  responsableId?: string;
  responsableName?: string;
  alertarVencimiento: boolean;
  diasAlertaVencimiento: number;
  emailsAlerta: string[];
  active: boolean;
  estado: 'al_dia' | 'proxima' | 'vencida';
  createdAt: any;
  updatedAt: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface RecurrenceResult {
  detectada: boolean;
  detalle: string;
  desviosSistematicos: string[];
}

export interface AppState {
  user: User | null;
  sites: Site[];
  sectors: SectorQR[];
  questionnaires: QuestionnaireConfig[];
  audits: AuditRecord[];
  userSites: string[];
  currentQuestionnaire: QuestionnaireConfig | null;
  selectedSector: SectorQR | null;
  loading: boolean;
  error: string | null;
}

export interface NotificationConfig {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  auditCompleted: boolean;
  auditAssigned: boolean;
  scoreBelow: number | null;
}

export interface Notificacion {
  id: string;
  auditId: string;
  siteId: string;
  siteName: string;
  questionnaireId: string;
  questionnaireName: string;
  tipo: 'critico' | 'recurrencia' | 'score_bajo' | 'vencimiento' | 'habilitacion_por_vencer' | 'riesgo_clausura' | 'trial_vencido';
  mensaje: string;
  criticosEncontrados: number;
  score: number;
  read: boolean;
  createdAt: any;
  emailsEnviados?: string[];
  _deleted?: boolean;
}

export type TipoSolicitud = 'nuevo_sitio' | 'nuevo_cuestionario' | 'modificar_sitio' | 'nuevo_usuario' | 'cambio_frecuencia' | 'otro';
export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada' | 'en_revision';

export interface Solicitud {
  id: string;
  tipo: TipoSolicitud;
  titulo: string;
  descripcion: string;
  solicitanteId: string;
  solicitanteNombre: string;
  solicitanteEmail: string;
  sitioId?: string;
  sitioNombre?: string;
  estado: EstadoSolicitud;
  adminRespuesta?: string;
  adminId?: string;
  createdAt: any;
  updatedAt: any;
}

export type PermisoNombre =
  | 'crear_auditoria'
  | 'ejecutar_auditoria'
  | 'ver_sus_auditorias'
  | 'ver_todas_auditorias'
  | 'exportar_reportes'
  | 'gestionar_checklist'
  | 'gestionar_usuarios'
  | 'modificar_permisos'
  | 'ver_dashboard'
  | 'crear_sitio'
  | 'editar_sitio';

export const ROLES_PERMISOS: Record<UserRole, Record<PermisoNombre, boolean>> = {
  admin: {
    crear_auditoria: true, ejecutar_auditoria: true, ver_sus_auditorias: true, ver_todas_auditorias: true,
    exportar_reportes: true, gestionar_checklist: true, gestionar_usuarios: true, modificar_permisos: true,
    ver_dashboard: true, crear_sitio: true, editar_sitio: true,
  },
  auditor: {
    crear_auditoria: false, ejecutar_auditoria: true, ver_sus_auditorias: true, ver_todas_auditorias: false,
    exportar_reportes: false, gestionar_checklist: false, gestionar_usuarios: false, modificar_permisos: false,
    ver_dashboard: false, crear_sitio: false, editar_sitio: false,
  },
  gestor: {
    crear_auditoria: true, ejecutar_auditoria: true, ver_sus_auditorias: true, ver_todas_auditorias: true,
    exportar_reportes: true, gestionar_checklist: true, gestionar_usuarios: false, modificar_permisos: false,
    ver_dashboard: true, crear_sitio: true, editar_sitio: true,
  },
  lector: {
    crear_auditoria: false, ejecutar_auditoria: false, ver_sus_auditorias: false, ver_todas_auditorias: true,
    exportar_reportes: false, gestionar_checklist: false, gestionar_usuarios: false, modificar_permisos: false,
    ver_dashboard: true, crear_sitio: false, editar_sitio: false,
  },
  operador: {
    crear_auditoria: false, ejecutar_auditoria: false, ver_sus_auditorias: false, ver_todas_auditorias: false,
    exportar_reportes: false, gestionar_checklist: false, gestionar_usuarios: false, modificar_permisos: false,
    ver_dashboard: false, crear_sitio: false, editar_sitio: false,
  },
  coordinador: {
    crear_auditoria: true, ejecutar_auditoria: true, ver_sus_auditorias: true, ver_todas_auditorias: false,
    exportar_reportes: true, gestionar_checklist: true, gestionar_usuarios: false, modificar_permisos: false,
    ver_dashboard: true, crear_sitio: false, editar_sitio: false,
  },
};

export const PERMISOS_LABELS: Record<PermisoNombre, string> = {
  crear_auditoria: 'Crear auditoría', ejecutar_auditoria: 'Ejecutar auditoría',
  ver_sus_auditorias: 'Ver sus auditorías', ver_todas_auditorias: 'Ver todas las auditorías',
  exportar_reportes: 'Exportar reportes', gestionar_checklist: 'Gestionar checklist',
  gestionar_usuarios: 'Gestionar usuarios', modificar_permisos: 'Modificar permisos',
  ver_dashboard: 'Ver dashboard', crear_sitio: 'Crear sitio', editar_sitio: 'Editar sitio',
};

export interface CambioPermiso {
  permiso: string;
  label: string;
  antes: boolean;
  despues: boolean;
}

export interface PermisoHistorial {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  modificadoPorUid: string;
  modificadoPorNombre: string;
  cambios: CambioPermiso[];
  createdAt: any;
}

export interface CambioAuditoria {
  campo: string;
  preguntaTexto?: string;
  antes: any;
  despues: any;
}

export interface AuditHistorial {
  id: string;
  auditId: string;
  auditSiteName: string;
  modificadoPorUid: string;
  modificadoPorNombre: string;
  cambios: CambioAuditoria[];
  createdAt: any;
}

// ============================================================
// ETAPA 1: OFFLINE + GESTIÓN COMERCIO + ALERTAS
// ============================================================

export type TipoPreguntaGestion = 'texto' | 'multiple_choice' | 'numerica' | 'si_no' | 'foto' | 'fecha';

export interface OpcionMultipleChoice {
  id: string;
  texto: string;
}

export interface PreguntaGestion {
  id: string;
  texto: string;
  tipo: TipoPreguntaGestion;
  requerido: boolean;
  requiereFoto: boolean;
  requiereGeolocalizacion: boolean;
  requiereQR: boolean;
  opciones?: OpcionMultipleChoice[];
  instrucciones?: string;
  orden: number;
  grupo?: string;
}

export interface CuestionarioGestion {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: 'gestion_comercio';
  sitioIds: string[];
  preguntas: PreguntaGestion[];
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface OfflineAudit {
  id: string;
  siteId: string;
  siteName: string;
  questionnaireId: string;
  questionnaireName: string;
  tipoCuestionario: TipoCuestionario;
  auditorId: string;
  auditorEmail: string;
  auditorName: string;
  respuestas: {
    questionId: string;
    questionText: string;
    valor: string;
    comentario: string;
    photoURLs: string[];
    tipoPregunta?: TipoPreguntaGestion;
  }[];
  score: number;
  clasificacion: ClasificacionRiesgo;
  startedAt: string;
  completedAt: string;
  geolocalizacion?: Geolocalizacion | null;
  establecimiento?: string | null;
  observacionesGenerales?: string;
  sincronizado: boolean;
  createdAt: string;
}

export interface AlertaConfig {
  id: string;
  nombre: string;
  diasAntes: number[];
  tipo: 'vencimiento_cuestionario' | 'vencimiento_requisito' | 'score_bajo';
  activo: boolean;
  emailsDestino: string[];
  mensajePersonalizado?: string;
  createdAt: any;
  updatedAt: any;
}

// ============================================================
// ETAPA 2: ROLES + DOCUMENTACIÓN POR USUARIO
// ============================================================

export interface DocumentoUsuario {
  id: string;
  userId: string;
  nombre: string;
  tipo: 'dni' | 'certificado' | 'contrato' | 'otro';
  archivoURL: string;
  fechaVencimiento?: string | null;
  activo: boolean;
  createdAt: any;
  updatedAt: any;
}

// ============================================================
// ETAPA 4: FACTURACIÓN
// ============================================================

export type EstadoPago = 'al_dia' | 'alertado' | 'solo_lectura' | 'suspendido';
export type PlanEmpresa = 'basico' | 'empresa' | 'premium';

export interface Empresa {
  id: string;
  nombre: string;
  cuit: string;
  direccion?: string;
  telefono?: string;
  email: string;
  estadoPago: EstadoPago;
  fechaUltimoCalculo: any;
  plan: PlanEmpresa;
  usuariosAsignados: string[];
  createdAt: any;
  updatedAt: any;
}

export interface Factura {
  id: string;
  empresaId: string;
  numero: string;
  fechaEmision: string;
  fechaVencimiento: string;
  monto: number;
  estado: 'pendiente' | 'pagada' | 'vencida' | 'cancelada';
  cae: string | null;
  caeVencimiento: string | null;
  pdfUrl: string | null;
  puntoVenta: number | null;
  tipoComprobante: number | null;
  createdAt: any;
  updatedAt: any;
}

export interface FacturacionConfig {
  empresaId: string;
  emailsDestino: string[];
  diasAlerta: number[];
  suspensionAutomatica: boolean;
  arcaHabilitado: boolean;
  fechaLimiteManual: string | null;
  updatedAt: any;
}

export interface HistorialEstado {
  id: string;
  empresaId: string;
  estadoAnterior: EstadoPago;
  estadoNuevo: EstadoPago;
  motivo: string;
  timestamp: any;
  origen: 'cron' | 'admin_manual';
}