/** Native select with brand chrome. */
export interface SelectProps {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options?: Array<string | { value: string; label: string }>;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}
export declare function Select(props: SelectProps): JSX.Element;
