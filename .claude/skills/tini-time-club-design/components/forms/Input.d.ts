/** Text field. Rectangular with 10px radius — only controls that act like buttons are pills. */
export interface InputProps {
  label?: string;
  hint?: string;
  /** Error message. Plain and unfunny — jokes never appear in errors. */
  error?: string;
  /** Lucide icon name shown inside the field (single-line only). */
  icon?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}
export declare function Input(props: InputProps): JSX.Element;
