# Changelog

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
