/** Modal sheet that slides up from the bottom — filters, share, quick review. Parent must be position:relative. */
export interface BottomSheetProps {
  open?: boolean;
  title?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  style?: React.CSSProperties;
}
export declare function BottomSheet(props: BottomSheetProps): JSX.Element | null;
