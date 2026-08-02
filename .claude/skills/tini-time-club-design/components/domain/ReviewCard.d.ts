/** A member's review in the community feed — author, drink, rating, notes, photo, social row. */
export interface ReviewCardProps {
  author: string;
  /** Member rank badge, e.g. "Top shelf". */
  rank?: string;
  /** Relative time, e.g. "2h ago". */
  when?: string;
  drink: string;
  bar: string;
  rating?: number;
  /** Tasting notes in the member's own voice. */
  notes?: string;
  /** Flavour tags, e.g. ["Extra dirty", "Ice cold"]. */
  tags?: string[];
  image?: string;
  likes?: number;
  comments?: number;
  liked?: boolean;
  onLike?: () => void;
  style?: React.CSSProperties;
}
export declare function ReviewCard(props: ReviewCardProps): JSX.Element;
