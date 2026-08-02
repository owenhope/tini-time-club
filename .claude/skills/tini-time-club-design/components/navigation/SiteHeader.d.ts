/** Marketing site header — sticky, opaque, wordmark left, one CTA right. */
export interface SiteHeaderProps {
  links?: string[];
  tone?: "ink" | "brand";
  cta?: string;
  onCta?: () => void;
  assetBase?: string;
  style?: React.CSSProperties;
}
export declare function SiteHeader(props: SiteHeaderProps): JSX.Element;
