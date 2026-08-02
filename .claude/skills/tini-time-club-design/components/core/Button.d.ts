/**
 * Primary action control. Always pill-shaped; label is sentence case, 1-3 words.
 * @startingPoint section="Core" subtitle="Buttons, icon buttons and chips" viewport="700x220"
 */
export interface ButtonProps {
  children?: React.ReactNode;
  /** primary = green fill. highlight = chartreuse on light. onInk = chartreuse on a green surface. */
  tone?: "primary" | "highlight" | "secondary" | "ghost" | "onInk";
  size?: "sm" | "md" | "lg";
  /** Lucide icon name rendered before the label. */
  icon?: string;
  /** Lucide icon name rendered after the label. */
  iconAfter?: string;
  block?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
