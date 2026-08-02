/** Toggleable filter pill. Selected = chartreuse fill + 2px green border. */
export interface ChipProps {
  children?: React.ReactNode;
  selected?: boolean;
  icon?: string;
  tone?: "light" | "onInk";
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function Chip(props: ChipProps): JSX.Element;
