/** WMO Weather interpretation codes (Open-Meteo). Returns short label + emoji. */
export function weatherCodeDisplay(code) {
  const c = Number(code);
  if (!Number.isFinite(c)) return { emoji: '—', label: 'Unknown' };

  if (c === 0) return { emoji: '☀️', label: 'Clear' };
  if (c <= 3) return { emoji: '🌤️', label: 'Mainly clear' };
  if (c <= 48) return { emoji: '☁️', label: 'Foggy' };
  if (c <= 57) return { emoji: '🌫️', label: 'Drizzle' };
  if (c <= 67) return { emoji: '🌧️', label: 'Rain' };
  if (c <= 77) return { emoji: '🌨️', label: 'Snow' };
  if (c <= 82) return { emoji: '🌧️', label: 'Rain showers' };
  if (c <= 86) return { emoji: '❄️', label: 'Snow showers' };
  if (c <= 99) return { emoji: '⛈️', label: 'Thunderstorm' };

  return { emoji: '—', label: 'Unknown' };
}
