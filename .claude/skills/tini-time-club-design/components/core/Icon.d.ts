/** Brand icon. Renders a Lucide glyph masked to currentColor. */
export interface IconProps {
  /** Lucide icon name, kebab-case (e.g. "martini", "map-pin", "heart"). */
  name: string;
  /** Square size in px. 24 default, 20 in dense rows, 28 in the tab bar. */
  size?: number;
  /** CSS color for the glyph. Defaults to currentColor. */
  color?: string;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element;
