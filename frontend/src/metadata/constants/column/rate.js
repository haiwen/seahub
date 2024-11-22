export const RATE_COLORS = [
  '#ff9800',
  '#FFB600',
  '#E91E63',
  '#EB00B1',
  '#7626FD',
  '#1DDD1D',
  '#02C0FF',
  '#00C9C7',
  '#1688FC',
  '#656463'
];

export const RATE_MAX_NUMBER = [
  { name: 1 },
  { name: 2 },
  { name: 3 },
  { name: 4 },
  { name: 5 },
  { name: 6 },
  { name: 7 },
  { name: 8 },
  { name: 9 },
  { name: 10 },
];

export const RATE_TYPES = [
  'rate',
  'like',
  'praise',
  'flag'
];

export const DEFAULT_RATE_DATA = {
  color: RATE_COLORS[0],
  max: 5,
  type: RATE_TYPES[0],
};
