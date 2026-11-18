export const COLORS = {
  bg: '#090909',
  bgSecondary: '#111111',
  sidebar: '#0C0C0C',
  card: '#151515',
  cardElevated: '#1B1B1B',
  border: '#292521',
  bronze: '#D99A4E',
  gold: '#F2B968',
  text: '#F5F1EB',
  muted: '#A5A09A',
  success: '#16C784',
  danger: '#EF5350',
  info: '#4299E1',
  purple: '#A66BEB',
} as const;

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}
