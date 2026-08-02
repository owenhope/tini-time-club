/** Heavy tilted lozenge label — the brand's poster/marketing motif. Never used for interactive controls. */
export interface TiltPillProps {
  children?: React.ReactNode;
  tone?: "chartreuse" | "green" | "greenDeep" | "purple" | "paper";
  /** Rotation in degrees. Keep within -4..4. */
  tilt?: number;
  /** Type size in px; padding scales from it. */
  size?: number;
  style?: React.CSSProperties;
}
export declare function TiltPill(props: TiltPillProps): JSX.Element;

/** A stack of TiltPills with alternating tilt and indent — hero/poster list. */
export interface TiltPillStackProps {
  items?: string[];
  tones?: Array<"chartreuse" | "green" | "greenDeep" | "purple" | "paper">;
  size?: number;
  gap?: number;
  style?: React.CSSProperties;
}
export declare function TiltPillStack(props: TiltPillStackProps): JSX.Element;
