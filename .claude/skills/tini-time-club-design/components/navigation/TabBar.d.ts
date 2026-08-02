/** Fixed bottom navigation for the mobile app. 5 tabs max, glass background. */
export interface TabBarItem { id: string; label: string; icon: string; dot?: boolean }
export interface TabBarProps {
  items?: TabBarItem[];
  value?: string;
  onChange?: (id: string) => void;
  style?: React.CSSProperties;
}
export declare function TabBar(props: TabBarProps): JSX.Element;
