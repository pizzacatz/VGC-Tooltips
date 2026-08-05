# Third-Party Notices

This project bundles and derives from third-party material. The notices below
apply to that material only; everything else is covered by [LICENSE](LICENSE).

---

## Pokémon Showdown

The following files are taken verbatim from the Pokémon Showdown repository
(<https://github.com/smogon/pokemon-showdown>):

- `data files/pokedex.ts`
- `data files/moves-data.ts`
- `data files/moves-text.ts`
- `data files/items.ts`
- `data files/abilities.ts`
- `data files/natures.ts` (retained for reference; no longer read by the build)

The five data libraries the extension ships — `pokemon.json`, `moves.json`,
`items.json`, `abilities.json`, and `natures.json` (and their copies in
`dist/`) — are generated from those files by `build.js` and are therefore
derivative works of them.

Pokémon Showdown is distributed under the MIT License:

```
The MIT License (MIT)

Copyright (c) 2011-2026 Guangcong Luo and other contributors http://pokemonshowdown.com/

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

---

## champions-logic

`data files/champions-logic-mb.json` is the consolidated Regulation M-B export
from the champions-logic project
(<https://github.com/pizzacatz/champions_logic>), a sibling project by the same
author as this one. Where it and the Showdown sources disagree about something
legal in Pokémon Champions, it is what the generated libraries use.

Its own data has two origins, both recorded per row in the export's `sources`
list: the majority is Pokémon Showdown-derived and so is covered by the MIT
notice above, and the Champions-specific parts — the Regulation M-B roster, the
PP scheme, move Classifications, and the Champions-original Mega abilities and
stones — are the author's own in-game observation, together with published
regulation listings from Serebii, Victory Road, Game8 and Pokémon.com.

> The champions-logic repository does not currently carry a LICENSE file. It is
> first-party to this project, so distribution is not blocked, but adding one
> would make the terms explicit for anyone else redistributing either project.

---

## Pokémon

Pokémon and all related names are trademarks of Nintendo, Creatures Inc., and
GAME FREAK Inc. This project is an unofficial, non-commercial fan tool. It is
not affiliated with, endorsed by, or sponsored by Nintendo, Creatures, GAME
FREAK, The Pokémon Company, Smogon, or Pokémon Showdown.
