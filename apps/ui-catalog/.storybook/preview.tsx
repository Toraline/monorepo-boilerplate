import { useEffect, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import type { Decorator, Preview } from "@storybook/react-vite";
import { useGlobals } from "storybook/preview-api";
import { defaultTheme, resolveProjectTheme, themes } from "@repo/ui/theme";
import { THEME_ATTRIBUTE } from "@toraline.tech/tokens";
import { ThemeProvider, useTheme } from "@toraline.tech/ui/theme";

// Tailwind CSS 4, the tokens of the library, the theme of this project and
// the fonts.
import "./preview.css";

/**
 * Tells the toolbar when the theme changed inside a story, for example after
 * a press on ThemeToggle. Without it the toolbar would still name the old theme.
 */
function ToolbarSync({
  toolbarTheme,
  onThemeChange,
}: {
  toolbarTheme: string;
  onThemeChange: (theme: string) => void;
}) {
  const { theme } = useTheme();

  useEffect(() => {
    if (theme !== toolbarTheme) {
      onThemeChange(theme);
    }
  }, [theme, toolbarTheme, onThemeChange]);

  return null;
}

/**
 * Shows a story in one theme, the way the root layout of an app does: the
 * attribute data-theme on <html>, and ThemeProvider around the story.
 */
function ThemeFrame({
  theme,
  onThemeChange,
  children,
}: {
  theme: string;
  onThemeChange: (theme: string) => void;
  children: ReactNode;
}) {
  // A layout effect runs before the effect of ThemeProvider, which reads the
  // attribute. So the provider starts with the theme of the toolbar.
  useLayoutEffect(() => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
  }, [theme]);

  return (
    // "key" makes a new provider when the toolbar changes the theme, because
    // the provider reads "initialTheme" only once.
    <ThemeProvider key={theme} themes={themes} initialTheme={theme}>
      <ToolbarSync toolbarTheme={theme} onThemeChange={onThemeChange} />
      {children}
    </ThemeProvider>
  );
}

/** A decorator is a function that wraps every story. This one applies the theme of the toolbar. */
const withTheme: Decorator = (Story, context) => {
  // "useGlobals" is a hook of Storybook, not of React: Storybook runs it
  // inside a decorator. ESLint knows only the rule for React hooks.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [, updateGlobals] = useGlobals();
  const theme = resolveProjectTheme(
    context.globals.theme as string | undefined,
  );

  return (
    <ThemeFrame
      theme={theme}
      onThemeChange={(nextTheme) => updateGlobals({ theme: nextTheme })}
    >
      <Story />
    </ThemeFrame>
  );
};

/** The configuration of every story: the theme control of the toolbar, and the decorator. */
const preview: Preview = {
  // A global is a value that every story shares. "theme" is the name of the
  // current theme. The list is the list of themes of packages/ui, so a theme
  // that the project adds appears in the toolbar with no change here.
  globalTypes: {
    theme: {
      description: "The theme of every story",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: themes.map((theme) => ({
          value: theme,
          title: `Theme: ${theme}`,
        })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: defaultTheme,
  },
  decorators: [withTheme],
  // Every component gets a documentation page, built from its stories and its props.
  tags: ["autodocs"],
  parameters: {
    // The space around a story.
    layout: "padded",
    options: {
      // The order of the sidebar.
      storySort: {
        order: ["Theme", "Library", "Project"],
      },
    },
  },
};

export default preview;
