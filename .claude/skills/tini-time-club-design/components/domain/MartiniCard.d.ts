/** A specific martini at a specific bar — the app's core object. */
export interface MartiniCardProps {
  /** Drink name, e.g. "Dirty Gibson". */
  name: string;
  bar: string;
  city?: string;
  rating?: number;
  reviews?: number;
  /** Base spirit badge, e.g. "Gin". */
  spirit?: string;
  image?: string;
  trending?: boolean;
  saved?: boolean;
  onSave?: () => void;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function MartiniCard(props: MartiniCardProps): JSX.Element;
