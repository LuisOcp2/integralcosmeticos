export const tokens = {
  color: {
    bgPage: '#f3eff1',
    bgCard: '#ffffff',
    bgSoft: '#f6f2f4',
    bgDark: '#2a1709',
    border: '#eadfe3',
    borderSoft: '#f1edef',
    textStrong: '#2e1b0c',
    textMuted: '#735946',
    textSoft: '#785d4a',
    primary: '#85264b',
    accent: '#a43e63',
    accentSoft: '#fba9e5',
    success: '#2e7d32',
    successBg: '#e8f5e9',
    warning: '#e65100',
    warningBg: '#fff3e0',
    danger: '#ba1a1a',
    dangerBg: '#ffdad6',
    info: '#3949ab',
    infoBg: '#e8eaf6',
  },
  radius: {
    lg: '12px',
    xl: '16px',
    xxl: '20px',
  },
} as const;

export type UiTokens = typeof tokens;
