# Changelog

## v1.5.0

**Form Pokémon and Mega Evolutions now work on Limitless, where none of them did.** The data libraries are keyed on Pokémon Showdown's species names — `Rotom-Wash`, `Raichu-Alola`, `Charizard-Mega-Y` — which is exactly what Showdown and PokePaste print. Limitless prints natural English form names instead: *Wash Rotom*, *Alolan Raichu*, *Mega Charizard Y*. The scanner matches literal text with no normalisation, so on Limitless every one of them was silently missing: no underline, no tooltip, and nothing on the page to suggest anything was wrong. Base species like Incineroar matched fine, which is what kept it hidden.

That is **28 form species and 76 Mega forms**, on the site the extension is most used with.

The naming is not derivable by rule — Limitless writes "Wash Rotom" but "Lycanroc Dusk", "Female Meowstic" but "Eternal Flower Floette", "Paldean Tauros Blaze Breed" but plain "Paldean Tauros" — so the table is read off the site rather than invented. `fetch_limitless_aliases.js` fetches one page per Champions-legal form and Mega and records the `<h1>`, writing `data files/limitless-aliases.json`: **65 names verified** against the live site, **36 derived**, **3 omitted**. Each alias is registered as an extra key onto the same record, never a replacement, so `Rotom-Wash` and `Wash Rotom` both resolve to one tooltip and Showdown, PokePaste and Limitless all keep working.

The 36 derived entries are the Champions-original Megas, which limitlessvgc.com has no page for because it covers Scarlet/Violet. All 41 Mega pages that did resolve are `Mega <base>` without exception, so the rest follow that rule, anchored on the Champions export's `base_slug` rather than string-stripping — which is why `Meowstic-F-Mega` correctly becomes *Mega Female Meowstic* and `Floette-Mega` becomes *Mega Eternal Flower Floette*. The three omitted are Gourgeist's size forms: Limitless has no page and no sibling to infer from, and a wrong alias is worse than a missing one.

Longest-match ordering was verified to hold for every alias, so `Wash Rotom` matches whole rather than resolving to the base `Rotom` it contains, and `Mega Eternal Flower Floette` does not collapse into `Eternal Flower Floette`. Bare `Rotom` still resolves to base Rotom. No alias collides with an existing species name; the build refuses to overwrite one, and fails outright if an alias points at a species that no longer exists.

**The data is now Champions-first.** Where Pokémon Champions and Pokémon Showdown disagree about something legal in Champions, Champions wins; Showdown still supplies everything Champions does not cover, which is most of the dex, so Scarlet/Violet pages keep working.

v1.4.0 fixed the *vocabulary* — the tooltip used Champions' names for a move's properties. This fixes the *numbers*, which turned out to be wrong far more often:

- **PP was wrong on 404 of the 500 legal moves.** Champions uses its own PP scheme entirely: it only ever assigns 1, 8, 12, 16 or 20, where Showdown uses 5 through 40 in steps of five. Shadow Ball is 16, not 15. Protect is 8, not 10. Drain Punch is 12, not 10.
- **Twelve moves had the wrong power** (Beak Blast 120 not 100, Trop Kick 85 not 70), **four the wrong accuracy** (Crabhammer 95 not 90; Clangorous Soul never misses), and **two the wrong type** — Growth is Grass in Champions and Snap Trap is Steel.
- **Ten move descriptions were wrong**, several of them real rebalances rather than wording: Iron Head flinches 20% of the time rather than 30%, Moonblast drops Sp. Atk 10% rather than 30%, Salt Cure ticks 1/16 rather than 1/8, Make It Rain and Toxic Thread lower two stages rather than one, and Freeze-Dry has no freeze chance at all.
- **Two ability descriptions were wrong**: Healer cures 50% of the time, not 30%, and Unseen Fist also deals 1/4 damage through protection.
- **Eleven entries were missing entirely** and showed no tooltip at all: the Mega-only abilities **Eelevate** (Eelektross-Mega) and **Fire Mane** (Pyroar-Mega), plus nine Champions-original Mega Stones — Staraptite, Raichunite X and Y, Chimechite, Crabominite, Glimmoranite, Golurkite, Meowsticite and Scovillainite. None of these exist in Showdown, so nothing upstream could have supplied them.

**Stat Alignments are now Champions' 21, not mainline's 25.** Bashful, Docile, Hardy and Quirky do not exist in Champions, and Serious is the only neutral alignment rather than one of five. The four are gone, and the neutral text now says *Stat Alignment* rather than *nature*.

The deliberate cost: a Scarlet/Violet page now shows Champions numbers for anything Champions also has, and the four mainline-only alignments get no tooltip. Hovering Shadow Ball on a saved Showdown replay reads 16 PP — right for Champions, wrong for SV. Reverting is one branch per library in `build.js`.

Species base stats and typing were compared across all 235 legal species and agree exactly, so `pokemon.json` stays Showdown-sourced and keeps full-dex coverage.

**Adds `data files/champions-logic-mb.json`** — the consolidated Regulation M-B export from the `champions-logic` project, committed alongside the Showdown `.ts` sources so builds are reproducible. It carries its own `data_version` and `data_revision`, both printed by the build. This retires the hand-written `CHAMPIONS_OVERLAY` from v1.4.0: the export states each move's Classifications outright, so the four that could not be derived from Showdown are no longer maintained by hand. The flag-to-label table stays, for the moves Champions does not cover. `data files/natures.ts` is no longer read.

Verified against the export in full: all 500 moves on every displayed field, all 201 abilities, all 148 items and all 21 alignments.

## v1.4.0

**Renamed to VGC Tooltips**, which is what the popup, the repository and `package.json` already called it — `manifest.json` was the only place still reading *Showdown Tooltips*, and the name had stopped being accurate once PokePaste and Limitless were supported.

**Move properties now use Pokémon Champions' own vocabulary.** Champions calls them **Classifications** and labels exactly twelve; Showdown calls the same idea a *move flag* and tracks 39. The tooltip previously rendered raw flag keys through a denylist, which let every unrecognised flag through — so a move showed `ALLYANIM` (a Showdown animation hint) and `NOSKETCH` (inert in this format, Sketch is not legal) beside genuine properties, while `heal` sat in the ignore list even though **Healing** is one of the official twelve. Drain Punch showed `PUNCH` and `CONTACT` and omitted that it heals.

That denylist is now an allowlist of the twelve, each carrying its official label, rendered in the order the game's own move-filter list uses:

`sound` → **Sound-Based** and `bullet` → **Ball & Bomb** are the two renames. **Explosive** and **Mental** are new, and **Healing** is no longer dropped. `punch`, `slicing`, `wind`, `powder`, `pulse`, `bite` and `dance` keep their labels but are now displayed because they are official, not because they survived a filter.

**Contact** is kept, as a thirteenth pill after the twelve. Champions does not name it, so it is not a Classification — but it is on 166 moves and is the most consequential property in battle, since Rough Skin, Static, Flame Body, Rocky Helmet and Iron Barbs all read it, and dropping it would hide a real rule.

Four Classifications cannot be derived from the Showdown source and are hand-listed in `CHAMPIONS_OVERLAY`. **Explosive** and **Mental** are Champions-native: the flags do not exist upstream at all, so a Showdown-derived tooltip gets silence rather than a wrong answer. **Slicing** and **Sound-Based** do exist upstream, but Champions puts them on five moves Scarlet/Violet does not — Crush Claw, Dire Claw, Dragon Claw and Shadow Claw are Slicing, and Dragon Cheer is Sound-Based — which is live in play, since Sharpness boosts Slicing and Soundproof blocks Sound-Based.

All twelve were verified against the `champions-logic` MCP server: every one of the 145 Classification assignments across the 139 M-B-legal moves that carry any, checked in both directions, plus the per-Classification totals from its `move-classifications` document.

`moves.json` drops its `flags` object for a `classifications` array of finished labels plus a `contact` boolean, both omitted when they do not apply, so `content.js` has no vocabulary of its own to keep in sync. The pill styling moves out of inline attributes into `.vgc-pill` in `styles.css`, and a second dead denylist in `content.js` — three flags `build.js` had already stripped — is gone.

`build.js` gains two checks on the hand-written overlay: it fails if a listed move name is not in `moves-data.ts` (an upstream rename would otherwise drop that Classification silently) and warns if the source has caught up and a row is now redundant.

**Fixes a latent bug in the version check.** It stripped a trailing `.0` from `package.json`'s version to let `1.2.0` match a manifest reading `1.2`, which also turned `1.4.0` into `1.4` and reported a mismatch against an identical `1.4.0`. Every `x.y.0` release would have tripped it; this one did. Both sides are now padded to `major.minor.patch` before comparing.

## v1.3.4

**Makes the extension actually work in Firefox, ahead of listing it on addons.mozilla.org.** The README has claimed Firefox support since v1.1, but two things were wrong.

The popup toggle did nothing. `content.js` and `popup.js` read the saved state with a callback, which is Chrome's calling convention; Firefox's `browser.*` APIs are promise-only, so the callback never ran and `tooltipsEnabled` stayed at its default of `true` no matter what the popup said. Both files now read the promise that Chrome and Firefox each return when no callback is passed, so one form covers both.

The toggle would also have failed even once the read was fixed, because Firefox keys `storage.sync` on the add-on ID and the manifest had none. `browser_specific_settings.gecko.id` is now set, along with `strict_min_version: "109.0"` — the first Firefox with Manifest V3 — and `data_collection_permissions: { required: ["none"] }`, which AMO has required of new submissions since November 2025 and which is accurate here: the extension makes no network requests and stores one boolean.

`build.js` fails the build if the Firefox ID goes missing, for the same reason it checks the other four things — Chrome ignores the key entirely, so losing it breaks only Firefox and looks like nothing at all.

Adds `web-ext` as a dev dependency with three scripts: `npm run lint:firefox` runs the same validator AMO runs on upload, `npm run package:firefox` writes the submission zip to `web-ext-artifacts/`, and `npm run run:firefox` opens a temporary profile with the extension loaded.

## v1.3.3

Uses the official term throughout the tooltip. *Stat Alignment* is the official name for what the community calls a nature, so the ribbon now reads **STAT ALIGNMENT** on every page rather than following the page's own wording, and the heading is always the bare name (`Adamant`) rather than echoing the text that was hovered.

The effect is that a mainline sheet's `Adamant Nature` and a Pokémon Champions sheet's `Stat Alignment: Adamant` now render an identical tooltip — a test compares the two directly. Both spellings are still matched exactly as before; only the presentation changed.

The data file and the code still use *nature* internally, since that is what the upstream Pokémon Showdown source calls them.

## v1.3.2

Drops the "Raises X by 10% and lowers Y by 10%." line from nature tooltips. The tooltip already shows the raised and lowered stat as labelled boxes, so the sentence only repeated them. The five neutral natures keep their text, because they have no boxes and would otherwise show an empty tooltip.

## v1.3.1

**Natures now work on Pokémon Champions team sheets.** v1.3 matched only the mainline phrasing, `Adamant Nature`. Champions sheets on `standings.limitlessvgc.com` instead write `Stat Alignment: Adamant`, with the name on its own, so nothing was highlighted there at all.

The bare nature name is now matched too, but only inside the field that carries it (`.nature`/`.tera` on the Limitless sites). Everywhere else — Showdown chat, PokePaste, ordinary prose on the same page — a loose `Adamant`, `Bold` or `Serious` is still ignored, which was the reason for the phrase-only match in the first place. Longest-match ordering keeps `Adamant Orb`, `Calm Mind` and `Brave Bird` resolving to the item and moves.

The tooltip ribbon follows the page: **STAT ALIGNMENT** on a Champions sheet, **NATURE** on a mainline one. The stat data behind both is identical.

## v1.3

**Nature tooltips** (also called *Stat Alignment*). Hovering a nature shows the stat it raises and the stat it lowers side by side, in green and red, with a violet dashed underline; the five neutral natures say so instead. Natures are matched as the full phrase — `Adamant Nature`, never a bare `Adamant` — because nature names on their own are ordinary English words (Bold, Calm, Serious, Rash, Naive) and matching those would highlight much of Showdown's chat. Every supported site prints the full phrase, so nothing is lost: PokePaste as a set line, Limitless in `.nature`.

Adds `natures.json`, generated from Showdown's `natures.ts` by a new `natures` build target.

`build.js` now also fails if a data library is missing from `web_accessible_resources.resources` — the same silent failure as a missing site, found while adding `natures.json`.

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
