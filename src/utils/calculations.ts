export const calculateScore = (answers: Record<string, { status: string }>): number => {
  const items = Object.values(answers);
  const applicableItems = items.filter(a => a.status !== 'NA');
  if (applicableItems.length === 0) return 0;
  const points = applicableItems.reduce((sum, a) => {
    if (a.status === 'C') return sum + 1;
    if (a.status === 'CP') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / applicableItems.length) * 100);
};

export const calculateRiskLevel = (score: number, hasCritical: boolean): string => {
  if (hasCritical || score < 50) return 'Alto';
  if (score < 75) return 'Medio';
  return 'Bajo';
};

export const getStandardColor = (name: string): string => {
  const map: Record<string, string> = {
    'IRAM 14201': 'bg-sky-50 text-sky-700 border-sky-200',
    'IRAM 14301': 'bg-violet-50 text-violet-700 border-violet-200',
    'ISO 9001': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'ISO 45001': 'bg-red-50 text-red-700 border-red-200',
  };
  return map[name] || 'bg-gray-50 text-gray-700 border-gray-200';
};