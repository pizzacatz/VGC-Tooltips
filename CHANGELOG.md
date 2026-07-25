# Changelog

## v1.2

**Supported sites** — the extension previously ran only on Pokémon Showdown. It now also runs on:

- **PokePaste** (`pokepast.es`) — every set on a paste.
- **Limitless** (`play.limitlesstcg.com`, `limitlessvgc.com`) — team lists, and the item/move/ability usage tables on `limitlessvgc.com/pokemon/<name>`.
- **Limitless Standings** (`standings.limitlessvgc.com`) — team lists, including ones loaded by in-app navigation.

Where a page is scanned is now per-site, so navigation and page furniture are left alone. On the new sites the page's own text colouring is preserved and terms are marked with the dashed underline alone; Showdown is unchanged.

**Fixed: script injection from chat text.** The scanner built its replacements as an HTML string and assigned them to `innerHTML`, which re-parsed text Showdown had already escaped. A chat message containing both a known name and markup — `Pikachu <img src=x onerror=...>` — became live DOM and executed. Terms are now wrapped by building DOM nodes, so text that is not a match can never become an element. Tooltip text is inserted with `textContent` for the same reason, which also fixes descriptions containing `>` or `&` rendering incorrectly (Zen Mode, Max Guard, Photon Geyser).

**Fixed: names belonging to two libraries.** The four data libraries were merged with a spread, so items overwrote moves and the move **Metronome** was unreachable — a log line reading "Pikachu used Metronome!" showed a pink item underline and a tooltip about consecutive-turn damage. Each name now maps to a list of candidates, and every occurrence is resolved to the category the page means, from either the surrounding wording (Showdown, PokePaste) or the enclosing markup (Limitless). The underline colour and the tooltip always agree.

**New log lines highlight immediately.** A 2-second polling loop was replaced with a single document-level `MutationObserver`, so lines are marked up as they arrive and nothing runs while a page is idle.

**Licensing.** Added the MIT license and `THIRD-PARTY-NOTICES.md`, recording that the bundled `.ts` sources are verbatim Pokémon Showdown (MIT), that the four JSON libraries are derived from them, and the Nintendo/Creatures/GAME FREAK trademark disclaimer.

**Build.** The root `build.js` could not run at all: it required `ts-node`/`prompts`, which were absent from the root `package.json`, and looked for sources in the wrong directory. It now resolves sources and outputs from its own location, takes targets as arguments (`node build.js moves items`), mirrors all 12 shipping files into `/dist` so the two copies cannot drift, and reports two classes of mistake that are otherwise silent: a name appearing in more than one data library, and a site listed under `content_scripts` but missing from `web_accessible_resources`.

**Removed.** `test.js`, a superseded copy of the tooltip renderer that was never a test and was not loaded by anything.

## v1.1

- Fixed a Firefox storage sync delay.

## v1.0

- Initial release: Pokémon, move, item, and ability tooltips for Pokémon Showdown battle logs.
