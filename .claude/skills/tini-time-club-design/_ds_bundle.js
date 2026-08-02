/* @ds-bundle: {"format":4,"namespace":"TiniTimeClubDesignSystem_1636c5","components":[{"name":"BentoGrid","sourcePath":"components/brand/BentoGrid.jsx"},{"name":"BentoTile","sourcePath":"components/brand/BentoGrid.jsx"},{"name":"StickerBadge","sourcePath":"components/brand/StickerBadge.jsx"},{"name":"TiltPill","sourcePath":"components/brand/TiltPill.jsx"},{"name":"TiltPillStack","sourcePath":"components/brand/TiltPill.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Logo","sourcePath":"components/core/Logo.jsx"},{"name":"AppIcon","sourcePath":"components/core/Logo.jsx"},{"name":"Avatar","sourcePath":"components/display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"Chip","sourcePath":"components/display/Chip.jsx"},{"name":"ListRow","sourcePath":"components/display/ListRow.jsx"},{"name":"RatingPips","sourcePath":"components/display/RatingPips.jsx"},{"name":"SectionHeader","sourcePath":"components/display/SectionHeader.jsx"},{"name":"StatCard","sourcePath":"components/display/StatCard.jsx"},{"name":"BarCard","sourcePath":"components/domain/BarCard.jsx"},{"name":"MartiniCard","sourcePath":"components/domain/MartiniCard.jsx"},{"name":"ReviewCard","sourcePath":"components/domain/ReviewCard.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"SearchField","sourcePath":"components/forms/SearchField.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"AppBar","sourcePath":"components/navigation/AppBar.jsx"},{"name":"BottomSheet","sourcePath":"components/navigation/BottomSheet.jsx"},{"name":"SiteHeader","sourcePath":"components/navigation/SiteHeader.jsx"},{"name":"TabBar","sourcePath":"components/navigation/TabBar.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/brand/BentoGrid.jsx":"050a2c21e879","components/brand/StickerBadge.jsx":"4dbde3b56d4b","components/brand/TiltPill.jsx":"600ead0a9f12","components/core/Button.jsx":"64f3b5aa11db","components/core/Icon.jsx":"d9451b845b6c","components/core/IconButton.jsx":"7b454398a658","components/core/Logo.jsx":"1ea2db9c9351","components/display/Avatar.jsx":"e04f43be5538","components/display/Badge.jsx":"4db18331f3a7","components/display/Card.jsx":"4a4460169bc5","components/display/Chip.jsx":"e0f41618baa5","components/display/ListRow.jsx":"1a547f6bfe26","components/display/RatingPips.jsx":"fea0b551bae9","components/display/SectionHeader.jsx":"0386b7a28ed4","components/display/StatCard.jsx":"2a57dc9d3969","components/domain/BarCard.jsx":"a6a23fb75b43","components/domain/MartiniCard.jsx":"62a6b94618ee","components/domain/ReviewCard.jsx":"80443ddf0b12","components/feedback/Dialog.jsx":"c52ac2a43062","components/feedback/EmptyState.jsx":"5ffd4673ea82","components/feedback/Toast.jsx":"9fbd817c3f58","components/feedback/Tooltip.jsx":"900910d28952","components/forms/Checkbox.jsx":"cb0791316b2e","components/forms/Input.jsx":"4edb38f519d4","components/forms/Radio.jsx":"19212aa56369","components/forms/SearchField.jsx":"ae5e24b801d0","components/forms/Select.jsx":"3d1842e829b5","components/forms/Switch.jsx":"d52b1db1197e","components/navigation/AppBar.jsx":"ebfda218c9c3","components/navigation/BottomSheet.jsx":"b4a3b8a3bb8d","components/navigation/SiteHeader.jsx":"e390a02dfc43","components/navigation/TabBar.jsx":"3f7a6e8e528d","components/navigation/Tabs.jsx":"32ce60b9503e","ui_kits/marketing_site/CommunityProof.jsx":"15f6d72e2e9d","ui_kits/marketing_site/DownloadCta.jsx":"b03bd46549e2","ui_kits/marketing_site/Hero.jsx":"f92bcd93c7dd","ui_kits/marketing_site/Pillars.jsx":"0827a4fa7dee","ui_kits/mobile_app/App.jsx":"e5d2725cb9c3","ui_kits/mobile_app/BarScreen.jsx":"47acafa27150","ui_kits/mobile_app/ComposeScreen.jsx":"4983d74e589a","ui_kits/mobile_app/DiscoverScreen.jsx":"419036d86b21","ui_kits/mobile_app/FeedScreen.jsx":"7350bb997166","ui_kits/mobile_app/PhoneFrame.jsx":"1f4dc69c7e02","ui_kits/mobile_app/ProfileScreen.jsx":"21dc800849ef","ui_kits/mobile_app/data.js":"7888d78685cc"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TiniTimeClubDesignSystem_1636c5 = window.TiniTimeClubDesignSystem_1636c5 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/BentoGrid.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Inspiration motif: a bento of rounded blocks in alternating brand tones —
   stats, photography, category pills, logo lockup. */
const TONES = {
  green: {
    background: "var(--green-700)",
    color: "var(--paper-050)"
  },
  greenDeep: {
    background: "var(--green-900)",
    color: "var(--chartreuse-500)"
  },
  chartreuse: {
    background: "var(--chartreuse-500)",
    color: "var(--green-700)"
  },
  purple: {
    background: "var(--purple-500)",
    color: "var(--green-700)"
  },
  paper: {
    background: "var(--paper-100)",
    color: "var(--green-700)"
  },
  photo: {
    background: "var(--green-900)",
    color: "var(--paper-050)"
  }
};
function BentoGrid({
  children,
  columns = 2,
  gap = 14,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap,
      gridAutoRows: "minmax(90px, auto)",
      ...style
    }
  }, rest), children);
}
function BentoTile({
  children,
  tone = "green",
  span = 1,
  rowSpan = 1,
  image,
  padding = 22,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.green;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      ...t,
      gridColumn: `span ${span}`,
      gridRow: `span ${rowSpan}`,
      borderRadius: "var(--radius-xl)",
      padding: image ? 0 : padding,
      overflow: "hidden",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      backgroundImage: image ? `url(${image})` : undefined,
      backgroundSize: "cover",
      backgroundPosition: "center",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { BentoGrid, BentoTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/BentoGrid.jsx", error: String((e && e.message) || e) }); }

// components/brand/StickerBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Inspiration motif: circular sticker with text set around the circle,
   pinned at a slight angle over photography or a colour block.
   Pass `src` to use the supplied "MAKE IT DIRTY" lockup instead of live text. */
function StickerBadge({
  topText = "MAKE IT",
  bottomText = "DIRTY",
  src,
  size = 132,
  bg = "var(--chartreuse-500)",
  fg = "var(--green-700)",
  tilt = -8,
  style,
  ...rest
}) {
  const rid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  if (src) {
    return /*#__PURE__*/React.createElement("img", _extends({
      src: src,
      alt: `${topText} ${bottomText}`,
      style: {
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        transform: `rotate(${tilt}deg)`,
        ...style
      }
    }, rest));
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-block",
      width: size,
      height: size,
      transform: `rotate(${tilt}deg)`,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 200 200",
    width: size,
    height: size,
    role: "img",
    "aria-label": `${topText} ${bottomText}`
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "100",
    fill: bg
  }), /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("path", {
    id: "t" + rid,
    d: "M100,100 m-72,0 a72,72 0 1,1 144,0",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    id: "b" + rid,
    d: "M100,100 m-64,0 a64,64 0 1,0 128,0",
    fill: "none"
  })), /*#__PURE__*/React.createElement("text", {
    fill: fg,
    style: {
      font: "900 25px var(--font-display)",
      letterSpacing: "3px"
    }
  }, /*#__PURE__*/React.createElement("textPath", {
    href: "#t" + rid,
    startOffset: "50%",
    textAnchor: "middle"
  }, topText)), /*#__PURE__*/React.createElement("text", {
    fill: fg,
    style: {
      font: "900 25px var(--font-display)",
      letterSpacing: "3px"
    }
  }, /*#__PURE__*/React.createElement("textPath", {
    href: "#b" + rid,
    startOffset: "50%",
    textAnchor: "middle"
  }, bottomText)), /*#__PURE__*/React.createElement("ellipse", {
    cx: "100",
    cy: "100",
    rx: "17",
    ry: "21",
    fill: "var(--green-800)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "106",
    cy: "93",
    r: "7",
    fill: "var(--pimento-pink-500)"
  })));
}
Object.assign(__ds_scope, { StickerBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/StickerBadge.jsx", error: String((e && e.message) || e) }); }

// components/brand/TiltPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  chartreuse: {
    bg: "var(--chartreuse-500)",
    fg: "var(--green-700)"
  },
  green: {
    bg: "var(--green-700)",
    fg: "var(--paper-050)"
  },
  greenDeep: {
    bg: "var(--green-900)",
    fg: "var(--chartreuse-500)"
  },
  purple: {
    bg: "var(--purple-500)",
    fg: "var(--green-700)"
  },
  paper: {
    bg: "var(--paper-050)",
    fg: "var(--green-700)"
  }
};

/* Inspiration motif: heavy lozenge labels stacked with alternating tilt. */
function TiltPill({
  children,
  tone = "chartreuse",
  tilt = -3,
  size = 40,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.chartreuse;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: `${Math.round(size * 0.34)}px ${Math.round(size * 0.85)}px`,
      background: t.bg,
      color: t.fg,
      font: `var(--weight-black) ${size}px/1 var(--font-display)`,
      letterSpacing: "var(--tracking-display)",
      borderRadius: "var(--radius-pill)",
      transform: `rotate(${tilt}deg)`,
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), children);
}
function TiltPillStack({
  items = [],
  tones = ["chartreuse", "green", "paper", "chartreuse"],
  size = 40,
  gap = 14,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap,
      ...style
    }
  }, rest), items.map((label, i) => /*#__PURE__*/React.createElement(TiltPill, {
    key: label,
    tone: tones[i % tones.length],
    tilt: i % 2 ? 3 : -3,
    size: size,
    style: {
      marginLeft: i % 2 ? Math.round(size * 0.9) : 0
    }
  }, label)));
}
Object.assign(__ds_scope, { TiltPill, TiltPillStack });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/TiltPill.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Lucide (2px stroke, 24px grid) fetched once per glyph and rendered INLINE,
   so the SVG inherits currentColor. If a glyph is unavailable the span stays
   empty and transparent — it must never degrade to a filled block.
   SUBSTITUTION: no icon set was supplied with the brand assets. */
const LUCIDE = "https://unpkg.com/lucide-static@0.469.0/icons/";
const CACHE = {};
function useGlyph(name) {
  const [svg, setSvg] = React.useState(() => CACHE[name]);
  React.useEffect(() => {
    if (CACHE[name]) {
      setSvg(CACHE[name]);
      return;
    }
    let alive = true;
    fetch(LUCIDE + name + ".svg").then(r => r.ok ? r.text() : null).then(text => {
      if (!text) return;
      const markup = text.replace(/<\?xml[^>]*\?>/g, "").replace(/width="24"/, 'width="100%"').replace(/height="24"/, 'height="100%"');
      CACHE[name] = markup;
      if (alive) setSvg(markup);
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, [name]);
  return svg;
}
function Icon({
  name,
  size = 24,
  color = "currentColor",
  style,
  ...rest
}) {
  const svg = useGlyph(name);
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true",
    "data-icon": name,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      flex: "0 0 auto",
      color,
      background: "transparent",
      ...style
    },
    dangerouslySetInnerHTML: svg ? {
      __html: svg
    } : undefined
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const H = {
  sm: "var(--control-h-sm)",
  md: "var(--control-h-md)",
  lg: "var(--control-h-lg)"
};
const PAD = {
  sm: "0 14px",
  md: "0 20px",
  lg: "0 28px"
};
const FS = {
  sm: 13,
  md: 15,
  lg: 17
};
const TONES = {
  primary: {
    bg: "var(--green-700)",
    fg: "var(--paper-050)",
    bd: "transparent",
    hover: "var(--green-800)"
  },
  highlight: {
    bg: "var(--chartreuse-500)",
    fg: "var(--green-700)",
    bd: "transparent",
    hover: "var(--chartreuse-600)"
  },
  secondary: {
    bg: "transparent",
    fg: "var(--green-700)",
    bd: "var(--green-700)",
    hover: "var(--green-100)"
  },
  ghost: {
    bg: "transparent",
    fg: "var(--green-700)",
    bd: "transparent",
    hover: "var(--green-100)"
  },
  onInk: {
    bg: "var(--chartreuse-500)",
    fg: "var(--green-700)",
    bd: "transparent",
    hover: "var(--chartreuse-300)"
  }
};
function Button({
  children,
  tone = "primary",
  size = "md",
  icon,
  iconAfter,
  block,
  disabled,
  type = "button",
  style,
  onClick,
  ...rest
}) {
  const t = TONES[tone] || TONES.primary;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: block ? "flex" : "inline-flex",
      width: block ? "100%" : undefined,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: H[size],
      minHeight: size === "sm" ? undefined : "var(--tap-min)",
      padding: PAD[size],
      font: `var(--weight-bold) ${FS[size]}px/1 var(--font-body)`,
      letterSpacing: "-0.005em",
      color: t.fg,
      background: hover && !disabled ? t.hover : t.bg,
      border: `2px solid ${t.bd}`,
      borderRadius: "var(--radius-pill)",
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.38 : 1,
      transform: press && !disabled ? "scale(var(--press-scale))" : "none",
      boxShadow: press && !disabled && (tone === "primary" || tone === "highlight" || tone === "onInk") ? "var(--shadow-inset-press)" : "none",
      transition: "background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
      WebkitTapHighlightColor: "transparent",
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === "sm" ? 16 : 18
  }) : null, children, iconAfter ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconAfter,
    size: size === "sm" ? 16 : 18
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: 34,
  md: 44,
  lg: 54
};
function IconButton({
  icon,
  label,
  tone = "ghost",
  size = "md",
  active,
  disabled,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const solid = tone === "primary";
  const onInk = tone === "onInk";
  const glass = tone === "glass";
  const px = SIZES[size];
  const fg = solid ? "var(--paper-050)" : onInk ? "var(--chartreuse-500)" : "var(--green-700)";
  let bg = "transparent";
  if (solid) bg = hover ? "var(--green-800)" : "var(--green-700)";else if (glass) bg = "var(--glass-bg)";else if (active) bg = "var(--chartreuse-500)";else if (hover) bg = onInk ? "rgba(242,255,113,.14)" : "var(--green-100)";
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    "aria-pressed": active ? true : undefined,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      width: px,
      height: px,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: fg,
      background: bg,
      border: tone === "secondary" ? "2px solid var(--green-700)" : "2px solid transparent",
      borderRadius: "var(--radius-pill)",
      backdropFilter: glass ? "var(--glass-blur)" : undefined,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.38 : 1,
      transform: press && !disabled ? "scale(var(--press-scale))" : "none",
      transition: "background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)",
      WebkitTapHighlightColor: "transparent",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === "sm" ? 18 : size === "lg" ? 26 : 22
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SRC = {
  green: "logo-wordmark-green.png",
  chartreuse: "logo-wordmark-chartreuse.png",
  cream: "logo-wordmark-cream.png"
};
function Logo({
  tone = "green",
  width = 140,
  assetBase = "../../assets/",
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("img", _extends({
    src: assetBase + SRC[tone],
    alt: "Tini Time Club",
    style: {
      width,
      height: "auto",
      display: "block",
      ...style
    }
  }, rest));
}
function AppIcon({
  colorway = "purple",
  size = 56,
  radius = "var(--radius-md)",
  assetBase = "../../assets/",
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("img", _extends({
    src: assetBase + "app-icon-" + colorway + ".png",
    alt: "Tini Time Club",
    style: {
      width: size,
      height: size,
      borderRadius: radius,
      display: "block",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Logo, AppIcon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Logo.jsx", error: String((e && e.message) || e) }); }

// components/display/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Avatar({
  src,
  name = "",
  size = 40,
  ring,
  style,
  ...rest
}) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return /*#__PURE__*/React.createElement("span", _extends({
    title: name || undefined,
    style: {
      width: size,
      height: size,
      flex: "0 0 auto",
      borderRadius: "var(--radius-pill)",
      background: "var(--purple-500)",
      color: "var(--green-700)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      font: `var(--weight-black) ${Math.round(size * 0.38)}px/1 var(--font-display)`,
      letterSpacing: "-0.02em",
      overflow: "hidden",
      boxShadow: ring ? "0 0 0 2px var(--chartreuse-500), 0 0 0 4px var(--green-700)" : "none",
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  green: {
    bg: "var(--green-700)",
    fg: "var(--paper-050)"
  },
  chartreuse: {
    bg: "var(--chartreuse-500)",
    fg: "var(--green-700)"
  },
  purple: {
    bg: "var(--purple-500)",
    fg: "var(--green-700)"
  },
  hot: {
    bg: "var(--pimento-500)",
    fg: "var(--paper-050)"
  },
  outline: {
    bg: "transparent",
    fg: "var(--green-700)"
  },
  muted: {
    bg: "var(--green-100)",
    fg: "var(--green-700)"
  }
};
function Badge({
  children,
  tone = "green",
  icon,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.green;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      height: 24,
      padding: "0 10px",
      font: "var(--type-label)",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      color: t.fg,
      background: t.bg,
      border: tone === "outline" ? "1.5px solid var(--green-700)" : "1.5px solid transparent",
      borderRadius: "var(--radius-pill)",
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  children,
  tone = "paper",
  interactive,
  padding = 20,
  style,
  onClick,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const onColour = tone === "onColour";
  const ink = tone === "ink";
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: ink ? "var(--surface-ink)" : onColour ? "rgba(255,255,255,.92)" : "var(--surface-card)",
      color: ink ? "var(--text-on-ink)" : "var(--text-body)",
      border: `1px solid ${ink ? "var(--line-on-ink)" : "var(--line-hairline)"}`,
      borderRadius: "var(--radius-card)",
      padding,
      boxShadow: onColour || ink ? "none" : interactive && hover ? "var(--shadow-raised)" : "var(--shadow-card)",
      transform: interactive && hover ? "translateY(-2px)" : "none",
      cursor: interactive ? "pointer" : undefined,
      transition: "box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Chip({
  children,
  selected,
  icon,
  onClick,
  tone = "light",
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const onInk = tone === "onInk";
  const bg = selected ? "var(--chartreuse-500)" : onInk ? "rgba(242,255,113,.10)" : hover ? "var(--green-100)" : "var(--surface-card)";
  const fg = selected ? "var(--green-700)" : onInk ? "var(--paper-050)" : "var(--green-700)";
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-pressed": !!selected,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: "var(--control-h-sm)",
      padding: "0 14px",
      font: "var(--weight-semibold) 13px/1 var(--font-body)",
      color: fg,
      background: bg,
      border: `2px solid ${selected ? "var(--green-700)" : onInk ? "var(--line-on-ink)" : "var(--line-hairline)"}`,
      borderRadius: "var(--radius-pill)",
      cursor: "pointer",
      whiteSpace: "nowrap",
      transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 15
  }) : null, children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Chip.jsx", error: String((e && e.message) || e) }); }

// components/display/ListRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  chevron,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      minHeight: "var(--tap-min)",
      padding: "12px 4px",
      borderBottom: "1px solid var(--line-hairline)",
      background: hover && onClick ? "var(--green-100)" : "transparent",
      cursor: onClick ? "pointer" : undefined,
      transition: "background var(--dur-fast) var(--ease-out)",
      ...style
    }
  }, rest), leading, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-h4)",
      color: "var(--text-heading)",
      letterSpacing: "var(--tracking-heading)"
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)"
    }
  }, subtitle) : null), trailing, chevron ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 20,
    color: "var(--green-300)"
  }) : null);
}
Object.assign(__ds_scope, { ListRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/ListRow.jsx", error: String((e && e.message) || e) }); }

// components/display/RatingPips.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* The brand's own rating device: the olive from the wordmark's full stop.
   An olive-green ellipse with an off-centre pimento circle. */
function Olive({
  size,
  filled
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: size * 0.84,
      height: size,
      borderRadius: "50%",
      background: filled ? "var(--green-700)" : "transparent",
      border: filled ? "none" : `2px solid var(--green-300)`,
      position: "relative",
      display: "inline-block",
      flex: "0 0 auto"
    }
  }, filled ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: "16%",
      right: "12%",
      width: size * 0.3,
      height: size * 0.3,
      borderRadius: "50%",
      background: "var(--pimento-500)"
    }
  }) : null);
}
function RatingPips({
  value = 0,
  max = 5,
  size = 16,
  showValue,
  onRate,
  style,
  ...rest
}) {
  const pips = [];
  for (let i = 1; i <= max; i++) {
    pips.push(onRate ? /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      "aria-label": `Rate ${i}`,
      onClick: () => onRate(i),
      style: {
        border: "none",
        background: "transparent",
        padding: 2,
        cursor: "pointer",
        display: "flex",
        lineHeight: 0
      }
    }, /*#__PURE__*/React.createElement(Olive, {
      size: size,
      filled: i <= Math.round(value)
    })) : /*#__PURE__*/React.createElement(Olive, {
      key: i,
      size: size,
      filled: i <= Math.round(value)
    }));
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    role: "img",
    "aria-label": `${value} out of ${max}`,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: onRate ? 2 : size * 0.28,
      ...style
    }
  }, rest), pips, showValue ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-mono)",
      letterSpacing: "var(--tracking-mono)",
      color: "var(--text-muted)",
      marginLeft: 8
    }
  }, Number(value).toFixed(1)) : null);
}
Object.assign(__ds_scope, { RatingPips });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/RatingPips.jsx", error: String((e && e.message) || e) }); }

// components/display/SectionHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SectionHeader({
  eyebrow,
  title,
  action,
  onAction,
  tone = "light",
  style,
  ...rest
}) {
  const onInk = tone === "onInk";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 16,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, eyebrow ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-eyebrow)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: onInk ? "var(--chartreuse-500)" : "var(--green-500)"
    }
  }, eyebrow) : null, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--type-h2)",
      letterSpacing: "var(--tracking-heading)",
      color: onInk ? "var(--text-on-ink)" : "var(--text-heading)"
    }
  }, title)), action ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onAction,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      border: "none",
      background: "transparent",
      font: "var(--weight-bold) 14px/1 var(--font-body)",
      color: onInk ? "var(--chartreuse-500)" : "var(--green-700)",
      cursor: "pointer",
      padding: "6px 0",
      whiteSpace: "nowrap"
    }
  }, action, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrow-right",
    size: 16
  })) : null);
}
Object.assign(__ds_scope, { SectionHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/SectionHeader.jsx", error: String((e && e.message) || e) }); }

// components/display/StatCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function StatCard({
  value,
  label,
  tone = "paper",
  style,
  ...rest
}) {
  const ink = tone === "ink";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      padding: "14px 16px",
      background: ink ? "rgba(242,255,113,.10)" : "var(--surface-card)",
      border: `1px solid ${ink ? "var(--line-on-ink)" : "var(--line-hairline)"}`,
      borderRadius: "var(--radius-md)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-display-3)",
      letterSpacing: "var(--tracking-display)",
      color: ink ? "var(--chartreuse-500)" : "var(--text-heading)"
    }
  }, value), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-label)",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      color: ink ? "var(--text-on-ink-muted)" : "var(--text-muted)"
    }
  }, label));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/domain/BarCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function BarCard({
  name,
  area,
  distance,
  rating,
  openNow,
  regular,
  image,
  layout = "row",
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const row = layout === "row";
  return /*#__PURE__*/React.createElement("article", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      flexDirection: row ? "row" : "column",
      gap: row ? 14 : 0,
      alignItems: row ? "center" : "stretch",
      background: "var(--surface-card)",
      border: "1px solid var(--line-hairline)",
      borderRadius: "var(--radius-card)",
      overflow: "hidden",
      padding: row ? 12 : 0,
      cursor: onClick ? "pointer" : undefined,
      boxShadow: hover ? "var(--shadow-raised)" : "var(--shadow-card)",
      transition: "box-shadow var(--dur-base) var(--ease-out)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: row ? "0 0 auto" : undefined,
      width: row ? 74 : "100%",
      height: row ? 74 : 132,
      borderRadius: row ? "var(--radius-md)" : 0,
      background: "var(--green-900)",
      backgroundImage: image ? `url(${image})` : undefined,
      backgroundSize: "cover",
      backgroundPosition: "center"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      padding: row ? 0 : 16,
      display: "flex",
      flexDirection: "column",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h3)",
      letterSpacing: "var(--tracking-heading)",
      flex: 1,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, name), regular ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "green"
  }, "Regular") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      font: "var(--type-body-sm)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "map-pin",
    size: 15,
    color: "var(--green-500)"
  }), /*#__PURE__*/React.createElement("span", null, area), distance ? /*#__PURE__*/React.createElement("span", {
    className: "ttc-mono",
    style: {
      font: "var(--type-mono)"
    }
  }, "\xB7 ", distance) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.RatingPips, {
    value: rating,
    showValue: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: openNow ? "var(--green-500)" : "var(--text-muted)",
      fontWeight: 700
    }
  }, openNow ? "Open now" : "Closed"))));
}
Object.assign(__ds_scope, { BarCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/BarCard.jsx", error: String((e && e.message) || e) }); }

// components/domain/MartiniCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function MartiniCard({
  name,
  bar,
  city,
  rating,
  reviews,
  spirit,
  image,
  trending,
  saved,
  onSave,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("article", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--line-hairline)",
      borderRadius: "var(--radius-card)",
      overflow: "hidden",
      cursor: onClick ? "pointer" : undefined,
      boxShadow: hover ? "var(--shadow-raised)" : "var(--shadow-card)",
      transform: hover ? "translateY(-2px)" : "none",
      transition: "box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      aspectRatio: "4 / 3",
      background: "var(--green-900)",
      backgroundImage: image ? `url(${image})` : undefined,
      backgroundSize: "cover",
      backgroundPosition: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--scrim-bottom)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 10,
      left: 10,
      display: "flex",
      gap: 6
    }
  }, trending ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "hot",
    icon: "flame"
  }, "Trending") : null, spirit ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "chartreuse"
  }, spirit) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 6,
      right: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: saved ? "bookmark-check" : "bookmark",
    label: "Save",
    tone: "glass",
    size: "sm",
    onClick: e => {
      e.stopPropagation();
      onSave && onSave();
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h3)",
      letterSpacing: "var(--tracking-heading)"
    }
  }, name), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)"
    }
  }, bar, city ? ` · ${city}` : ""), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.RatingPips, {
    value: rating,
    showValue: true
  }), reviews != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-muted)"
    }
  }, reviews, " reviews") : null)));
}
Object.assign(__ds_scope, { MartiniCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/MartiniCard.jsx", error: String((e && e.message) || e) }); }

// components/domain/ReviewCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ReviewCard({
  author,
  rank,
  when,
  drink,
  bar,
  rating,
  notes,
  tags = [],
  image,
  likes = 0,
  comments = 0,
  liked,
  onLike,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("article", _extends({
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--line-hairline)",
      borderRadius: "var(--radius-card)",
      boxShadow: "var(--shadow-card)",
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: author,
    size: 42,
    ring: !!rank
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-h4)",
      color: "var(--text-heading)",
      letterSpacing: "var(--tracking-heading)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      minWidth: 0
    }
  }, author), rank ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "chartreuse"
  }, rank) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-muted)"
    }
  }, when)), /*#__PURE__*/React.createElement(__ds_scope.RatingPips, {
    value: rating
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h3)",
      letterSpacing: "var(--tracking-heading)"
    }
  }, drink), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, bar)), image ? /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      aspectRatio: "16 / 10",
      backgroundImage: `url(${image})`,
      backgroundSize: "cover",
      backgroundPosition: "center"
    }
  }) : null, notes ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body)",
      textWrap: "pretty"
    }
  }, notes) : null, tags.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6
    }
  }, tags.map(t => /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    key: t,
    tone: "muted"
  }, t))) : null, /*#__PURE__*/React.createElement("footer", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 18,
      borderTop: "1px solid var(--line-hairline)",
      paddingTop: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onLike,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      border: "none",
      background: "transparent",
      cursor: "pointer",
      padding: "4px 0",
      font: "var(--weight-semibold) 13.5px/1 var(--font-body)",
      color: liked ? "var(--pimento-500)" : "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "heart",
    size: 17
  }), likes), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      font: "var(--weight-semibold) 13.5px/1 var(--font-body)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "message-circle",
    size: 17
  }), comments), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "share-2",
    size: 17,
    color: "var(--text-muted)"
  })));
}
Object.assign(__ds_scope, { ReviewCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/ReviewCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Dialog({
  open,
  title,
  children,
  confirm,
  cancel = "Never mind",
  onConfirm,
  onClose,
  style,
  ...rest
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "absolute",
      inset: 0,
      background: "rgba(20,26,23,.42)"
    }
  }), /*#__PURE__*/React.createElement("div", _extends({
    role: "dialog",
    "aria-label": title,
    style: {
      position: "relative",
      width: "100%",
      maxWidth: 420,
      background: "var(--surface-card)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-overlay)",
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 14,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h2)",
      letterSpacing: "var(--tracking-heading)",
      flex: 1
    }
  }, title), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "Close",
    size: "sm",
    onClick: onClose
  })), children ? /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--type-body)",
      color: "var(--text-muted)"
    }
  }, children) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    tone: "ghost",
    onClick: onClose
  }, cancel), confirm ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    tone: "primary",
    onClick: onConfirm
  }, confirm) : null)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function EmptyState({
  icon = "martini",
  title,
  body,
  action,
  onAction,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: 10,
      padding: "36px 24px",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 64,
      height: 64,
      borderRadius: "var(--radius-pill)",
      background: "var(--green-100)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 30,
    color: "var(--green-700)"
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h2)",
      letterSpacing: "var(--tracking-heading)"
    }
  }, title), body ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body)",
      color: "var(--text-muted)",
      maxWidth: "34ch"
    }
  }, body) : null, action ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    tone: "primary",
    onClick: onAction,
    style: {
      marginTop: 6
    }
  }, action) : null);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Toast({
  message,
  icon = "martini",
  tone = "ink",
  style,
  ...rest
}) {
  const chart = tone === "chartreuse";
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 18px",
      background: chart ? "var(--chartreuse-500)" : "var(--green-900)",
      color: chart ? "var(--green-700)" : "var(--chartreuse-500)",
      borderRadius: "var(--radius-pill)",
      boxShadow: "var(--shadow-raised)",
      font: "var(--weight-semibold) 14.5px/1.2 var(--font-body)",
      animation: "ttcToast var(--dur-slow) var(--ease-spring)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("style", null, "@keyframes ttcToast{from{transform:translateY(10px) scale(.96);opacity:0}to{transform:none;opacity:1}}"), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18
  }), message);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tooltip({
  label,
  children,
  placement = "top",
  style,
  ...rest
}) {
  const [show, setShow] = React.useState(false);
  const pos = placement === "bottom" ? {
    top: "calc(100% + 8px)",
    left: "50%",
    transform: "translateX(-50%)"
  } : {
    bottom: "calc(100% + 8px)",
    left: "50%",
    transform: "translateX(-50%)"
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: "relative",
      display: "inline-flex",
      ...style
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false)
  }, rest), children, show ? /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: "absolute",
      ...pos,
      zIndex: 30,
      padding: "6px 10px",
      whiteSpace: "nowrap",
      background: "var(--green-900)",
      color: "var(--paper-050)",
      font: "var(--type-caption)",
      borderRadius: "var(--radius-xs)",
      boxShadow: "var(--shadow-sm)",
      pointerEvents: "none"
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  checked,
  onChange,
  disabled,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.38 : 1,
      minHeight: "var(--tap-min)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: !!checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      width: 1,
      height: 1
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      flex: "0 0 auto",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--radius-xs)",
      border: `2px solid var(--green-700)`,
      background: checked ? "var(--green-700)" : "var(--surface-card)",
      transition: "background var(--dur-fast) var(--ease-out)"
    }
  }, checked ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 16,
    color: "var(--chartreuse-500)"
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body)"
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  error,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  multiline,
  rows = 4,
  disabled,
  id,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const rid = id || React.useId();
  const border = error ? "var(--accent-danger)" : focus ? "var(--green-700)" : "var(--line-hairline)";
  const field = {
    width: "100%",
    minHeight: multiline ? undefined : "var(--control-h-md)",
    padding: multiline ? "12px 14px" : icon ? "0 14px 0 42px" : "0 14px",
    font: "var(--type-body)",
    color: "var(--text-body)",
    background: "var(--surface-card)",
    border: `2px solid ${border}`,
    borderRadius: multiline ? "var(--radius-sm)" : "var(--radius-sm)",
    outline: "none",
    resize: multiline ? "vertical" : undefined,
    lineHeight: multiline ? 1.55 : undefined,
    transition: "border-color var(--dur-fast) var(--ease-out)"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: rid,
    style: {
      font: "var(--type-label)",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      opacity: disabled ? 0.38 : 1
    }
  }, icon && !multiline ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20,
    color: "var(--green-500)",
    style: {
      position: "absolute",
      left: 12,
      top: "50%",
      transform: "translateY(-50%)"
    }
  }) : null, multiline ? /*#__PURE__*/React.createElement("textarea", _extends({
    id: rid,
    rows: rows,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: field
  }, rest)) : /*#__PURE__*/React.createElement("input", _extends({
    id: rid,
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: field
  }, rest))), error || hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: error ? "var(--accent-danger)" : "var(--text-muted)"
    }
  }, error || hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Radio({
  label,
  checked,
  onChange,
  name,
  value,
  disabled,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.38 : 1,
      minHeight: "var(--tap-min)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    name: name,
    value: value,
    checked: !!checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      width: 1,
      height: 1
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      flex: "0 0 auto",
      borderRadius: "var(--radius-pill)",
      border: "2px solid var(--green-700)",
      background: "var(--surface-card)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, checked ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 11,
      borderRadius: "var(--radius-pill)",
      background: "var(--green-700)"
    }
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body)"
    }
  }, label));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SearchField({
  value,
  onChange,
  onClear,
  placeholder = "Search bars, martinis, flavours",
  tone = "light",
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const onInk = tone === "onInk";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      height: "var(--control-h-md)",
      padding: "0 14px",
      background: onInk ? "rgba(242,255,113,.10)" : "var(--surface-card)",
      border: `2px solid ${focus ? onInk ? "var(--chartreuse-500)" : "var(--green-700)" : onInk ? "var(--line-on-ink)" : "var(--line-hairline)"}`,
      borderRadius: "var(--radius-pill)",
      transition: "border-color var(--dur-fast) var(--ease-out)",
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 20,
    color: onInk ? "var(--chartreuse-500)" : "var(--green-500)"
  }), /*#__PURE__*/React.createElement("input", _extends({
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      font: "var(--type-body)",
      color: onInk ? "var(--paper-050)" : "var(--text-body)"
    }
  }, rest)), value ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Clear",
    onClick: onClear,
    style: {
      border: "none",
      background: "transparent",
      padding: 0,
      cursor: "pointer",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 18,
    color: onInk ? "var(--chartreuse-500)" : "var(--green-500)"
  })) : null);
}
Object.assign(__ds_scope, { SearchField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  label,
  value,
  onChange,
  options = [],
  disabled,
  id,
  style,
  ...rest
}) {
  const rid = id || React.useId();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: rid,
    style: {
      font: "var(--type-label)",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      opacity: disabled ? 0.38 : 1
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: rid,
    value: value,
    onChange: onChange,
    disabled: disabled,
    style: {
      appearance: "none",
      width: "100%",
      height: "var(--control-h-md)",
      padding: "0 40px 0 14px",
      font: "var(--type-body)",
      color: "var(--text-body)",
      background: "var(--surface-card)",
      border: "2px solid var(--line-hairline)",
      borderRadius: "var(--radius-sm)",
      outline: "none",
      cursor: "pointer"
    }
  }, rest), options.map(o => {
    const v = typeof o === "string" ? o : o.value;
    const l = typeof o === "string" ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 20,
    color: "var(--green-500)",
    style: {
      position: "absolute",
      right: 12,
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none"
    }
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  label,
  checked,
  onChange,
  disabled,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.38 : 1,
      minHeight: "var(--tap-min)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    checked: !!checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      width: 1,
      height: 1
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 48,
      height: 28,
      flex: "0 0 auto",
      borderRadius: "var(--radius-pill)",
      background: checked ? "var(--green-700)" : "var(--paper-300)",
      padding: 3,
      display: "inline-flex",
      alignItems: "center",
      transition: "background var(--dur-base) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: "var(--radius-pill)",
      background: checked ? "var(--chartreuse-500)" : "var(--paper-000)",
      boxShadow: "var(--shadow-sm)",
      transform: checked ? "translateX(20px)" : "translateX(0)",
      transition: "transform var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out)"
    }
  })), label ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body)"
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/AppBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function AppBar({
  title,
  showLogo,
  leadingIcon,
  onLeading,
  actions = [],
  tone = "light",
  assetBase = "../../assets/",
  style,
  ...rest
}) {
  const ink = tone === "ink";
  const glass = tone === "glass";
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      minHeight: 56,
      padding: "8px 12px",
      background: ink ? "var(--surface-ink)" : glass ? "var(--glass-bg)" : "var(--surface-card)",
      backdropFilter: glass ? "var(--glass-blur)" : undefined,
      borderBottom: `1px solid ${ink ? "var(--line-on-ink)" : "var(--line-hairline)"}`,
      ...style
    }
  }, rest), leadingIcon ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: leadingIcon,
    label: "Back",
    size: "sm",
    tone: ink ? "onInk" : "ghost",
    onClick: onLeading
  }) : null, showLogo ? /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    tone: ink ? "chartreuse" : "green",
    width: 92,
    assetBase: assetBase,
    style: {
      marginLeft: 4
    }
  }) : null, title ? /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h3)",
      letterSpacing: "var(--tracking-heading)",
      color: ink ? "var(--text-on-ink)" : "var(--text-heading)",
      margin: 0
    }
  }, title) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, actions.map(a => /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    key: a.icon,
    icon: a.icon,
    label: a.label,
    size: "sm",
    tone: ink ? "onInk" : "ghost",
    onClick: a.onClick
  }))));
}
Object.assign(__ds_scope, { AppBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/AppBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/BottomSheet.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function BottomSheet({
  open,
  title,
  children,
  onClose,
  style,
  ...rest
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      zIndex: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "absolute",
      inset: 0,
      background: "rgba(20,26,23,.42)"
    }
  }), /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: "relative",
      background: "var(--surface-card)",
      borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
      boxShadow: "var(--shadow-overlay)",
      padding: "10px 20px 24px",
      animation: "ttcSheetUp var(--dur-slow) var(--ease-out)",
      maxHeight: "86%",
      overflowY: "auto",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("style", null, "@keyframes ttcSheetUp{from{transform:translateY(14px);opacity:.6}to{transform:none;opacity:1}}"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 42,
      height: 4,
      borderRadius: 2,
      background: "var(--paper-300)",
      margin: "0 auto 12px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h2)",
      letterSpacing: "var(--tracking-heading)",
      flex: 1
    }
  }, title), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "Close",
    size: "sm",
    onClick: onClose
  })), children));
}
Object.assign(__ds_scope, { BottomSheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/BottomSheet.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SiteHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SiteHeader({
  links = [],
  tone = "ink",
  cta = "Get the app",
  onCta,
  assetBase = "../../assets/",
  style,
  ...rest
}) {
  const ink = tone === "ink";
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      position: "sticky",
      top: 0,
      zIndex: 20,
      background: ink ? "var(--surface-ink-deep)" : "var(--surface-brand)",
      borderBottom: `1px solid ${ink ? "var(--line-on-ink)" : "rgba(51,102,84,.18)"}`,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      padding: "16px var(--gutter-page)",
      display: "flex",
      alignItems: "center",
      gap: 32
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    tone: ink ? "chartreuse" : "green",
    width: 104,
    assetBase: assetBase
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: 26,
      flex: 1
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      font: "var(--weight-semibold) 15px/1 var(--font-body)",
      color: ink ? "var(--paper-050)" : "var(--green-700)",
      textDecoration: "none"
    }
  }, l))), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    tone: ink ? "onInk" : "primary",
    size: "sm",
    onClick: onCta
  }, cta)));
}
Object.assign(__ds_scope, { SiteHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SiteHeader.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TabBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Fixed bottom app chrome: translucent glass over content, 5 tabs. */
function TabBar({
  items = [],
  value,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: "flex",
      alignItems: "stretch",
      background: "var(--glass-bg)",
      backdropFilter: "var(--glass-blur)",
      borderTop: "1px solid var(--line-hairline)",
      padding: "6px 4px 10px",
      ...style
    }
  }, rest), items.map(it => {
    const active = it.id === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      type: "button",
      onClick: () => onChange && onChange(it.id),
      "aria-current": active ? "page" : undefined,
      style: {
        flex: 1,
        minHeight: "var(--tap-min)",
        border: "none",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        color: active ? "var(--green-700)" : "var(--ink-500)",
        cursor: "pointer",
        padding: "6px 0",
        WebkitTapHighlightColor: "transparent"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "relative",
        display: "flex"
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 26
    }), it.dot ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: -1,
        right: -3,
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--pimento-500)"
      }
    }) : null), /*#__PURE__*/React.createElement("span", {
      style: {
        font: `var(--weight-${active ? "bold" : "medium"}) 10.5px/1 var(--font-body)`,
        letterSpacing: ".01em"
      }
    }, it.label));
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TabBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Segmented pill tabs with a sliding chartreuse indicator. */
function Tabs({
  items = [],
  value,
  onChange,
  tone = "light",
  style,
  ...rest
}) {
  const ink = tone === "onInk";
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: "inline-flex",
      gap: 4,
      padding: 4,
      background: ink ? "rgba(242,255,113,.10)" : "var(--surface-card-sunk)",
      border: `1px solid ${ink ? "var(--line-on-ink)" : "var(--line-hairline)"}`,
      borderRadius: "var(--radius-pill)",
      ...style
    }
  }, rest), items.map(it => {
    const id = typeof it === "string" ? it : it.id;
    const label = typeof it === "string" ? it : it.label;
    const active = id === value;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      type: "button",
      role: "tab",
      "aria-selected": active,
      onClick: () => onChange && onChange(id),
      style: {
        height: 34,
        padding: "0 16px",
        border: "none",
        borderRadius: "var(--radius-pill)",
        font: `var(--weight-${active ? "bold" : "semibold"}) 13.5px/1 var(--font-body)`,
        color: active ? "var(--green-700)" : ink ? "var(--text-on-ink-muted)" : "var(--text-muted)",
        background: active ? "var(--chartreuse-500)" : "transparent",
        cursor: "pointer",
        transition: "background var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)"
      }
    }, label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/CommunityProof.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  ReviewCard,
  SectionHeader,
  BarCard,
  Button
} = window.TiniTimeClubDesignSystem_1636c5;
function CommunityProof() {
  const D = window.TTC_DATA;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-page)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      padding: "80px var(--gutter-page)",
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr",
      gap: 44
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "The club",
    title: "What people are drinking tonight",
    action: "Open the feed",
    style: {
      marginBottom: 20
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16
    }
  }, D.feed.slice(0, 2).map(r => /*#__PURE__*/React.createElement(ReviewCard, _extends({
    key: r.id
  }, r))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "Near you",
    title: "Open right now",
    style: {
      marginBottom: 20
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, D.bars.map(b => /*#__PURE__*/React.createElement(BarCard, _extends({
    key: b.id
  }, b)))), /*#__PURE__*/React.createElement(Button, {
    tone: "secondary",
    style: {
      marginTop: 16
    },
    iconAfter: "arrow-right"
  }, "See all 24 bars"))));
}
Object.assign(window, {
  CommunityProof
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/CommunityProof.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/DownloadCta.jsx
try { (() => {
const {
  Button,
  AppIcon,
  Logo,
  Icon
} = window.TiniTimeClubDesignSystem_1636c5;
function DownloadCta() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-ink)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      padding: "76px var(--gutter-page)",
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 40,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--type-display-2)",
      letterSpacing: "var(--tracking-display)",
      color: "var(--chartreuse-500)",
      textTransform: "lowercase",
      margin: 0
    }
  }, "it's tini time \uD83C\uDF78"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-lg)",
      color: "var(--green-300)",
      maxWidth: "44ch"
    }
  }, "Somewhere a bartender is polishing a coupe just for you. Get the app and go find it."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    tone: "onInk",
    size: "lg",
    icon: "apple"
  }, "App Store"), /*#__PURE__*/React.createElement(Button, {
    tone: "onInk",
    size: "lg",
    icon: "play"
  }, "Google Play"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(AppIcon, {
    colorway: "purple",
    size: 92,
    radius: "22px",
    assetBase: "../../assets/"
  }), /*#__PURE__*/React.createElement(AppIcon, {
    colorway: "chartreuse",
    size: 92,
    radius: "22px",
    assetBase: "../../assets/"
  }), /*#__PURE__*/React.createElement(AppIcon, {
    colorway: "green",
    size: 92,
    radius: "22px",
    assetBase: "../../assets/"
  }))), /*#__PURE__*/React.createElement("footer", {
    style: {
      borderTop: "1px solid var(--line-on-ink)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      padding: "26px var(--gutter-page)",
      display: "flex",
      alignItems: "center",
      gap: 26
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    tone: "chartreuse",
    width: 90,
    assetBase: "../../assets/"
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: 22,
      flex: 1
    }
  }, ["Discover", "Bars", "The club", "Press", "Privacy"].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      font: "var(--type-body-sm)",
      color: "var(--green-300)",
      textDecoration: "none"
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      color: "var(--green-300)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "instagram",
    size: 20
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "youtube",
    size: 20
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "mail",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      padding: "0 var(--gutter-page) 26px",
      font: "var(--type-caption)",
      color: "var(--green-500)"
    }
  }, "Please drink responsibly. 21+ only where applicable.")));
}
Object.assign(window, {
  DownloadCta
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/DownloadCta.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/Hero.jsx
try { (() => {
const {
  Button,
  Logo,
  StickerBadge,
  Badge,
  Avatar
} = window.TiniTimeClubDesignSystem_1636c5;
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-ink-deep)",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      padding: "72px var(--gutter-page) 88px",
      display: "grid",
      gridTemplateColumns: "1.05fr .95fr",
      gap: 56,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 22,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-eyebrow)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--chartreuse-500)"
    }
  }, "The martini social network"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--type-display-1)",
      letterSpacing: "var(--tracking-display)",
      color: "var(--paper-050)",
      textTransform: "lowercase",
      margin: 0
    }
  }, "discover the world's", /*#__PURE__*/React.createElement("br", null), "best martinis"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-lg)",
      color: "var(--green-300)",
      maxWidth: "42ch"
    }
  }, "Join martini lovers around the globe who use Tini Time Club to discover, review and share the best martinis near and far."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    tone: "onInk",
    size: "lg",
    icon: "apple"
  }, "Get the app"), /*#__PURE__*/React.createElement(Button, {
    tone: "ghost",
    size: "lg",
    iconAfter: "arrow-right",
    style: {
      color: "var(--paper-050)"
    }
  }, "Browse bars")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex"
    }
  }, ["Nadia Fereday", "Milo Grant", "Ines Vo", "Theo Marsh"].map((n, i) => /*#__PURE__*/React.createElement(Avatar, {
    key: n,
    name: n,
    size: 34,
    style: {
      marginLeft: i ? -10 : 0,
      boxShadow: "0 0 0 2px var(--green-900)"
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--green-300)"
    }
  }, "99.9k verdicts poured so far"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      justifySelf: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 320,
      height: 640,
      borderRadius: 40,
      border: "9px solid #16181A",
      background: "var(--surface-ink)",
      overflow: "hidden",
      boxShadow: "var(--shadow-overlay)",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "26px 20px 14px",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    tone: "chartreuse",
    width: 92,
    assetBase: "../../assets/"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px 16px"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--weight-black) 27px/0.92 var(--font-display)",
      letterSpacing: "var(--tracking-display)",
      color: "var(--paper-050)",
      textTransform: "lowercase"
    }
  }, "clock out,", /*#__PURE__*/React.createElement("br", null), "coupe up \uD83C\uDF78")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      backgroundImage: "url(../../assets/photo-martini-lamp.jpg)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--scrim-bottom)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 16,
      bottom: 16,
      right: 16,
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "chartreuse"
  }, "Bar Basso"), /*#__PURE__*/React.createElement(Badge, {
    tone: "hot",
    icon: "flame"
  }, "Trending")))), /*#__PURE__*/React.createElement(StickerBadge, {
    size: 128,
    tilt: -10,
    style: {
      position: "absolute",
      left: -38,
      bottom: 74
    }
  }))));
}
Object.assign(window, {
  Hero
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/Pillars.jsx
try { (() => {
const {
  BentoGrid,
  BentoTile,
  Icon,
  Button,
  TiltPillStack
} = window.TiniTimeClubDesignSystem_1636c5;
function Pillars() {
  const items = [{
    icon: "search",
    title: "Discover, review, share",
    body: "Trending martinis, classic recipes and local favourites — reviewed by people who actually drank them."
  }, {
    icon: "map-pin",
    title: "Find the best near you",
    body: "Lounges, cocktail bars and hidden gems. Search by flavour profile, ingredient or bar name."
  }, {
    icon: "users",
    title: "Connect with the club",
    body: "Follow friends and mixologists, comment, and find new favourites in the community feed."
  }, {
    icon: "book-open",
    title: "Your martini journal",
    body: "Every tini you've tried, with ratings and notes — ready for the next night out."
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-brand)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--page-max)",
      margin: "0 auto",
      padding: "80px var(--gutter-page)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      marginBottom: 34,
      maxWidth: "26ch"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-eyebrow)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--green-700)"
    }
  }, "What you get"), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--type-display-2)",
      letterSpacing: "var(--tracking-display)",
      color: "var(--green-700)",
      textTransform: "lowercase"
    }
  }, "shaken, stirred, or both")), /*#__PURE__*/React.createElement(BentoGrid, {
    columns: 3,
    gap: 16
  }, /*#__PURE__*/React.createElement(BentoTile, {
    tone: "green",
    span: 2,
    padding: 28
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-label)",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      opacity: .8
    }
  }, "Verdicts poured"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-black) 72px/0.9 var(--font-display)",
      letterSpacing: "var(--tracking-display)",
      color: "var(--chartreuse-500)"
    }
  }, "99.9k"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body)",
      color: "var(--green-300)",
      marginTop: 6
    }
  }, "The club runs on reviews. Do your part, agent \uD83C\uDF78")), /*#__PURE__*/React.createElement(BentoTile, {
    tone: "photo",
    rowSpan: 2,
    image: "../../assets/photo-martini-lamp.jpg"
  }), /*#__PURE__*/React.createElement(BentoTile, {
    tone: "greenDeep",
    padding: 26,
    style: {
      gap: 12,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(TiltPillStack, {
    items: ["Dirty", "Dry", "Gibson"],
    size: 22,
    gap: 10
  })), /*#__PURE__*/React.createElement(BentoTile, {
    tone: "chartreuse",
    padding: 26
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-h2)",
      letterSpacing: "var(--tracking-heading)"
    }
  }, "Make it dirty"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body-sm)",
      marginTop: 6
    }
  }, "Rate taste, presentation and judgment \u2014 five olives, no stars."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 16,
      marginTop: 16
    }
  }, items.map(i => /*#__PURE__*/React.createElement("div", {
    key: i.title,
    style: {
      background: "var(--paper-050)",
      borderRadius: "var(--radius-xl)",
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 46,
      height: 46,
      borderRadius: "var(--radius-pill)",
      background: "var(--green-100)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: i.icon,
    size: 22,
    color: "var(--green-700)"
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h3)",
      letterSpacing: "var(--tracking-heading)"
    }
  }, i.title), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)",
      textWrap: "pretty"
    }
  }, i.body))))));
}
Object.assign(window, {
  Pillars
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/Pillars.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile_app/App.jsx
try { (() => {
const {
  TabBar,
  Toast
} = window.TiniTimeClubDesignSystem_1636c5;
function App() {
  const [tab, setTab] = React.useState("feed");
  const [screen, setScreen] = React.useState(null); // "bar" | "compose"
  const [toast, setToast] = React.useState(null);
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  const openBar = () => setScreen("bar");
  const compose = () => setScreen("compose");
  const back = () => setScreen(null);
  const post = () => {
    setScreen(null);
    setTab("journal");
    setToast("Logged. That's 129 tinis 🍸");
  };
  let body;
  if (screen === "bar") body = /*#__PURE__*/React.createElement(BarScreen, {
    onBack: back,
    onCompose: compose
  });else if (screen === "compose") body = /*#__PURE__*/React.createElement(ComposeScreen, {
    onBack: back,
    onPost: post
  });else if (tab === "feed") body = /*#__PURE__*/React.createElement(FeedScreen, {
    onOpenBar: openBar,
    onCompose: compose
  });else if (tab === "discover") body = /*#__PURE__*/React.createElement(DiscoverScreen, {
    onOpenBar: openBar
  });else if (tab === "journal" || tab === "me") body = /*#__PURE__*/React.createElement(ProfileScreen, null);else body = /*#__PURE__*/React.createElement(FeedScreen, {
    onOpenBar: openBar,
    onCompose: compose
  });
  const chromeless = screen === "compose";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      position: "relative"
    }
  }, body), toast ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 92,
      display: "flex",
      justifyContent: "center",
      zIndex: 55
    }
  }, /*#__PURE__*/React.createElement(Toast, {
    message: toast
  })) : null, chromeless ? null : /*#__PURE__*/React.createElement(TabBar, {
    value: screen ? "" : tab,
    onChange: id => {
      setScreen(id === "post" ? "compose" : null);
      if (id !== "post") setTab(id);
    },
    items: [{
      id: "feed",
      label: "Feed",
      icon: "newspaper"
    }, {
      id: "discover",
      label: "Discover",
      icon: "map-pin"
    }, {
      id: "post",
      label: "Rate",
      icon: "plus-circle"
    }, {
      id: "journal",
      label: "Journal",
      icon: "book-open",
      dot: true
    }, {
      id: "me",
      label: "Me",
      icon: "user"
    }]
  }));
}
Object.assign(window, {
  App
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile_app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile_app/BarScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  AppBar,
  Badge,
  RatingPips,
  Button,
  Tabs,
  MartiniCard,
  ReviewCard,
  StatCard,
  StickerBadge,
  IconButton
} = window.TiniTimeClubDesignSystem_1636c5;
function BarScreen({
  onBack,
  onCompose
}) {
  const D = window.TTC_DATA;
  const [tab, setTab] = React.useState("Menu");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 260,
      backgroundImage: "url(../../assets/photo-martini-lamp.jpg)",
      backgroundSize: "cover",
      backgroundPosition: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--scrim-bottom)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 42,
      left: 12,
      right: 12,
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "chevron-left",
    label: "Back",
    tone: "glass",
    size: "sm",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "share-2",
    label: "Share",
    tone: "glass",
    size: "sm"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "bookmark",
    label: "Save",
    tone: "glass",
    size: "sm"
  })), /*#__PURE__*/React.createElement(StickerBadge, {
    size: 96,
    tilt: -8,
    style: {
      position: "absolute",
      right: 14,
      bottom: 68
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "var(--gutter-screen)",
      bottom: 16,
      right: 120
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "chartreuse"
  }, "Regular"), /*#__PURE__*/React.createElement(Badge, {
    tone: "green"
  }, "Open till 2")), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--weight-black) 32px/0.92 var(--font-display)",
      letterSpacing: "var(--tracking-display)",
      color: "var(--paper-050)"
    }
  }, "Bar Basso"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--paper-200)",
      marginTop: 4
    }
  }, "Porta Venezia \xB7 Milan \xB7 0.9 mi"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px var(--gutter-screen)",
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(RatingPips, {
    value: 4.6,
    size: 20,
    showValue: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-muted)"
    }
  }, "212 reviews from the club")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    value: "4.6",
    label: "Avg tini"
  }), /*#__PURE__*/React.createElement(StatCard, {
    value: "14",
    label: "On the menu"
  }), /*#__PURE__*/React.createElement(StatCard, {
    value: "38",
    label: "Regulars"
  })), /*#__PURE__*/React.createElement(Button, {
    tone: "primary",
    size: "lg",
    icon: "martini",
    block: true,
    onClick: onCompose
  }, "Rate a tini here"), /*#__PURE__*/React.createElement(Tabs, {
    items: ["Menu", "Reviews", "Info"],
    value: tab,
    onChange: setTab,
    style: {
      alignSelf: "flex-start"
    }
  }), tab === "Menu" ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, D.martinis.slice(0, 4).map(m => /*#__PURE__*/React.createElement(MartiniCard, _extends({
    key: m.id
  }, m, {
    bar: "Bar Basso",
    image: "../../assets/photo-martini-lamp.jpg"
  })))) : tab === "Reviews" ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      paddingBottom: 10
    }
  }, D.feed.slice(0, 2).map(r => /*#__PURE__*/React.createElement(ReviewCard, _extends({
    key: r.id
  }, r, {
    bar: "Bar Basso \xB7 Milan",
    image: undefined
  })))) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      paddingBottom: 10,
      font: "var(--type-body)"
    }
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Via Plinio 39, Milan")), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-muted)"
    }
  }, "Open 18:00 \u2013 02:00 \xB7 Tue closed"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-muted)"
    }
  }, "Dim, tiled, loud in the good way. Ask for the coupe.")))));
}
Object.assign(window, {
  BarScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile_app/BarScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile_app/ComposeScreen.jsx
try { (() => {
const {
  AppBar,
  Input,
  RatingPips,
  Chip,
  Button,
  Select,
  Icon,
  Switch
} = window.TiniTimeClubDesignSystem_1636c5;
function ComposeScreen({
  onBack,
  onPost
}) {
  const [rating, setRating] = React.useState(0);
  const [tags, setTags] = React.useState(["Extra dirty"]);
  const toggle = t => setTags(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 34
    }
  }, /*#__PURE__*/React.createElement(AppBar, {
    leadingIcon: "x",
    title: "Rate your tini",
    onLeading: onBack
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "16px var(--gutter-screen) 20px",
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--purple-500)",
      borderRadius: "var(--radius-xl)",
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-eyebrow)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--green-700)"
    }
  }, "Your verdict"), /*#__PURE__*/React.createElement(RatingPips, {
    value: rating,
    size: 34,
    onRate: setRating
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--green-700)"
    }
  }, rating === 0 ? "Taste. Presentation. Judgment." : rating >= 4 ? "Now that's a pour." : "Honest is fine too.")), /*#__PURE__*/React.createElement(Input, {
    label: "Bar",
    icon: "map-pin",
    value: "Bar Basso"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "What did you order?",
    placeholder: "Extra dirty, three olives"
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Base spirit",
    options: ["Gin", "Vodka", "Dealer's choice"]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-label)",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Flavour profile"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, ["Extra dirty", "Bone dry", "Ice cold", "Brine-forward", "Botanical", "Twist"].map(t => /*#__PURE__*/React.createElement(Chip, {
    key: t,
    selected: tags.includes(t),
    onClick: () => toggle(t)
  }, t)))), /*#__PURE__*/React.createElement(Input, {
    label: "Tasting notes",
    multiline: true,
    rows: 4,
    placeholder: "Cold enough to hurt. Say why."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      flex: 1,
      height: 92,
      borderRadius: "var(--radius-md)",
      border: "2px dashed var(--green-300)",
      background: "var(--surface-card-sunk)",
      color: "var(--green-700)",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      font: "var(--weight-bold) 13px/1 var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "camera",
    size: 22
  }), "Add a photo"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 92,
      borderRadius: "var(--radius-md)",
      backgroundImage: "url(../../assets/photo-martini-lamp.jpg)",
      backgroundSize: "cover",
      backgroundPosition: "center"
    }
  })), /*#__PURE__*/React.createElement(Switch, {
    label: "Share to the club feed",
    checked: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px var(--gutter-screen) 20px",
      borderTop: "1px solid var(--line-hairline)",
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    tone: "primary",
    size: "lg",
    block: true,
    onClick: onPost,
    disabled: rating === 0
  }, "Publish your verdict")));
}
Object.assign(window, {
  ComposeScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile_app/ComposeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile_app/DiscoverScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  AppBar,
  SearchField,
  Chip,
  BarCard,
  MartiniCard,
  SectionHeader,
  BottomSheet,
  Button,
  Checkbox
} = window.TiniTimeClubDesignSystem_1636c5;
function DiscoverScreen({
  onOpenBar
}) {
  const D = window.TTC_DATA;
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState("Open now");
  const [sheet, setSheet] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 34,
      background: "var(--surface-ink)"
    }
  }, /*#__PURE__*/React.createElement(AppBar, {
    title: "Discover",
    tone: "ink",
    actions: [{
      icon: "sliders-horizontal",
      label: "Filters",
      onClick: () => setSheet(true)
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 var(--gutter-screen) 14px",
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(SearchField, {
    tone: "onInk",
    value: q,
    onChange: e => setQ(e.target.value),
    onClear: () => setQ("")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      overflowX: "auto"
    }
  }, ["Open now", "Extra dirty", "Gin", "Vodka", "Twist", "< 1 mi"].map(f => /*#__PURE__*/React.createElement(Chip, {
    key: f,
    tone: "onInk",
    selected: filter === f,
    onClick: () => setFilter(f)
  }, f))))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 168,
      position: "relative",
      background: "var(--green-100)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      backgroundImage: "linear-gradient(0deg,rgba(51,102,84,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(51,102,84,.10) 1px,transparent 1px)",
      backgroundSize: "26px 26px"
    }
  }), [[74, 52], [188, 96], [286, 42], [130, 118]].map(([l, t], i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      position: "absolute",
      left: l,
      top: t,
      width: i === 0 ? 34 : 26,
      height: i === 0 ? 34 : 26,
      borderRadius: "50%",
      background: i === 0 ? "var(--chartreuse-500)" : "var(--green-700)",
      border: "3px solid var(--paper-050)",
      boxShadow: "var(--shadow-sm)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 10,
      left: "var(--gutter-screen)",
      right: "var(--gutter-screen)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    tone: "highlight",
    icon: "crosshair"
  }, "24 bars near you"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px var(--gutter-screen) 26px",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "Near you",
    title: "Open right now",
    action: "See all"
  }), D.bars.map(b => /*#__PURE__*/React.createElement(BarCard, _extends({
    key: b.id
  }, b, {
    onClick: onOpenBar
  }))), /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "Trending tonight",
    title: "What the club is drinking",
    style: {
      marginTop: 8
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, D.martinis.map(m => /*#__PURE__*/React.createElement(MartiniCard, _extends({
    key: m.id
  }, m, {
    image: "../../assets/photo-martini-lamp.jpg",
    onClick: onOpenBar
  })))))), /*#__PURE__*/React.createElement(BottomSheet, {
    open: sheet,
    title: "Filter tinis",
    onClose: () => setSheet(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, ["Extra dirty", "Dry", "Gin", "Vodka", "Espresso", "Gibson"].map(t => /*#__PURE__*/React.createElement(Chip, {
    key: t
  }, t))), /*#__PURE__*/React.createElement(Checkbox, {
    label: "Open now",
    checked: true
  }), /*#__PURE__*/React.createElement(Checkbox, {
    label: "Bars I'm a Regular at"
  }), /*#__PURE__*/React.createElement(Button, {
    block: true,
    onClick: () => setSheet(false)
  }, "Show 24 bars"))));
}
Object.assign(window, {
  DiscoverScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile_app/DiscoverScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile_app/FeedScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  AppBar,
  Tabs,
  ReviewCard,
  SectionHeader,
  Avatar,
  Chip,
  Toast
} = window.TiniTimeClubDesignSystem_1636c5;
function FeedScreen({
  onOpenBar,
  onCompose
}) {
  const D = window.TTC_DATA;
  const [tab, setTab] = React.useState("Following");
  const [liked, setLiked] = React.useState({});
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 34
    }
  }, /*#__PURE__*/React.createElement(AppBar, {
    showLogo: true,
    assetBase: "../../assets/",
    actions: [{
      icon: "bell",
      label: "Alerts"
    }, {
      icon: "search",
      label: "Search"
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "14px var(--gutter-screen) 26px",
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--green-900)",
      borderRadius: "var(--radius-xl)",
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-eyebrow)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: "var(--chartreuse-500)"
    }
  }, "Friday"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-black) 30px/0.9 var(--font-display)",
      letterSpacing: "var(--tracking-display)",
      color: "var(--paper-050)",
      textTransform: "lowercase"
    }
  }, "it's tini time \uD83C\uDF78"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--green-300)"
    }
  }, "Friday night and the shaker's calling.")), /*#__PURE__*/React.createElement(Tabs, {
    items: ["Following", "Nearby", "Trending"],
    value: tab,
    onChange: setTab,
    style: {
      alignSelf: "flex-start"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      overflowX: "auto",
      paddingBottom: 2
    }
  }, ["Milo Grant", "Ines Vo", "Theo Marsh", "Priya Raman", "Sam Okoro"].map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 5,
      flex: "0 0 auto",
      width: 62
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: n,
    size: 54,
    ring: i < 2
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-muted)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: 62
    }
  }, n.split(" ")[0])))), /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "The club",
    title: tab === "Following" ? "From your people" : tab === "Nearby" ? "Poured near you" : "Trending tonight"
  }), D.feed.map(r => /*#__PURE__*/React.createElement(ReviewCard, _extends({
    key: r.id
  }, r, {
    liked: !!liked[r.id],
    onLike: () => setLiked(s => ({
      ...s,
      [r.id]: !s[r.id]
    }))
  })))));
}
Object.assign(window, {
  FeedScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile_app/FeedScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile_app/PhoneFrame.jsx
try { (() => {
const PhoneFrame = ({
  children,
  label
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 390,
    height: 780,
    background: "var(--paper-050)",
    borderRadius: 42,
    border: "10px solid #16181A",
    overflow: "hidden",
    position: "relative",
    boxShadow: "var(--shadow-raised)",
    display: "flex",
    flexDirection: "column"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    position: "absolute",
    top: 8,
    left: "50%",
    transform: "translateX(-50%)",
    width: 104,
    height: 26,
    borderRadius: 14,
    background: "#16181A",
    zIndex: 60
  }
}), children), label ? /*#__PURE__*/React.createElement("span", {
  style: {
    font: "var(--type-label)",
    letterSpacing: "var(--tracking-label)",
    textTransform: "uppercase",
    color: "var(--text-muted)"
  }
}, label) : null);
Object.assign(window, {
  PhoneFrame
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile_app/PhoneFrame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile_app/ProfileScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  AppBar,
  Avatar,
  Badge,
  StatCard,
  Tabs,
  ListRow,
  RatingPips,
  BarCard,
  EmptyState,
  Button,
  TiltPillStack
} = window.TiniTimeClubDesignSystem_1636c5;
function ProfileScreen() {
  const D = window.TTC_DATA;
  const [tab, setTab] = React.useState("Journal");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--green-900)",
      padding: "56px var(--gutter-screen) 22px",
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: D.me.name,
    size: 72,
    ring: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--weight-black) 26px/0.95 var(--font-display)",
      letterSpacing: "var(--tracking-display)",
      color: "var(--paper-050)"
    }
  }, D.me.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "chartreuse"
  }, D.me.rank), /*#__PURE__*/React.createElement(Badge, {
    tone: "green"
  }, "Regular \xD77")))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--green-300)"
    }
  }, "Chin up, pinky out. Milan \u2192 DC \u2192 wherever the coupe is cold."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    tone: "ink",
    value: D.me.tinis,
    label: "Tinis logged"
  }), /*#__PURE__*/React.createElement(StatCard, {
    tone: "ink",
    value: D.me.bars,
    label: "Regular at"
  }), /*#__PURE__*/React.createElement(StatCard, {
    tone: "ink",
    value: D.me.followers,
    label: "Followers"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px var(--gutter-screen) 26px",
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    items: ["Journal", "Bars", "Shelf"],
    value: tab,
    onChange: setTab,
    style: {
      alignSelf: "flex-start"
    }
  }), tab === "Journal" ? /*#__PURE__*/React.createElement("div", null, D.journal.map(j => /*#__PURE__*/React.createElement(ListRow, {
    key: j.id,
    title: j.drink,
    subtitle: `${j.bar} · ${j.when}`,
    trailing: /*#__PURE__*/React.createElement(RatingPips, {
      value: j.rating
    }),
    chevron: true
  }))) : tab === "Bars" ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, D.bars.filter(b => b.regular || b.rating > 4.3).map(b => /*#__PURE__*/React.createElement(BarCard, _extends({
    key: b.id
  }, b)))) : /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--green-900)",
      borderRadius: "var(--radius-xl)",
      padding: 20
    }
  }, /*#__PURE__*/React.createElement(TiltPillStack, {
    items: ["Dirty", "Dry", "Gibson"],
    size: 26
  })))));
}
Object.assign(window, {
  ProfileScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile_app/ProfileScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile_app/data.js
try { (() => {
window.TTC_DATA = {
  me: {
    name: "Nadia Fereday",
    rank: "Top shelf",
    tinis: 128,
    bars: 7,
    followers: 412
  },
  feed: [{
    id: 1,
    author: "Milo Grant",
    rank: "Regular",
    when: "22 min ago",
    drink: "Extra dirty, three olives",
    bar: "Bar Basso · Milan",
    rating: 5,
    notes: "Cold enough to hurt. Brine-forward without going full seawater. The olives were the good kind.",
    tags: ["Extra dirty", "Gin", "Ice cold"],
    image: "../../assets/photo-martini-lamp.jpg",
    likes: 42,
    comments: 7
  }, {
    id: 2,
    author: "Ines Vo",
    rank: "Top shelf",
    when: "1h ago",
    drink: "Vesper, lemon twist",
    bar: "Silver Lyan · Washington DC",
    rating: 4,
    notes: "Stirred to within an inch of its life. The twist does a lot of heavy lifting here.",
    tags: ["Gin", "Twist"],
    likes: 28,
    comments: 3
  }, {
    id: 3,
    author: "Theo Marsh",
    when: "3h ago",
    drink: "Espresso martini (yes, it counts)",
    bar: "Coupe & Co · Bushwick",
    rating: 4,
    notes: "Friday's forecast: 100% chance of caffeine. No regrets.",
    tags: ["Espresso"],
    likes: 61,
    comments: 12
  }],
  bars: [{
    id: 1,
    name: "Silver Lyan",
    area: "Penn Quarter",
    distance: "0.4 mi",
    rating: 4.8,
    openNow: true,
    regular: true
  }, {
    id: 2,
    name: "Bar Basso",
    area: "Porta Venezia",
    distance: "0.9 mi",
    rating: 4.6,
    openNow: true
  }, {
    id: 3,
    name: "The Long Pour",
    area: "Shoreditch",
    distance: "1.2 mi",
    rating: 4.1,
    openNow: false
  }, {
    id: 4,
    name: "Coupe & Co",
    area: "Bushwick",
    distance: "1.8 mi",
    rating: 4.4,
    openNow: true
  }],
  martinis: [{
    id: 1,
    name: "Dirty Gibson",
    bar: "Bar Basso",
    city: "Milan",
    rating: 4.6,
    reviews: 212,
    spirit: "Gin",
    trending: true
  }, {
    id: 2,
    name: "Filthy Vodka",
    bar: "The Long Pour",
    city: "London",
    rating: 4.2,
    reviews: 88,
    spirit: "Vodka"
  }, {
    id: 3,
    name: "House Vesper",
    bar: "Silver Lyan",
    city: "DC",
    rating: 4.8,
    reviews: 341,
    spirit: "Gin",
    trending: true
  }, {
    id: 4,
    name: "Espresso, obviously",
    bar: "Coupe & Co",
    city: "Brooklyn",
    rating: 4.4,
    reviews: 156,
    spirit: "Vodka"
  }],
  journal: [{
    id: 1,
    drink: "Extra dirty, three olives",
    bar: "Bar Basso",
    when: "Tonight",
    rating: 5
  }, {
    id: 2,
    drink: "Vesper, lemon twist",
    bar: "Silver Lyan",
    when: "Tue",
    rating: 4
  }, {
    id: 3,
    drink: "50/50 with orange bitters",
    bar: "Home",
    when: "Sun",
    rating: 3
  }, {
    id: 4,
    drink: "Gibson, extra onion",
    bar: "The Long Pour",
    when: "Last Fri",
    rating: 4
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile_app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.BentoGrid = __ds_scope.BentoGrid;

__ds_ns.BentoTile = __ds_scope.BentoTile;

__ds_ns.StickerBadge = __ds_scope.StickerBadge;

__ds_ns.TiltPill = __ds_scope.TiltPill;

__ds_ns.TiltPillStack = __ds_scope.TiltPillStack;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.AppIcon = __ds_scope.AppIcon;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.ListRow = __ds_scope.ListRow;

__ds_ns.RatingPips = __ds_scope.RatingPips;

__ds_ns.SectionHeader = __ds_scope.SectionHeader;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.BarCard = __ds_scope.BarCard;

__ds_ns.MartiniCard = __ds_scope.MartiniCard;

__ds_ns.ReviewCard = __ds_scope.ReviewCard;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.SearchField = __ds_scope.SearchField;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.AppBar = __ds_scope.AppBar;

__ds_ns.BottomSheet = __ds_scope.BottomSheet;

__ds_ns.SiteHeader = __ds_scope.SiteHeader;

__ds_ns.TabBar = __ds_scope.TabBar;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
