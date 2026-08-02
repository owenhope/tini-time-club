/** Hairline-separated list row for settings, journal entries and search results. */
export interface ListRowProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Left slot — Avatar, thumbnail or Icon. */
  leading?: React.ReactNode;
  /** Right slot — Badge, RatingPips or Switch. */
  trailing?: React.ReactNode;
  chevron?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function ListRow(props: ListRowProps): JSX.Element;
