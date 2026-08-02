/** Circular icon-only control. `label` is required for accessibility. */
export interface IconButtonProps {
  icon: string;
  label: string;
  tone?: "ghost" | "primary" | "secondary" | "onInk" | "glass";
  size?: "sm" | "md" | "lg";
  /** Selected state — chartreuse fill. */
  active?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
