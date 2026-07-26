# VGC Tooltips (v1.4.0)

A professional-grade Google Chrome and Firefox extension designed to inject competitive Pokémon VGC (Video Game Championships) data directly into the sites you already read teams and battles on. This project focuses on high-speed information delivery with a "Perfect Grid" geometric aesthetic inspired by *Pokémon Scarlet & Violet*.

## 🌐 Supported Sites

| Site | Where it runs | How terms are told apart |
| --- | --- | --- |
| **Pokémon Showdown** (`play.` / `replay.`) | The battle log and chat (`.battle-history`) | Wording — "Pikachu **used** Metronome!" is a move, "Incineroar**'s** Metronome" is an item |
| **PokePaste** (`pokepast.es`) | Each set (`article pre`) | Set format — the item is whatever follows **`@`**, an ability follows `Ability:`, a move follows `-` |
| **Limitless** (`play.limitlesstcg.com`, `limitlessvgc.com`) | Team lists (`.teamlist`) and the usage tables on `/pokemon/<name>` (`.stats-tables`) | Markup — the item, ability, and move lists are separate elements (`.item`, `.ability`, `.attacks`/`.moves`), and each usage table is titled by its heading |
| **Limitless Standings** (`standings.limitlessvgc.com`) | Page content (`.container.content`) | Markup — `.item` and `.ability` as above; the species is a `/pokemon/` link and moves are the `<ul>` beside them |

Both Limitless sites cover **Pokémon Champions** events as well as Scarlet/Violet ones. Champions team sheets write `Stat Alignment: <name>` in the field that SV events use for `Tera Type:`, so the bare alignment name is matched inside that field (`.nature`, `.tera`) and nowhere else.

**Saved local files** (`file:///*`) have no hostname, so they match no profile and fall back to the first one — Showdown. That is deliberate: the only local files worth scanning are saved replay `.html` files, and they carry `.battle-history` like the live site. It also means an *arbitrary* local page shows nothing, even one containing a team paste, because `article pre` is never the container there. Test the local path with a real saved replay, not a hand-written page.

Scanning is confined to the containers above, so navigation, chat headers, and page furniture are left alone. On PokePaste and Limitless the site's own text colouring is preserved and only the dashed underline is added; on Showdown, terms are recoloured as before.

Adding another site means one entry in `SITE_PROFILES` in `content.js`, plus the match pattern in **both** of `manifest.json`'s lists — `content_scripts.matches` and `web_accessible_resources.matches`. Miss the second and the script loads but cannot fetch its data; `node build.js` fails if the two lists disagree.

## 🌟 Core Functionality

The extension scans the supported pages above in real-time using an optimized TreeWalker "Scanner Engine." When it detects a relevant term, it highlights the word with a category-specific dashed underline. Hovering over these words reveals a custom-built, high-contrast tooltip. On Showdown the scanner also watches for new battle-log lines and highlights them as they arrive.

A name can belong to more than one library — **Metronome** is both a move and an item — so each match is resolved to the category the page actually means, using either the surrounding wording or the enclosing markup (see the table above). The underline colour and the tooltip always agree. `node build.js` warns if a future data update introduces another such name.

### Data Categories & Visual Language:
- **POKÉMON:** Blue dashed underline. Tooltips feature a horizontal bar graph of base stats (scaled to 255) for instant visual comparison.
- **MOVES:** Yellow dashed underline. Tooltips show a 4-column grid (Power, Accuracy, PP, Priority) and the move's **Classifications** — see below.
- **ABILITIES:** Green dashed underline. Provides concise descriptive text in a white-bordered frame.
- **ITEMS:** Pink dashed underline. Provides item effects in a sleek gray-bordered frame.
- **STAT ALIGNMENT:** Violet dashed underline. Shows the raised and lowered stat side by side (green/red) with no explanatory sentence, since the boxes already say it; the five neutral alignments have no boxes and say so in words instead. *Stat Alignment* is the official term and the tooltip always uses it, with the bare name as the heading — so a mainline sheet's `Adamant Nature` and a Pokémon Champions sheet's `Stat Alignment: Adamant` produce an identical tooltip. Both spellings are matched: the full phrase anywhere, and the bare name *only* inside the alignment field on Limitless, because bare names are ordinary words (Bold, Calm, Serious, Naive) that would otherwise light up chat.

### Move Classifications

**Classification** is what Pokémon Champions calls a move's properties, and it labels exactly **twelve** of them. Pokémon Showdown calls the same idea a *move flag* and tracks **39**, so the tooltip shows the twelve under the game's own names and nothing else:

| Champions Classification | Showdown flag | | Champions Classification | Showdown flag |
| --- | --- | --- | --- | --- |
| Punching | `punch` | | Pulse | `pulse` |
| Sound-Based | `sound` | | Biting | `bite` |
| Dance | `dance` | | Healing | `heal` |
| Slicing | `slicing` | | Ball & Bomb | `bullet` |
| Wind | `wind` | | Explosive | `explosive` |
| Powder | `powder` | | Mental | `mental` |

Pills render in the order the game's own move-filter list uses, so they read the same sequence they do in Champions.

**Contact** is shown too, as a thirteenth pill after the others. Champions does not label it, so it is not a Classification — but it is on 166 moves and is the most consequential property in battle, since Rough Skin, Static, Flame Body, Rocky Helmet and Iron Barbs all read it. Omitting it would hide a real rule. It is styled the same as the rest and distinguished only by coming last.

Four of the twelve need data the Showdown source cannot supply on its own, for two different reasons, so their membership is hand-listed in `CHAMPIONS_OVERLAY` in `build.js`:

- **Explosive** and **Mental** are Champions-native — the flags do not exist upstream at all, so a Showdown-derived tooltip gets silence rather than a wrong answer. Explosive is Explosion, Self-Destruct and Misty Explosion; Mental is Taunt, Attract, Encore, Disable and Torment. Both lists are closed.
- **Slicing** and **Sound-Based** exist upstream but Champions puts them on five moves Scarlet/Violet does not: Crush Claw, Dire Claw, Dragon Claw and Shadow Claw are Slicing, and Dragon Cheer is Sound-Based. This is live in play — Sharpness boosts Slicing, Soundproof blocks Sound-Based.

Everything above was verified against the `champions-logic` MCP server, which is authoritative for Regulation M-B: all 145 Classification assignments across the 139 M-B-legal moves that have any, plus the per-Classification totals in its `move-classifications` document. Note that its `divergence-from-showdown` document claims flag *membership* agrees with Showdown apart from the two native Classifications — its own data disagrees for those five moves, and the data is what was checked.

> **Mental is not the Mental Herb cure list**, despite being the same five moves. The item keys on the volatile condition the holder ends up with, not on this property. The overlap is a coincidence of naming, so don't describe either in terms of the other.

---

## 📂 File Architecture

### Extension Core (The "Dist" Files)
These files are the engine that runs in your browser. They are also duplicated in the `/dist` folder for clean production use.
- **`manifest.json`**: The extension's "instruction manual." Defines permissions, content scripts, and cross-browser compatibility settings.
- **`content.js`**: The primary logic. Contains the site profiles, the Scanner Engine, the mouseover event delegation, and the tooltip generation logic.
- **`styles.css`**: The visual heart of the project. Defines the "Perfect Grid" geometry, the Pecha Berry-inspired colors, and the typography (Verdana/Monaco).
- **`popup.html` / `popup.js`**: The user interface for the browser toolbar. Allows users to toggle tooltips on/off without refreshing the page.

### Data Libraries (JSON)
Generated from source code to ensure the extension remains lightweight and fast.
- **`pokemon.json`**: Name, Types, and HP/Atk/Def/SpA/SpD/Spe stats.
- **`moves.json`**: Name, Type, Category, Stats, Priority, `classifications` (official Champions labels, omitted when a move has none), and `contact`.
- **`items.json`**: Name and descriptive effect.
- **`abilities.json`**: Name and short description.
- **`natures.json`**: Stat Alignments. Keyed on the full phrase (`Adamant Nature`), with the bare name and the raised and lowered stat. The files and code keep the name *nature* because that is what the upstream Showdown source calls them.

### Development & Build Tools
- **`build.js`**: A custom Node.js script. Converts raw TypeScript source files (`.ts`) from Pokémon Showdown into the optimized `.json` libraries used by the extension, then mirrors every shipping file into `/dist`.
- **`generate_icons.js`**: A Node.js canvas script used to programmatically generate the 16x16, 48x48, and 128x128 icons from the source Pecha Berry artwork.

### Design Archive (Concepts)
These files record the evolution of the UI and can be used for future reference:
- **`icon_concepts.html`**: A showcase of 12+ icon directions including the final "Pecha-Tech" hybrid.
- **`design_perfect_grid.html`**: The prototype for the final stat grid and ribbon system.
- **`design_highlight_showcase.html`**: A comparison of 9 different ways to underline and color terms on the page.
- **`design_showcase.html` / `design_p3_variations.html`**: Initial UI explorations based on the Rotom-Phone and Scarlet/Violet menus.

---

## 🛠 Developer Workflow

0. **Install tooling:** `npm install` (once).
1. **Update Data:** Drop new `.ts` files from the Showdown repository into `/data files` (the repo root also works) and run:
   - `npm run build` — rebuilds all five libraries, or
   - `node build.js moves items` — rebuilds only the named targets (`pokemon`, `moves`, `items`, `abilities`, `natures`, `all`). With no arguments it prompts interactively.
2. **Test:** Load the root folder as an "Unpacked Extension" in Chrome Developer Mode, or run `npm run run:firefox` to open a temporary Firefox profile with `/dist` loaded.
3. **Deploy:** The build copies all 13 shipping files into `/dist` automatically — use that folder for distribution. Pass `--no-dist` to skip the copy, or `node build.js sync` to refresh `/dist` after a code-only change.

The build also reports seven things that are otherwise silent, because each one fails at runtime in a way that looks like something else:

| Check | What it would look like if missed |
| --- | --- |
| A name appearing in more than one data library | One category silently shadows the other |
| A site under `content_scripts` but missing from `web_accessible_resources.matches` | The script loads, then fetches nothing — indistinguishable from "site not supported" |
| A data library missing from `web_accessible_resources.resources` | That category never appears anywhere |
| `manifest.json` disagreeing with `package.json` on the version | Browsers see no update |
| `browser_specific_settings.gecko.id` missing | Firefox keys `storage.sync` on the add-on ID, so the popup toggle does nothing — and Chrome ignores the key, so the bug is Firefox-only |
| A `CHAMPIONS_OVERLAY` move name not found in `moves-data.ts` (fatal) | An upstream rename would drop that Classification from the tooltip silently, rather than fail |
| A `CHAMPIONS_OVERLAY` row the source now carries itself (warning) | The hand-written row is dead weight, and nobody can tell which rows are still load-bearing |

### Publishing to addons.mozilla.org

```sh
npm run build            # or: node build.js sync
npm run lint:firefox     # the same validator AMO runs on upload
npm run package:firefox  # writes web-ext-artifacts/showdown_tooltips-<version>.zip
```

Upload that zip at [addons.mozilla.org/developers/addon/submit/distribution](https://addons.mozilla.org/developers/addon/submit/distribution). Bump the version in **both** `manifest.json` and `package.json` first — AMO rejects a re-upload of a version it has already seen, and the build fails if the two disagree.

`lint:firefox` reports one warning that is expected and safe to leave: `UNSAFE_VAR_ASSIGNMENT` on the `tooltip.innerHTML` assignment in `content.js`. Everything interpolated there is either a hardcoded string or a value from the bundled JSON libraries; every piece of text that originates from the page is assigned through `textContent` or `createTextNode` instead. Worth saying so in the reviewer notes.

---

## 🔐 Permissions

- **`storage`** — remembers the single on/off toggle from the popup. Nothing else is stored, and nothing is ever sent anywhere; the extension makes no network requests.
- **Site access to `play.pokemonshowdown.com`, `replay.pokemonshowdown.com`, `pokepast.es`, `play.limitlesstcg.com`, `limitlessvgc.com`, and `standings.limitlessvgc.com`** — where the scanner runs. Each host is listed exactly (plus `www.`), so no other subdomain is granted access.
- **Site access to `file:///*`** — so the extension also works on replay `.html` files you have saved locally. Chrome keeps this switched **off** by default; it only applies if you turn on *Allow access to file URLs* for this extension in `chrome://extensions`. Firefox exposes no equivalent per-extension toggle, so if you rely on saved replays there, confirm it with `npm run run:firefox` opening an actual saved replay — a hand-written local page will show nothing whether or not the permission works, so it cannot tell you anything. If you never open saved replays, leave it off, or delete the two `file:///*` entries from `manifest.json`.

---

## 📝 Changelog

Version history is in [CHANGELOG.md](CHANGELOG.md).

---

## 📜 License

Released under the [MIT License](LICENSE).

The bundled Pokémon data is generated from [Pokémon Showdown](https://github.com/smogon/pokemon-showdown), which is also MIT licensed — see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for the full attribution.

Pokémon and all related names are trademarks of Nintendo, Creatures Inc., and GAME FREAK Inc. This is an unofficial, non-commercial fan project with no affiliation to Nintendo, The Pokémon Company, Smogon, or Pokémon Showdown.
