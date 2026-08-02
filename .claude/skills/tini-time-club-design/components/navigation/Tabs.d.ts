/** Segmented in-page tabs. Active tab takes the chartreuse pill. */
export interface TabsProps {
  items?: Array<string | { id: string; label: string }>;
  value?: string;
  onChange?: (id: string) => void;
  tone?: "light" | "onInk";
  style?: React.CSSProperties;
}
export declare function Tabs(props: TabsProps): JSX.Element;
