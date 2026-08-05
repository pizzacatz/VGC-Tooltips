# addons.mozilla.org listing copy

Fill-in text for the AMO submission form, kept in the repo so the next version's
listing starts from what was actually published rather than being rewritten from
memory. Upload `web-ext-artifacts/vgc_tooltips-<version>.zip`.

Submit at: https://addons.mozilla.org/developers/addon/submit/distribution

---

## Name

    VGC Tooltips

## Summary

AMO caps this at 250 characters. This is 184, joined onto one line.

    Hover any Pokemon, move, item, ability or Stat Alignment on Pokemon Showdown,
    PokePaste or Limitless to see its VGC data instantly. No clicks, no new tabs,
    no lookups in another window.

## Description

    Reading a team list or a battle log means knowing a few hundred base stat
    spreads, move descriptions and item effects by heart — or opening a second tab
    every time you don't.

    VGC Tooltips puts that data on the page you are already reading. Terms get
    a dashed underline in a colour that tells you the category; hover one and a
    tooltip shows what you need:

    • Pokemon — types, plus a bar graph of all six base stats scaled to 255
    • Moves — power, accuracy, PP and priority in a grid, the description, and the
      move's Classifications under Pokemon Champions' own names for them:
      Sound-Based, Ball & Bomb, Punching, Slicing, Healing, Explosive and the rest
    • Abilities — the short description
    • Items — the effect
    • Stat Alignments (natures) — the raised and lowered stat side by side

    WHERE IT WORKS

    • Pokemon Showdown — the battle log and chat, on both play. and replay.,
      including new log lines as they arrive mid-battle
    • PokePaste — every set on the page
    • Limitless — team lists on play.limitlesstcg.com and limitlessvgc.com, plus
      the usage tables on limitlessvgc.com/pokemon/<name>
    • Limitless Standings — standings.limitlessvgc.com
    • Saved Showdown replay .html files opened from disk, if you grant file access

    Both Limitless sites are covered for Pokemon Champions events as well as
    Scarlet/Violet ones, including the "Stat Alignment:" field that Champions team
    sheets use.

    BUILT FOR CHAMPIONS

    The data is Champions-first. Pokemon Champions rebalances a lot of what it
    inherits, and quietly: it uses its own PP scheme on 404 of the 500 legal moves,
    changes the power of twelve and the type of two, and adjusts effects like Iron
    Head's flinch chance and Salt Cure's damage. It also ships 21 Stat Alignments
    rather than mainline's 25. Everything the tooltip shows for a Champions-legal
    move, ability, item or alignment comes from the game's own data, not from a
    Scarlet/Violet dex — including entries no other source has, like the Mega-only
    abilities Eelevate and Fire Mane.

    The trade-off is worth knowing: on a Scarlet/Violet page, anything Champions
    also has will show the Champions value.

    Scanning is confined to the team lists and battle logs themselves, so
    navigation, headers and page furniture are left alone. On PokePaste and
    Limitless the site's own colouring is preserved and only the underline is
    added.

    A name that belongs to two categories is resolved from context rather than
    guessed: "Clefable used Metronome" is the move, "Clefable's Metronome" is the
    item, and the underline colour always agrees with the tooltip.

    PRIVACY

    No data collection of any kind. The extension makes no network requests — all
    five data libraries ship inside it — and the only thing it stores is one
    boolean for the on/off switch in the toolbar popup.

    Toggle everything off from the toolbar icon at any time; it takes effect
    without reloading the page.

    Not affiliated with, endorsed by, or sponsored by Nintendo, Creatures Inc.,
    GAME FREAK, The Pokemon Company, Pokemon Showdown, or Limitless. Pokemon and
    all related names are trademarks of their respective owners. Game data is
    derived from the MIT-licensed Pokemon Showdown project and from the
    champions-logic Regulation M-B dataset; see THIRD-PARTY-NOTICES.md in the
    repository.

## Categories

Games & Entertainment (primary). Leave the second slot empty rather than padding it.

## License

MIT — matches the `LICENSE` file in the repository.

## Support

- Support site: https://github.com/pizzacatz/VGC-Tooltips
- Support email: use the address on the AMO account

## Privacy policy

Not required, and do not paste one in. The manifest declares
`data_collection_permissions: { required: ["none"] }`, and there is nothing to
disclose: no network requests, no personal data, one stored boolean.

## Notes for reviewers

Paste this into the "Notes for Reviewer" field. It pre-empts the two things a
manual reviewer will otherwise stop on.

    Source: https://github.com/pizzacatz/VGC-Tooltips

    No build step is needed to read this extension — content.js, popup.js and
    styles.css ship exactly as written, unminified and untranspiled. The five
    .json data libraries are generated data, not code: build.js in the repository
    converts the MIT-licensed .ts data files from the Pokemon Showdown project
    (pokedex.ts, moves-data.ts, moves-text.ts, items.ts, abilities.ts), plus the
    consolidated Regulation M-B export from the champions-logic project, into
    name-keyed lookup tables. Champions wins where the two disagree about a
    Champions-legal move, ability, item or Stat Alignment. Provenance and licence
    details for both are in THIRD-PARTY-NOTICES.md.

    On the one linter warning — UNSAFE_VAR_ASSIGNMENT for tooltip.innerHTML in
    content.js: every value interpolated into that string is either a hardcoded
    literal or a field from the bundled JSON libraries. Nothing that originates
    from the web page is ever passed through innerHTML. Page-derived text reaches
    the DOM only via textContent (the tooltip header and description, content.js
    ~line 140) or document.createTextNode (the scanner, content.js ~line 449), and
    matched terms are set with span.textContent. This is deliberate: assigning log
    text back through innerHTML would re-parse markup Showdown had already
    escaped.

    Permissions:
    - storage — the single on/off toggle in the popup. Nothing else is stored.
    - Six named hosts (plus www. variants) — the sites the scanner runs on. Each is
      listed exactly, so no other subdomain is granted access.
    - file:///* — so saved Showdown replay .html files also work. Local files have
      no hostname and fall back to the Showdown profile, which scans only inside
      .battle-history; an unrelated local page is not scanned.

    The extension makes no network requests at all and has no background script.
