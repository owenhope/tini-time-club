/** Eyebrow + heading + optional inline action, for every content section. */
export interface SectionHeaderProps {
  /** 1-3 words, rendered uppercase and tracked. e.g. "NEAR YOU". */
  eyebrow?: string;
  title: string;
  /** Inline action label, e.g. "See all". */
  action?: string;
  onAction?: () => void;
  tone?: "light" | "onInk";
  style?: React.CSSProperties;
}
export declare function SectionHeader(props: SectionHeaderProps): JSX.Element;
