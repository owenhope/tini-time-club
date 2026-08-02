# Mobile app UI kit

Five screens of the Tini Time Club app, composed entirely from this design system's components.

| File | Screen |
|---|---|
| `FeedScreen.jsx` | Community feed — tini-time banner, story rail, Following/Nearby/Trending tabs, review cards |
| `DiscoverScreen.jsx` | Search + filters on a green header, map stub with pins, nearby bars, trending grid, filter sheet |
| `BarScreen.jsx` | Bar detail — full-bleed photo with scrim and sticker, stats, menu/reviews/info tabs |
| `ComposeScreen.jsx` | Review composer — olive rating on purple, flavour chips, notes, photo, publish |
| `ProfileScreen.jsx` | Profile on deep green — rank badges, stats, journal / bars / shelf tabs |
| `App.jsx` | Click-through shell: tab bar, bar detail push, composer, success toast |
| `data.js` | Fake content (`window.TTC_DATA`) |
| `PhoneFrame.jsx` | 390×780 device frame |

The left frame in `index.html` is interactive: switch tabs, open a bar, tap **Rate**, set an olive rating and publish — a toast confirms and the Journal tab picks up a dot.

**Caveat:** the map is a stubbed grid with pins, not a real map — no mapping provider was specified.
