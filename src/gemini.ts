const API_KEY = "AIzaSyAAmtQ-UVz5xCa7xBsql-74JAOPT5RlqN4";

export const analyzeAuditWithGemini = async (auditData: any) => {
  const prompt = `Sos un auditor experto en normas IRAM 14201, IRAM 14301, ISO 9001 e ISO 45001. Analizá esta auditoría de gastronomía y devolvé SOLO un JSON válido (sin texto extra) con este formato exacto:

{
  "executiveSummary": "Resumen ejecutivo del desempeño...",
  "recurrenceAnalysis": "Análisis de patrones recurrentes...",
  "rootCauseAnalysis": "Análisis de causa raíz usando metodología de los 5 Porqués...",
  "riskLevel": "Alto|Medio|Bajo",
  "suggestedActionPlans": [
    {
      "itemId": "ID del ítem",
      "itemText": "Texto del ítem",
      "detectedIssue": "Problema detectado",
      "recurrenceCount": 1,
      "correctiveAction": "Acción correctiva inmediata",
      "preventiveAction": "Acción preventiva sistémica",
      "responsible": "Cargo responsable",
      "termDays": 7
    }
  ]
}

Datos de la auditoría:
- Planta: ${auditData.siteName}
- Sector: ${auditData.area}
- Inspector: ${auditData.auditorName}
- Puntuación: ${auditData.score}%
- Preguntas y respuestas: ${JSON.stringify(auditData.answers)}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  
  // Limpiar el JSON de posibles marcas de código
  const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleanText);
};