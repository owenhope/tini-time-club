/** A venue. `row` in lists and map sheets, `tile` in grids. */
export interface BarCardProps {
  name: string;
  /** Neighbourhood or city. */
  area: string;
  /** Mono-set distance, e.g. "0.4 mi". */
  distance?: string;
  rating?: number;
  openNow?: boolean;
  /** Marks a bar the member is a Regular at. */
  regular?: boolean;
  image?: string;
  layout?: "row" | "tile";
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function BarCard(props: BarCardProps): JSX.Element;
