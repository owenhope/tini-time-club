import React from "react";

const SRC = {
  green: "logo-wordmark-green.png",
  chartreuse: "logo-wordmark-chartreuse.png",
  cream: "logo-wordmark-cream.png",
};

export function Logo({ tone = "green", width = 140, assetBase = "../../assets/", style, ...rest }) {
  return (
    <img
      src={assetBase + SRC[tone]}
      alt="Tini Time Club"
      style={{ width, height: "auto", display: "block", ...style }}
      {...rest}
    />
  );
}

export function AppIcon({ colorway = "purple", size = 56, radius = "var(--radius-md)", assetBase = "../../assets/", style, ...rest }) {
  return (
    <img
      src={assetBase + "app-icon-" + colorway + ".png"}
      alt="Tini Time Club"
      style={{ width: size, height: size, borderRadius: radius, display: "block", ...style }}
      {...rest}
    />
  );
}
