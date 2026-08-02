/** The approved wordmark lockups. Never re-type or redraw the wordmark. */
export interface LogoProps {
  /** green on light grounds, chartreuse on green/photo, cream on dark photography. */
  tone?: "green" | "chartreuse" | "cream";
  /** Rendered width in px. Minimum 96. */
  width?: number;
  /** Relative path to this design system's assets/ folder. */
  assetBase?: string;
  style?: React.CSSProperties;
}
export declare function Logo(props: LogoProps): JSX.Element;

/** One of the three approved app-icon colourways. */
export interface AppIconProps {
  colorway?: "green" | "chartreuse" | "purple";
  size?: number;
  radius?: string;
  assetBase?: string;
  style?: React.CSSProperties;
}
export declare function AppIcon(props: AppIconProps): JSX.Element;
