export function volumeToDb(volume: number) {
  if (volume <= 0) return '-∞dB'
  if (volume >= 1) return '0dB'
  return `${Math.round(20 * Math.log10(volume))}dB`
}
