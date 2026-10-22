/**
 * WEmanipur Design System — Color Palette
 */
export const Colors = {
  // Brand
  primary: '#00875A',
  primaryDark: '#006644',
  primaryLight: '#E8F5EF',
  accent: '#E84C6D',
  accentLight: '#FDE8ED',

  // Backgrounds
  background: '#F8FAF9',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  // Text
  textPrimary: '#1A1A1A',
  textDark: '#002D1F',
  textSecondary: '#666666',
  textLight: '#999999',
  textOnPrimary: '#FFFFFF',

  // UI
  border: '#E0E0E0',
  divider: '#F0F0F0',
  inactive: '#D9E8E0',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Status
  success: '#28A745',
  warning: '#FFC107',
  error: '#DC3545',
  info: '#17A2B8',

  // Specific
  dotActive: '#00875A',
  dotInactive: '#B6DFC9',
  tabActive: '#00875A',
  tabInactive: '#999999',
} as const;

export type ColorKey = keyof typeof Colors;
