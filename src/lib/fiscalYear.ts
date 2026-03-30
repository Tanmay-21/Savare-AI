export function getFiscalYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed; 3 = April

  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}
