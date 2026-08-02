Use `Icon` for every piece of UI iconography — never inline an SVG and never use emoji as an icon.

```jsx
<Icon name="map-pin" size={20} color="var(--green-700)" />
```

Names are Lucide kebab-case; the glyph is fetched once and rendered inline so `currentColor` applies. On green surfaces pass `color="var(--chartreuse-500)"`. 2px stroke is fixed by the source set; do not scale below 16px.
