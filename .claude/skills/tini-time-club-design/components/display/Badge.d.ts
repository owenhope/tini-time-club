/** Small uppercase status pill — ranks, flags, categories. */
export interface BadgeProps {
  children?: React.ReactNode;
  tone?: "green" | "chartreuse" | "purple" | "hot" | "outline" | "muted";
  /** Lucide icon name shown before the label. */
  icon?: string;
  style?: React.CSSProperties;
}
export declare function Badge(props: BadgeProps): JSX.Element;
