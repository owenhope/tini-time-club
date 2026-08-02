import React from "react";

/* Lucide (2px stroke, 24px grid) fetched once per glyph and rendered INLINE,
   so the SVG inherits currentColor. If a glyph is unavailable the span stays
   empty and transparent — it must never degrade to a filled block.
   SUBSTITUTION: no icon set was supplied with the brand assets. */
const LUCIDE = "https://unpkg.com/lucide-static@0.469.0/icons/";
const CACHE = {};

function useGlyph(name) {
  const [svg, setSvg] = React.useState(() => CACHE[name]);
  React.useEffect(() => {
    if (CACHE[name]) { setSvg(CACHE[name]); return; }
    let alive = true;
    fetch(LUCIDE + name + ".svg")
      .then(r => (r.ok ? r.text() : null))
      .then(text => {
        if (!text) return;
        const markup = text
          .replace(/<\?xml[^>]*\?>/g, "")
          .replace(/width="24"/, 'width="100%"')
          .replace(/height="24"/, 'height="100%"');
        CACHE[name] = markup;
        if (alive) setSvg(markup);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [name]);
  return svg;
}

export function Icon({ name, size = 24, color = "currentColor", style, ...rest }) {
  const svg = useGlyph(name);
  return (
    <span
      aria-hidden="true"
      data-icon={name}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flex: "0 0 auto",
        color,
        background: "transparent",
        ...style,
      }}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      {...rest}
    />
  );
}
