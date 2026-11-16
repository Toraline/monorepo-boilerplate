import tailwindcss from "@tailwindcss/postcss";
import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

type BuildLogLevel = "info" | "debug" | "warn";
type BuildLog = { code?: string };

/**
 * The main configuration of Storybook: which files are stories, which addons
 * are on, and how Vite builds the catalog.
 */
const config: StorybookConfig = {
  framework: "@storybook/react-vite",

  // A story file shows one component. An MDX file is a documentation page.
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.tsx"],

  // An addon is a plugin of Storybook. addon-docs builds the documentation
  // pages and the table of props of each component.
  addons: ["@storybook/addon-docs"],

  // The catalog has its own theme control in the toolbar (see preview.tsx).
  // Storybook's own background control would only change the color behind a
  // story, not the theme, so it is off.
  features: {
    backgrounds: false,
  },

  core: {
    // Storybook sends no usage data, and does not ask the network for news.
    disableTelemetry: true,
    disableWhatsNewNotifications: true,
  },

  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      css: {
        // Tailwind CSS 4 builds the classes of the components and of the
        // stories, as it does in apps/web and apps/internal.
        postcss: {
          plugins: [tailwindcss()],
        },
      },
      build: {
        rollupOptions: {
          // The build warns that a "use client" line may be lost when files
          // are joined. The line is for Next.js. The catalog runs only in the
          // browser, so it does not need the line.
          onLog(
            level: BuildLogLevel,
            log: BuildLog,
            defaultHandler: (level: BuildLogLevel, log: BuildLog) => void,
          ) {
            if (log.code !== "MODULE_LEVEL_DIRECTIVE") {
              defaultHandler(level, log);
            }
          },
        },
      },
    }),
};

export default config;
