/** Rounded-block bento layout in alternating brand tones — marketing sections and social posts. */
export interface BentoGridProps {
  children?: React.ReactNode;
  columns?: number;
  gap?: number;
  style?: React.CSSProperties;
}
export declare function BentoGrid(props: BentoGridProps): JSX.Element;

/** One block inside a BentoGrid. */
export interface BentoTileProps {
  children?: React.ReactNode;
  tone?: "green" | "greenDeep" | "chartreuse" | "purple" | "paper" | "photo";
  /** Column span. */
  span?: number;
  /** Row span. */
  rowSpan?: number;
  /** Background image URL — fills the tile, padding drops to 0. */
  image?: string;
  padding?: number | string;
  style?: React.CSSProperties;
}
export declare function BentoTile(props: BentoTileProps): JSX.Element;
