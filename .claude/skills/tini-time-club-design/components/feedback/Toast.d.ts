/** Transient confirmation pill. This is one of the two places the spring easing is allowed. */
export interface ToastProps {
  /** Playful, 3-8 words. e.g. "Logged. That's 129 tinis 🍸" */
  message: React.ReactNode;
  icon?: string;
  tone?: "ink" | "chartreuse";
  style?: React.CSSProperties;
}
export declare function Toast(props: ToastProps): JSX.Element;
