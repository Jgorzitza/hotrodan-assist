export type Theme = "light" | "dark" | "auto";

export type ColorToken = {
  value: string;
  contrast: "AA" | "AAA";
  description: string;
};

export type ThemeTokens = {
  // Background colors
  background: {
    primary: ColorToken;
    secondary: ColorToken;
    tertiary: ColorToken;
    elevated: ColorToken;
  };
  
  // Text colors
  text: {
    primary: ColorToken;
    secondary: ColorToken;
    tertiary: ColorToken;
    inverse: ColorToken;
  };
  
  // Border colors
  border: {
    primary: ColorToken;
    secondary: ColorToken;
    focus: ColorToken;
  };
  
  // Status colors
  status: {
    success: ColorToken;
    warning: ColorToken;
    error: ColorToken;
    info: ColorToken;
  };
  
  // Interactive colors
  interactive: {
    primary: ColorToken;
    secondary: ColorToken;
    hover: ColorToken;
    active: ColorToken;
    disabled: ColorToken;
  };
  
  // Chart colors (accessible palette)
  chart: {
    primary: ColorToken;
    secondary: ColorToken;
    tertiary: ColorToken;
    quaternary: ColorToken;
    quinary: ColorToken;
  };
};

// Light theme tokens (WCAG AA compliant)
const lightThemeTokens: ThemeTokens = {
  background: {
    primary: {
      value: "#ffffff",
      contrast: "AAA",
      description: "Primary background color"
    },
    secondary: {
      value: "#f6f6f7",
      contrast: "AAA",
      description: "Secondary background color"
    },
    tertiary: {
      value: "#e1e3e5",
      contrast: "AAA",
      description: "Tertiary background color"
    },
    elevated: {
      value: "#ffffff",
      contrast: "AAA",
      description: "Elevated surface background"
    }
  },
  text: {
    primary: {
      value: "#202223",
      contrast: "AAA",
      description: "Primary text color"
    },
    secondary: {
      value: "#6d7175",
      contrast: "AA",
      description: "Secondary text color"
    },
    tertiary: {
      value: "#8c9196",
      contrast: "AA",
      description: "Tertiary text color"
    },
    inverse: {
      value: "#ffffff",
      contrast: "AAA",
      description: "Inverse text color"
    }
  },
  border: {
    primary: {
      value: "#d1d3d4",
      contrast: "AA",
      description: "Primary border color"
    },
    secondary: {
      value: "#e1e3e5",
      contrast: "AA",
      description: "Secondary border color"
    },
    focus: {
      value: "#008060",
      contrast: "AA",
      description: "Focus border color"
    }
  },
  status: {
    success: {
      value: "#008060",
      contrast: "AA",
      description: "Success status color"
    },
    warning: {
      value: "#b98900",
      contrast: "AA",
      description: "Warning status color"
    },
    error: {
      value: "#d72c0d",
      contrast: "AA",
      description: "Error status color"
    },
    info: {
      value: "#0969da",
      contrast: "AA",
      description: "Info status color"
    }
  },
  interactive: {
    primary: {
      value: "#008060",
      contrast: "AA",
      description: "Primary interactive color"
    },
    secondary: {
      value: "#6d7175",
      contrast: "AA",
      description: "Secondary interactive color"
    },
    hover: {
      value: "#004c3f",
      contrast: "AAA",
      description: "Hover state color"
    },
    active: {
      value: "#002e26",
      contrast: "AAA",
      description: "Active state color"
    },
    disabled: {
      value: "#8c9196",
      contrast: "AA",
      description: "Disabled state color"
    }
  },
  chart: {
    primary: {
      value: "#008060",
      contrast: "AA",
      description: "Primary chart color"
    },
    secondary: {
      value: "#0969da",
      contrast: "AA",
      description: "Secondary chart color"
    },
    tertiary: {
      value: "#b98900",
      contrast: "AA",
      description: "Tertiary chart color"
    },
    quaternary: {
      value: "#d72c0d",
      contrast: "AA",
      description: "Quaternary chart color"
    },
    quinary: {
      value: "#6d7175",
      contrast: "AA",
      description: "Quinary chart color"
    }
  }
};

// Dark theme tokens (WCAG AA compliant)
const darkThemeTokens: ThemeTokens = {
  background: {
    primary: {
      value: "#1a1a1a",
      contrast: "AAA",
      description: "Primary background color"
    },
    secondary: {
      value: "#2d2d2d",
      contrast: "AAA",
      description: "Secondary background color"
    },
    tertiary: {
      value: "#404040",
      contrast: "AAA",
      description: "Tertiary background color"
    },
    elevated: {
      value: "#333333",
      contrast: "AAA",
      description: "Elevated surface background"
    }
  },
  text: {
    primary: {
      value: "#ffffff",
      contrast: "AAA",
      description: "Primary text color"
    },
    secondary: {
      value: "#b3b3b3",
      contrast: "AA",
      description: "Secondary text color"
    },
    tertiary: {
      value: "#8c9196",
      contrast: "AA",
      description: "Tertiary text color"
    },
    inverse: {
      value: "#1a1a1a",
      contrast: "AAA",
      description: "Inverse text color"
    }
  },
  border: {
    primary: {
      value: "#404040",
      contrast: "AA",
      description: "Primary border color"
    },
    secondary: {
      value: "#2d2d2d",
      contrast: "AA",
      description: "Secondary border color"
    },
    focus: {
      value: "#00d4aa",
      contrast: "AA",
      description: "Focus border color"
    }
  },
  status: {
    success: {
      value: "#00d4aa",
      contrast: "AA",
      description: "Success status color"
    },
    warning: {
      value: "#ffb800",
      contrast: "AA",
      description: "Warning status color"
    },
    error: {
      value: "#ff6b6b",
      contrast: "AA",
      description: "Error status color"
    },
    info: {
      value: "#4dabf7",
      contrast: "AA",
      description: "Info status color"
    }
  },
  interactive: {
    primary: {
      value: "#00d4aa",
      contrast: "AA",
      description: "Primary interactive color"
    },
    secondary: {
      value: "#b3b3b3",
      contrast: "AA",
      description: "Secondary interactive color"
    },
    hover: {
      value: "#00b894",
      contrast: "AAA",
      description: "Hover state color"
    },
    active: {
      value: "#00a085",
      contrast: "AAA",
      description: "Active state color"
    },
    disabled: {
      value: "#8c9196",
      contrast: "AA",
      description: "Disabled state color"
    }
  },
  chart: {
    primary: {
      value: "#00d4aa",
      contrast: "AA",
      description: "Primary chart color"
    },
    secondary: {
      value: "#4dabf7",
      contrast: "AA",
      description: "Secondary chart color"
    },
    tertiary: {
      value: "#ffb800",
      contrast: "AA",
      description: "Tertiary chart color"
    },
    quaternary: {
      value: "#ff6b6b",
      contrast: "AA",
      description: "Quaternary chart color"
    },
    quinary: {
      value: "#b3b3b3",
      contrast: "AA",
      description: "Quinary chart color"
    }
  }
};

export function getThemeTokens(theme: Theme): ThemeTokens {
  if (theme === "auto") {
    // Check system preference
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return darkThemeTokens;
    }
    return lightThemeTokens;
  }
  
  return theme === "dark" ? darkThemeTokens : lightThemeTokens;
}

export function getCSSVariables(theme: Theme): Record<string, string> {
  const tokens = getThemeTokens(theme);
  const variables: Record<string, string> = {};
  
  // Convert tokens to CSS variables
  Object.entries(tokens).forEach(([category, categoryTokens]) => {
    Object.entries(categoryTokens).forEach(([key, token]) => {
      variables[`--color-${category}-${key}`] = token.value;
    });
  });
  
  return variables;
}

export function applyTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  
  const variables = getCSSVariables(theme);
  const root = document.documentElement;
  
  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // Set theme attribute for CSS selectors
  root.setAttribute("data-theme", theme);
  
  // Store theme preference
  localStorage.setItem("dashboard-theme", theme);
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  
  const stored = localStorage.getItem("dashboard-theme");
  return (stored as Theme) || "light";
}

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function initializeTheme(): Theme {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}

export function toggleTheme(currentTheme: Theme): Theme {
  const newTheme = currentTheme === "light" ? "dark" : "light";
  applyTheme(newTheme);
  return newTheme;
}

export function getThemeIcon(theme: Theme): string {
  switch (theme) {
    case "light": return "☀️";
    case "dark": return "🌙";
    case "auto": return "🔄";
    default: return "☀️";
  }
}

export function getThemeLabel(theme: Theme): string {
  switch (theme) {
    case "light": return "Light";
    case "dark": return "Dark";
    case "auto": return "Auto";
    default: return "Light";
  }
}
