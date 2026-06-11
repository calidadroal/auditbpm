export interface AuditAnswer {
  status: 'C' | 'CP' | 'NC' | 'NA';
  comment: string;
  photo: string | null;
}

export interface AuditRecord {
  id: string;
  date: string;
  auditorName: string;
  area: string;
  siteId: string;
  siteName: string;
  questionnaireId: string;
  score: number;
  isSubmitted: boolean;
  signature?: string;
  signatureName?: string;
  hasCriticalFailures?: boolean;
}

export interface NotificationRecord {
  id: string;
  date: string;
  area: string;
  auditorName: string;
  itemName: string;
  comment: string;
  read: boolean;
}

export interface Site {
  id: string;
  name: string;
  description: string;
  sectors: string[];
}

export interface Questionnaire {
  id: string;
  name: string;
  description: string;
  items: any[];
  isCustom?: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'auditor' | 'lector';
}