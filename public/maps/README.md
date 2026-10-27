# Dungeon map images

Saved from Wowhead so they are not fetched at runtime:
`https://wow.zamimg.com/images/wow/maps/enus/original/<wowhead zone id>[-<floor>].jpg`

Files are named `<WarcraftLogs gameZone id>-<floor index>.jpg`. Floor 1 is the Wowhead zone id,
floor 2 is `<id>-1`, floor 3 is `<id>-2`. Which WarcraftLogs map id is which floor is a best guess
(order of first appearance in a run) and is set in `src/lib/dungeon-maps.ts`, along with the
world-coordinate bounds used to place pulls on each image.

| WCL zone | Dungeon              | Wowhead zone |
| -------- | -------------------- | ------------ |
| 1762     | Kings' Rest          | 9526         |
| 1877     | Temple of Sethraliss | 9527         |
| 2521     | Ruby Life Pools      | 14063        |
| 2859     | The Blinding Vale    | 16359        |
| 2923     | Voidscar Arena       | 16425        |
| 2993     | Altar of Fangs       | 16865        |

Murder Row (WCL zone 2813) has no image yet; the route view falls back to a plain canvas.
The images are Blizzard artwork served by Wowhead.
