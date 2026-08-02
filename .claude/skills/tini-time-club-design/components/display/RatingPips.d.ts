/** Olive-and-pimento rating scale — the brand's rating mark. Never use stars. */
export interface RatingPipsProps {
  value?: number;
  max?: number;
  /** Pip height in px. 16 in lists, 22-28 in a composer. */
  size?: number;
  /** Append the numeric value in mono. */
  showValue?: boolean;
  /** Supply to make the pips tappable (review composer). */
  onRate?: (value: number) => void;
  style?: React.CSSProperties;
}
export declare function RatingPips(props: RatingPipsProps): JSX.Element;
