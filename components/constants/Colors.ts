// constants/Colors.ts

const palette = {
  primary: '#0A2540',
  secondary: '#D4AF37',
  tertiary: '#381D00',
  neutral: '#777779',
  

  bgLight: '#F4F4F5',   
  bgWhite: '#FFFFFF',    
  textDark: '#0A2540',    
  textMuted: '#777779',  
  inverted: '#27272A',   
  danger: '#AF1D1D',     
};

export const Colors = {
  light: {
    // Rôles principaux
    primary: palette.primary,
    secondary: palette.secondary,
    tertiary: palette.tertiary,
    neutral: palette.neutral,

    // Éléments d'interface (UI)
    background: palette.bgWhite,
    cardBackground: palette.bgLight,
    border: '#E4E4E7',
    
    // Typographie
    text: palette.textDark,
    textMuted: palette.textMuted,
    textInverted: palette.bgWhite,

    // Boutons et Actions spécifiques
    buttonPrimaryBg: palette.primary,
    buttonPrimaryText: palette.bgWhite,
    buttonSecondaryBg: 'transparent',
    buttonSecondaryText: palette.primary,
    buttonInvertedBg: palette.inverted,
    buttonInvertedText: palette.bgWhite,
    
    // Utilitaires
    danger: palette.danger,
  },
  // Tu pourras dupliquer et adapter ici pour un mode 'dark' plus tard si besoin
};