/** Circular sticker with arched text and the olive mark at its centre. Pinned at a slight tilt over photography or colour blocks. */
export interface StickerBadgeProps {
  /** Arched text above the olive, uppercase. */
  topText?: string;
  /** Straight text below the olive, uppercase. */
  bottomText?: string;
  /** Use a supplied lockup image (e.g. assets/badge-make-it-dirty.png) instead of live text. */
  src?: string;
  size?: number;
  bg?: string;
  fg?: string;
  /** Rotation in degrees; -12..12. */
  tilt?: number;
  style?: React.CSSProperties;
}
export declare function StickerBadge(props: StickerBadgeProps): JSX.Element;
