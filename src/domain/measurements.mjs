const units = { m: 1, ft: 0.3048, cm: 0.01, mm: 0.001 };
export function toMetres(height) {
  if (!height || typeof height.value !== 'number' || !Number.isFinite(height.value) || height.value <= 0) return null;
  const factor = units[height.unit];
  return factor ? height.value * factor : null;
}
export function formatMetres(value, approximate = false, converted = false, language = 'zh-CN') {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return language === 'en' ? 'Needs checking' : language === 'fr' ? 'À vérifier' : '待核对';
  const digits = value < 1 ? 2 : converted ? 1 : 2;
  return `${approximate || converted ? language !== 'zh-CN' ? '≈ ' : '约 ' : ''}${new Intl.NumberFormat(language, { maximumFractionDigits: digits }).format(value)} m`;
}
export function metricCopy(text, language = 'zh-CN') {
  return text.replace(/(?:约\s*)?(\d+(?:\.\d+)?)\s*(?:英尺|feet\b|ft\b)/gi, (_match, value) =>
    language !== 'zh-CN' ? formatMetres(toMetres({ value: Number(value), unit: 'ft' }), true, true, language) :
      formatMetres(toMetres({ value: Number(value), unit: 'ft' }), true, true).replace(/ m$/, '米').replace('约 ', '约'));
}
