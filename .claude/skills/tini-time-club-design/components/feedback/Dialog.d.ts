/** Centre modal — web only, and only for destructive confirmation. Mobile uses BottomSheet. */
export interface DialogProps {
  open?: boolean;
  title: string;
  children?: React.ReactNode;
  confirm?: string;
  cancel?: string;
  onConfirm?: () => void;
  onClose?: () => void;
  style?: React.CSSProperties;
}
export declare function Dialog(props: DialogProps): JSX.Element | null;
