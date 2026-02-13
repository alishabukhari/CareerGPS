export const theme = {
  light: {
    bg: "#F7F9FC",
    bgSoft: "#D6E6F3",
    bgCard: "#FFFFFF",
    primary: "#0F52BA",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#64748B",
    borderSoft: "#CBD5E1",
  },
  dark: {
    bg: "#000026",
    bgSoft: "#0B1C3A",
    bgCard: "#07122B",
    primary: "#4F83FF",
    textPrimary: "#FFFFFF",
    textSecondary: "#CBD5E1",
    textMuted: "#94A3B8",
    borderSoft: "#1E3A8A",
  },

    experimental: {
    bg: "#000026",          // Deep Navy
    bgCard: "#D6E6F3",      // Ice Blue
    bgSoft: "#D6E6F3",      // Ice Blue
    primary: "#0F52BA",    // Sapphire
    accent: "#A6C5D7",     // Powder Blue
    textPrimary: "#000026", // Deep Navy text
    textSecondary: "#0F172A",
    textMuted: "#1E293B",
    borderSoft: "#A6C5D7",
    progressTrack: "#1E3A8A",
    progressFill: "#A6C5D7",
  },
};

// for now (later connect to a toggle)
const currentTheme = theme.light;