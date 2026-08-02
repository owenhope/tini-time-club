/** Circular member avatar; falls back to initials on purple. */
export interface AvatarProps {
  src?: string;
  /** Member name — drives initials and the tooltip. */
  name?: string;
  size?: number;
  /** Chartreuse+green ring, used to mark Regulars and Top Shelf members. */
  ring?: boolean;
  style?: React.CSSProperties;
}
export declare function Avatar(props: AvatarProps): JSX.Element;
