// Regenerates "data files/limitless-aliases.json".
//
// The data libraries are keyed on Pokemon Showdown's species names (`Rotom-Wash`). Limitless
// displays natural English form names ("Wash Rotom"), and the scanner matches literal text,
// so without an alias every form species and every Mega is silently missing on that site.
//
// The naming cannot be derived by rule — Limitless writes "Wash Rotom" but "Lycanroc Dusk",
// "Female Meowstic" but "Eternal Flower Floette" — so this reads the display name off the
// site itself, one page per species, and writes down which entries it could not reach.
//
//   node fetch_limitless_aliases.js            # rewrite the table
//   node fetch_limitless_aliases.js --dry-run  # show what would change, write nothing
//
// Only Champions-legal species and Megas are fetched, matching the extension's Champions-first
// scope. Requesting one page per species is why there is a delay between calls; this is a
// build-time tool run rarely, never anything the extension itself does at runtime.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE_DIRS = [path.join(ROOT, 'data files'), ROOT];
const BASE = 'https://limitlessvgc.com/pokemon/';
const DELAY_MS = 350;
const USER_AGENT = 'VGC-Tooltips-build (alias table generation; github.com/pizzacatz/VGC-Tooltips)';

const dryRun = process.argv.includes('--dry-run');

function findSource(filename) {
    for (const dir of SOURCE_DIRS) {
        const candidate = path.join(dir, filename);
        if (fs.existsSync(candidate)) return candidate;
    }
    throw new Error(`${filename} not found in: ${SOURCE_DIRS.join(', ')}`);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// The display name is the page's only <h1>. A 404 renders a "Page not found" heading, so the
// status code is what decides whether the name is real, not the presence of a heading.
async function displayName(slug) {
    const response = await fetch(BASE + slug, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return { ok: false, status: response.status };
    const match = /<h1[^>]*>([^<]+)<\/h1>/.exec(await response.text());
    return { ok: true, status: response.status, name: match ? match[1].trim() : null };
}

async function main() {
    const champions = JSON.parse(fs.readFileSync(findSource('champions-logic-mb.json'), 'utf8'));
    const pokemon = JSON.parse(fs.readFileSync(path.join(ROOT, 'pokemon.json'), 'utf8'));

    // Only hyphenated names can diverge — "Incineroar" is "Incineroar" everywhere.
    const candidates = [...champions.species, ...champions.mega_evolutions]
        .map(row => row.name)
        .filter(name => name.includes('-') && pokemon[name]);

    console.log(`Fetching ${candidates.length} species from ${BASE} …`);

    const verified = {};
    const unresolved = [];
    for (const [i, name] of candidates.entries()) {
        const result = await displayName(name.toLowerCase());
        if (result.ok && result.name && result.name !== name) verified[result.name] = name;
        else if (!result.ok) unresolved.push(name);
        process.stdout.write(`\r  ${i + 1}/${candidates.length}`);
        await sleep(DELAY_MS);
    }
    console.log(`\n  ${Object.keys(verified).length} name(s) differ, ${unresolved.length} unreachable.`);

    // Limitless has no page for the Champions-original Megas — that site covers Scarlet/Violet
    // VGC. Every Mega page that DOES resolve is "Mega <base>" without exception, so the rest
    // follow it, anchored on the export's base_slug rather than string-stripping the name (so
    // Meowstic-F-Mega resolves through Meowstic-F to "Mega Female Meowstic").
    const speciesBySlug = Object.fromEntries(champions.species.map(s => [s.slug, s.name]));
    const limitlessName = Object.fromEntries(Object.entries(verified).map(([alias, key]) => [key, alias]));
    const nameOf = (key) => limitlessName[key] || key;

    // One non-Mega inference, kept explicit rather than pattern-matched. Limitless names the
    // other two Paldean Tauros breeds "Paldean Tauros Blaze Breed" and "… Aqua Breed", and
    // serves an unsuffixed /pokemon/tauros-paldea titled plain "Paldean Tauros" — which can
    // only be the third breed. The risk if that is wrong is small and bounded: all three
    // breeds share one stat line and differ only in secondary type.
    const INFERRED = { 'Tauros-Paldea-Combat': 'Paldean Tauros' };

    const derived = {};
    const omitted = [];
    for (const key of unresolved) {
        if (INFERRED[key]) { derived[INFERRED[key]] = key; continue; }
        const mega = champions.mega_evolutions.find(m => m.name === key);
        if (!mega) { omitted.push(key); continue; }
        const base = speciesBySlug[mega.base_slug];
        if (!base) { omitted.push(key); continue; }
        const suffix = /-Mega-([XY])$/.exec(key);
        derived[`Mega ${nameOf(base)}${suffix ? ' ' + suffix[1] : ''}`] = key;
    }

    const table = {
        _source: `${BASE}<slug>, <h1> heading.`,
        _generated_by: 'node fetch_limitless_aliases.js',
        _why: 'Limitless displays natural English form names ("Wash Rotom") while the data libraries are keyed on Pokemon Showdown names ("Rotom-Wash"). Without these the scanner matches neither on Limitless.',
        _verified: 'Read from the live site, one page per species.',
        _derived: 'Limitless has no page for these. Every Mega page that resolved is "Mega <base>" without exception, so the rest follow that, with the base taken from the Champions export base_slug. Tauros-Paldea-Combat is inferred separately: the other two breeds are named "... Breed" and the unsuffixed page is titled plain "Paldean Tauros".',
        _omitted: omitted,
        verified,
        derived
    };

    const outPath = path.join(ROOT, 'data files', 'limitless-aliases.json');
    if (dryRun) {
        console.log(`\n--dry-run: would write ${Object.keys(verified).length} verified + ` +
            `${Object.keys(derived).length} derived to ${path.relative(ROOT, outPath)}`);
        if (omitted.length) console.log(`  no Limitless name for: ${omitted.join(', ')}`);
        return;
    }

    fs.writeFileSync(outPath, JSON.stringify(table, null, 2));
    console.log(`\n✅ ${path.relative(ROOT, outPath)}: ` +
        `${Object.keys(verified).length} verified, ${Object.keys(derived).length} derived, ` +
        `${omitted.length} omitted.`);
    if (omitted.length) console.log(`   no Limitless name for: ${omitted.join(', ')}`);
    console.log('   Re-run `npm run build` to fold the table into pokemon.json.');
}

main().catch(err => { console.error('\n❌', err.message); process.exitCode = 1; });
