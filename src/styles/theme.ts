// Theme tokens for Stageheart UI
export const theme = {
  colors: {
    primary: '#6366f1', // Indigo
    secondary: '#8b5cf6', // Violet
    background: '#ffffff',
    surface: '#f8fafc',
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      muted: '#64748b'
    },
    border: '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  },
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '1rem',     // 16px
    md: '1.5rem',   // 24px
    lg: '2rem',     // 32px
    xl: '3rem'      // 48px
  },
  typography: {
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem'   // 24px
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  radius: {
    sm: '0.25rem',  // 4px
    md: '0.5rem',   // 8px
    lg: '0.75rem'   // 12px
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
  }
} as const;

export type Theme = typeof theme;