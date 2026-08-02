/** Single number + label. Used on profiles (tinis logged, bars, followers). */
export interface StatCardProps {
  value: React.ReactNode;
  label: string;
  tone?: "paper" | "ink";
  style?: React.CSSProperties;
}
export declare function StatCard(props: StatCardProps): JSX.Element;
