import "styled-components";
import type { RollTrackerTheme } from "./theme.js";

declare module "styled-components" {
  /** `props.theme` in styled components is the module's theme. */
  export interface DefaultTheme extends RollTrackerTheme {}
}
