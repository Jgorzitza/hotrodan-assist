import { 
  Button, 
  ButtonGroup, 
  Select, 
  InlineStack, 
  Text,
  Card,
  BlockStack
} from "@shopify/polaris";
import { useState, useEffect, useCallback } from "react";
import { 
  Theme, 
  initializeTheme, 
  toggleTheme, 
  getThemeIcon, 
  getThemeLabel,
  getStoredTheme,
  getSystemTheme
} from "~/lib/theme";

type ThemeToggleProps = {
  onThemeChange?: (theme: Theme) => void;
  showLabel?: boolean;
  variant?: "button" | "select" | "compact";
};

export function ThemeToggle({ 
  onThemeChange, 
  showLabel = true,
  variant = "button"
}: ThemeToggleProps) {
  const [currentTheme, setCurrentTheme] = useState<Theme>("light");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const theme = initializeTheme();
    setCurrentTheme(theme);
    setIsInitialized(true);
  }, []);

  const handleThemeChange = useCallback((theme: Theme) => {
    setCurrentTheme(theme);
    onThemeChange?.(theme);
  }, [onThemeChange]);

  const handleToggle = useCallback(() => {
    const newTheme = toggleTheme(currentTheme);
    handleThemeChange(newTheme);
  }, [currentTheme, handleThemeChange]);

  const handleSelectChange = useCallback((value: string) => {
    const theme = value as Theme;
    handleThemeChange(theme);
  }, [handleThemeChange]);

  if (!isInitialized) {
    return null;
  }

  const themeOptions = [
    { label: `${getThemeIcon("light")} ${getThemeLabel("light")}`, value: "light" },
    { label: `${getThemeIcon("dark")} ${getThemeLabel("dark")}`, value: "dark" },
    { label: `${getThemeIcon("auto")} ${getThemeLabel("auto")}`, value: "auto" },
  ];

  if (variant === "select") {
    return (
      <Select
        label={showLabel ? "Theme" : undefined}
        labelHidden={!showLabel}
        options={themeOptions}
        value={currentTheme}
        onChange={handleSelectChange}
      />
    );
  }

  if (variant === "compact") {
    return (
      <Button
        onClick={handleToggle}
        variant="plain"
        size="micro"
        accessibilityLabel={`Switch to ${currentTheme === "light" ? "dark" : "light"} theme`}
      >
        {getThemeIcon(currentTheme)}
      </Button>
    );
  }

  return (
    <Card>
      <BlockStack gap="200">
        {showLabel && (
          <Text as="h3" variant="headingSm">
            Theme Settings
          </Text>
        )}
        
        <InlineStack gap="200" blockAlign="center">
          <Text as="span" variant="bodySm">
            Current: {getThemeLabel(currentTheme)} {getThemeIcon(currentTheme)}
          </Text>
          
          <ButtonGroup>
            <Button
              onClick={handleToggle}
              variant="primary"
            >
              Switch to {currentTheme === "light" ? "Dark" : "Light"}
            </Button>
          </ButtonGroup>
        </InlineStack>
        
        <Select
          label="Theme Preference"
          options={themeOptions}
          value={currentTheme}
          onChange={handleSelectChange}
        />
      </BlockStack>
    </Card>
  );
}

export function ThemeProvider({ 
  children, 
  defaultTheme = "light" 
}: { 
  children: React.ReactNode; 
  defaultTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialTheme = initializeTheme();
    setTheme(initialTheme);
    setIsInitialized(true);
  }, []);

  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, []);

  if (!isInitialized) {
    return <>{children}</>;
  }

  return (
    <div data-theme={theme}>
      <ThemeToggle onThemeChange={handleThemeChange} variant="compact" showLabel={false} />
      {children}
    </div>
  );
}

export function useTheme(): {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  isLight: boolean;
} {
  const [theme, setTheme] = useState<Theme>(getStoredTheme());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialTheme = initializeTheme();
    setTheme(initialTheme);
    setIsInitialized(true);
  }, []);

  const handleToggle = useCallback(() => {
    const newTheme = toggleTheme(theme);
    setTheme(newTheme);
  }, [theme]);

  const handleSetTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, []);

  return {
    theme: isInitialized ? theme : "light",
    toggleTheme: handleToggle,
    setTheme: handleSetTheme,
    isDark: theme === "dark",
    isLight: theme === "light",
  };
}
