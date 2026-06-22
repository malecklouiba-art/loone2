// Échelle base 4pt + rayons. Voir docs/03-design-system.md §4.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenH: 16, // marge horizontale écran
} as const;

export const radius = {
  field: 10,
  card: 12,
  button: 12,
  pill: 999,
} as const;

export const layout = {
  rowMinHeight: 44,
  touchTarget: 44,
  tabBarHeight: 84,
  micSize: 64,
} as const;
