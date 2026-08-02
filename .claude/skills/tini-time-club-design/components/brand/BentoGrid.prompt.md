Marketing and social layouts: alternate deep green, brand green, chartreuse and one full-bleed photo tile. 28px radius, never a border.

```jsx
<BentoGrid columns={2}>
  <BentoTile tone="green"><StatCard .../></BentoTile>
  <BentoTile tone="photo" rowSpan={2} image="../../assets/photo-martini-lamp.jpg" />
</BentoGrid>
```
