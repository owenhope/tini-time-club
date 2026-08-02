/** Empty list placeholder. Copy nudges, never apologises. */
export interface EmptyStateProps {
  icon?: string;
  /** e.g. "Your journal's dry" */
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
  style?: React.CSSProperties;
}
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
