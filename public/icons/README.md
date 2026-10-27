# Class and spec icons

Saved from WarcraftLogs so they are not fetched at runtime:
`https://assets.rpglogs.com/img/warcraft/icons/<key>.jpg`

Files are named by the WarcraftLogs icon key: `<Class>-<Spec>.jpg` for specs (e.g. `DeathKnight-Blood.jpg`,
`Hunter-BeastMastery.jpg`) and `<Class>.jpg` for classes (e.g. `Priest.jpg`). Spaces are removed from names.
`specIconUrl` in `src/lib/pulls.ts` builds the `/icons/...` path. A new spec needs its file added here;
until then the image fails to load and the UI hides it.
The icons are Blizzard artwork served by WarcraftLogs.
