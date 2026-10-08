import { MD3LightTheme } from "react-native-paper";

export const palette = {
  forest: "#203040",
  terracotta: "#009696",
  cream: "#F7F8FA",
  paper: "#FFFFFF",
  sage: "#E5F5F5",
  apricot: "#EAF7F7",
  ink: "#203040",
  muted: "#667085",
  line: "#D9DEE5",
};

export const tavolaTheme = {
  ...MD3LightTheme,
  roundness: 1.5,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.forest, onPrimary: "#FFFFFF", primaryContainer: palette.sage, onPrimaryContainer: palette.forest,
    secondary: "#334E68", onSecondary: "#FFFFFF", secondaryContainer: "#DDEFF0", onSecondaryContainer: "#203040",
    tertiary: palette.terracotta, background: palette.cream, surface: palette.paper, surfaceVariant: "#F1F3F5",
    onSurface: palette.ink, onSurfaceVariant: palette.muted, outline: "#98A2B3", outlineVariant: palette.line,
  },
};

export type TavolaTheme = typeof tavolaTheme;
