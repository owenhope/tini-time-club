/** Base surface. 22px radius, hairline border, low green-tinted shadow.
 * @startingPoint section="Core" subtitle="Cards, badges, ratings, list rows" viewport="700x300"
 */
export interface CardProps {
  children?: React.ReactNode;
  /** paper = white on light page. onColour = drops shadow, for purple/green grounds. ink = green surface. */
  tone?: "paper" | "onColour" | "ink";
  /** Adds hover lift + pointer. */
  interactive?: boolean;
  padding?: number | string;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function Card(props: CardProps): JSX.Element;
