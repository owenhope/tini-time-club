/** Top app bar. `glass` for scrolled state over content, `ink` on green screens. */
export interface AppBarAction { icon: string; label: string; onClick?: () => void }
export interface AppBarProps {
  title?: string;
  /** Show the wordmark instead of a title (home screens). */
  showLogo?: boolean;
  leadingIcon?: string;
  onLeading?: () => void;
  actions?: AppBarAction[];
  tone?: "light" | "glass" | "ink";
  assetBase?: string;
  style?: React.CSSProperties;
}
export declare function AppBar(props: AppBarProps): JSX.Element;
