const API_KEY = "AIzaSyAAmtQ-UVz5xCa7xBsql-74JAOPT5RlqN4";

export const analyzeAuditWithGemini = async (auditData: any) => {
  const prompt = `Sos un auditor experto en normas de calidad y seguridad alimentaria. Analizá esta auditoría y devolvé SOLO un JSON válido, sin comillas extra, sin saltos de línea raros, sin markdown. Formato exacto:

{"executiveSummary":"Resumen breve","recurrenceAnalysis":"Patrones detectados","rootCauseAnalysis":"Análisis 5 Porqués: 1. ¿Por qué? ... 2. ¿Por qué? ... 3. ¿Por qué? ... 4. ¿Por qué? ... 5. ¿Por qué? ...","riskLevel":"Medio","suggestedActionPlans":[{"itemId":"x","itemText":"x","detectedIssue":"x","recurrenceCount":1,"correctiveAction":"x","preventiveAction":"x","responsible":"Supervisor","termDays":7}]}

Auditoría: Planta ${auditData.siteName}, Sector ${auditData.area}, Score ${auditData.score}%. Respuestas: ${JSON.stringify(auditData.answers)}`;

  try {
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

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error('Respuesta vacía de Gemini');
      return null;
    }

    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (err) {
    console.error('Error en Gemini:', err);
    return null;
  }
};