import type { Root } from "react-dom/client";
import { ThemeProvider } from "styled-components";
import { rollTrackerTheme } from "../styles/theme.js";
import { RollTrackerRoot, type RollTrackerRootProps } from "./RollTrackerRoot.js";

/** Render (or re-render) the tracker window's content into its React root. */
export function renderRollTracker(root: Root, props: RollTrackerRootProps): void {
  root.render(
    <ThemeProvider theme={rollTrackerTheme}>
      <RollTrackerRoot {...props} />
    </ThemeProvider>
  );
}
