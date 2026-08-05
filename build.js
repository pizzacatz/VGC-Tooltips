// Register the TypeScript bridge so we can natively import .ts files
require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
        module: 'commonjs',
        moduleResolution: 'node',
        ignoreDeprecations: "6.0"
    }
});

const fs = require('fs');
const path = require('path');
const prompts = require('prompts');

// All paths are resolved from the script's own location, so the build works no
// matter which directory you run `node build.js` from.
const ROOT = __dirname;
const DIST_DIR = path.join(ROOT, 'dist');

// Showdown's .ts sources live in "data files/"; the repo root is accepted as a
// fallback so either layout described in the README works.
const SOURCE_DIRS = [path.join(ROOT, 'data files'), ROOT];

function findSource(filename) {
    for (const dir of SOURCE_DIRS) {
        const candidate = path.join(dir, filename);
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

// Loads a Showdown data module and returns its first (only) export.
function loadSource(filename) {
    const filePath = findSource(filename);
    if (!filePath) {
        throw new Error(`${filename} not found. Looked in: ${SOURCE_DIRS.map(d => path.relative(ROOT, d) || '.').join(', ')}`);
    }
    const exportsObj = require(filePath);
    return exportsObj[Object.keys(exportsObj)[0]];
}

function writeLibrary(name, data) {
    fs.writeFileSync(path.join(ROOT, name), JSON.stringify(data, null, 4));
    console.log(`✅ ${name} created (${Object.keys(data).length} entries)`);
}

// The Champions export lower-cases move type and category ("ghost", "special"); the Showdown
// source title-cases them ("Ghost", "Special"). styles.css keys type colours off the
// lower-cased name and the tooltip prints the value as-is, so normalise to Showdown's form
// rather than special-casing the display.
function titleCase(value) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

// The consolidated Pokemon Champions Regulation M-B export, from the champions-logic
// project (`dist/champions-logic-mb.json`). This is the AUTHORITATIVE source for anything
// legal in Champions, and it wins over the Showdown .ts files wherever the two disagree.
//
// They disagree more than you would guess, and never loudly. Champions rebalances moves
// (Iron Head flinches 20% of the time, not 30%; Moonblast drops Sp. Atk 10%, not 30%; Salt
// Cure ticks 1/16, not 1/8), retypes a couple (Growth is Grass, Snap Trap is Steel), and
// uses an entirely different PP scheme — 404 of the 500 legal moves have a PP the Showdown
// data gets wrong. None of that fails; it just renders a plausible wrong number.
//
// Showdown remains the source for everything Champions does not cover, which is most of the
// dex: the extension also runs on Scarlet/Violet content, where a move Champions never heard
// of still needs a tooltip.
const CHAMPIONS_EXPORT = 'champions-logic-mb.json';

let championsCache = null;
function loadChampions() {
    if (championsCache) return championsCache;

    const filePath = findSource(CHAMPIONS_EXPORT);
    if (!filePath) {
        throw new Error(
            `${CHAMPIONS_EXPORT} not found. Copy it from the champions-logic project's dist/ ` +
            `directory into "data files/". Without it every Champions value would silently ` +
            `fall back to Showdown's, which is wrong for most of them.`
        );
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const byName = (rows) => Object.fromEntries((rows || []).map(row => [row.name, row]));

    championsCache = {
        version: data.data_version,
        revision: data.data_revision,
        moves: byName(data.moves),
        abilities: byName(data.abilities),
        items: byName(data.items),
        alignments: data.stat_alignments || []
    };

    console.log(`🏆 Champions ${championsCache.version} (${championsCache.revision}): ` +
        `${data.moves.length} moves, ${data.abilities.length} abilities, ` +
        `${data.items.length} items, ${championsCache.alignments.length} alignments`);
    return championsCache;
}

// The twelve official Pokemon Champions **Classifications** — the game's own word for
// a move's properties, and the labels its move-filter list shows — keyed by the Showdown
// flag that carries each one. Champions and Showdown name the same idea differently
// ("Sound-Based" vs `sound`, "Ball & Bomb" vs `bullet`), so the source data stays keyed
// on the internal flag and the official label is applied here, on the way out.
//
// This is an allowlist on purpose. Showdown tracks 39 flags; Champions labels 12 of them.
// The other 27 are either engine plumbing (`allyanim` is an animation hint), inert in this
// format (`mirror` — Mirror Move is not legal), or real rules the game simply never names.
// A denylist let every unrecognised flag through, so the tooltip was showing `ALLYANIM`
// and `NOSKETCH` next to genuine properties, and dropping `heal` — which *is* official.
//
// Insertion order is the order the game's own filter list uses, and is what the tooltip
// renders, so a move's pills always read in the same sequence they do in Champions.
const CLASSIFICATIONS = {
    punch: 'Punching',
    sound: 'Sound-Based',
    dance: 'Dance',
    slicing: 'Slicing',
    wind: 'Wind',
    powder: 'Powder',
    bullet: 'Ball & Bomb',
    pulse: 'Pulse',
    bite: 'Biting',
    heal: 'Healing',
    explosive: 'Explosive',
    mental: 'Mental'
};

// Note on Mental: it is NOT the Mental Herb cure list, despite being the same five moves.
// The item keys on the volatile condition its holder ends up with, not on this property; the
// overlap is a coincidence of naming. Do not describe one in terms of the other.
//
// The flag -> label map above is only needed for moves Champions does NOT cover, where the
// labels have to be derived from Showdown's flags. For the 500 legal moves the export states
// `classifications` outright, already resolved to official labels, and that is used verbatim.

// `contact` is the one flag worth keeping that Champions does not label. It is the most
// mechanically consequential property in the game — Rough Skin, Static, Flame Body, Rocky
// Helmet, Iron Barbs all read it — and it is on 166 moves, so dropping it would hide a real
// rule. It ships as its own field rather than inside `classifications`, because it is not
// one, and renders as a final pill after them.

// Every file the extension actually ships, mirrored into dist/ after a build so
// the two copies cannot drift.
const DIST_FILES = [
    'manifest.json', 'content.js', 'styles.css', 'popup.html', 'popup.js',
    'pokemon.json', 'moves.json', 'items.json', 'abilities.json', 'natures.json',
    'icon16.png', 'icon48.png', 'icon128.png'
];

const BUILDERS = {
    pokemon() {
        console.log('⏳ Processing Pokedex...');
        const pokedexData = loadSource('pokedex.ts');
        const outputJSON = {};
        for (const key in pokedexData) {
            const pokemon = pokedexData[key];
            if (!pokemon.name || !pokemon.baseStats) continue;

            const s = pokemon.baseStats;
            outputJSON[pokemon.name] = {
                types: pokemon.types,
                stats: `${s.hp}/${s.atk}/${s.def}/${s.spa}/${s.spd}/${s.spe}`
            };
        }

        addLimitlessAliases(outputJSON);
        writeLibrary('pokemon.json', outputJSON);
    },

    moves() {
        console.log('⏳ Merging Move Data...');
        const movesData = loadSource('moves-data.ts');
        const movesText = loadSource('moves-text.ts');
        const outputJSON = {};

        const champions = loadChampions();
        let fromChampions = 0;

        for (const key in movesData) {
            const move = movesData[key];
            const textInfo = movesText[key] || {};
            if (!move.name) continue;

            const cm = champions.moves[move.name];
            if (cm) fromChampions++;

            // Champions states `classifications` outright, already carrying the official
            // labels. For a move it does not cover, derive them from Showdown's flags — the
            // labels are still the right vocabulary, since a Champions player reading an SV
            // page is the same person.
            const classifications = cm
                ? (cm.classifications || [])
                : Object.entries(CLASSIFICATIONS)
                    .filter(([flag]) => move.flags && move.flags[flag])
                    .map(([, label]) => label);

            // Every displayed field prefers Champions, because every one of them diverges
            // somewhere: PP on 404 of 500 moves, power on 12, accuracy on 4, type on 2
            // (Growth is Grass, Snap Trap is Steel), and the description on 10 — several of
            // which are real balance changes rather than wording, e.g. Iron Head flinching
            // 20% rather than 30%.
            const entry = cm
                ? {
                    // The export lower-cases type and category; the tooltip title-cases for
                    // display and looks up `--type-<lowercase>`, so match Showdown's casing.
                    type: titleCase(cm.type),
                    category: titleCase(cm.category),
                    basePower: cm.power || 0,
                    // Showdown writes `true` for "never misses"; the export writes null.
                    accuracy: cm.accuracy === null || cm.accuracy === undefined ? true : cm.accuracy,
                    pp: cm.pp,
                    priority: cm.priority || 0,
                    description: cm.short_desc || cm.long_desc || "No description available."
                }
                : {
                    type: move.type,
                    category: move.category,
                    basePower: move.basePower,
                    accuracy: move.accuracy,
                    pp: move.pp,
                    priority: move.priority || 0,
                    description: textInfo.shortDesc || textInfo.desc || "No description available."
                };

            // Both omitted when they do not apply — most moves have no Classification at
            // all, and writing empty values for them would pad moves.json for nothing.
            if (classifications.length > 0) entry.classifications = classifications;
            const contact = cm ? (cm.flags || []).includes('contact') : !!(move.flags && move.flags.contact);
            if (contact) entry.contact = true;

            outputJSON[move.name] = entry;
        }

        // A legal move the Showdown source has never heard of would never be written at all,
        // since this loop walks the Showdown dex. Nothing in M-B is Champions-only today, but
        // a future regulation could add one, and it would vanish rather than fail.
        const missing = Object.keys(champions.moves).filter(name => !outputJSON[name]);
        if (missing.length > 0) {
            console.error('\n❌ Champions moves absent from moves-data.ts, so not written:');
            missing.forEach(name => console.error(`   - ${name}`));
            throw new Error(`${missing.length} Champions move(s) missing from the Showdown source`);
        }

        console.log(`   ${fromChampions} move(s) taken from Champions, ` +
            `${Object.keys(outputJSON).length - fromChampions} from Showdown.`);
        writeLibrary('moves.json', outputJSON);
    },

    natures() {
        console.log('⏳ Processing Stat Alignments...');
        const champions = loadChampions();
        const STAT_LABELS = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
        const outputJSON = {};

        // Built from Champions alone, not from Showdown's natures.ts. Champions ships 21 Stat
        // Alignments where mainline has 25: Bashful, Docile, Hardy and Quirky do not exist
        // here, and Serious is the only neutral one rather than one of five. Shipping the
        // extra four would put a tooltip on an alignment no Champions player can select.
        //
        // The cost of this is deliberate and worth naming: a Scarlet/Violet paste that says
        // "Hardy Nature" now gets no tooltip. That is the Champions-first trade — the
        // alternative is showing four alignments that do not exist in the game this extension
        // is primarily for.
        for (const alignment of champions.alignments) {
            const name = alignment.alignment;
            const plus = STAT_LABELS[alignment.raises];
            const minus = STAT_LABELS[alignment.lowers];

            // Keyed on the full phrase the sites actually print. A bare alignment name is an
            // ordinary English word — Bold, Calm, Serious, Rash, Naive — and matching those
            // alone would highlight half of Showdown's chat. `name` is the bare form, which
            // content.js uses only inside the alignment field on Champions team sheets.
            //
            // No description for a stat-changing alignment: the tooltip shows the raised and
            // lowered stat as labelled boxes, and a sentence repeating them adds nothing.
            // Serious has no boxes, so it keeps its text.
            outputJSON[`${name} Nature`] = plus && minus
                ? { name, plus, minus }
                : { name, description: 'Neutral Stat Alignment. No stat changes.' };
        }
        writeLibrary('natures.json', outputJSON);
    },

    items() {
        console.log('⏳ Processing Items...');
        buildDescriptionLibrary('items.ts', 'items.json', 'items');
    },

    abilities() {
        console.log('⏳ Processing Abilities...');
        buildDescriptionLibrary('abilities.ts', 'abilities.json', 'abilities');
    }
};

// The data libraries are keyed on Pokemon Showdown's species names — `Rotom-Wash`,
// `Raichu-Alola`, `Charizard-Mega-Y`. Showdown and PokePaste print exactly those, so they
// match. **Limitless does not.** It renders natural English form names — "Wash Rotom",
// "Alolan Raichu", "Mega Charizard Y" — and the scanner matches literal text with no
// normalisation, so before this every form species and every Mega was silently missing there:
// no underline, no tooltip, and no way to tell from the page that anything was wrong.
//
// The naming is not derivable by rule. Limitless writes "Wash Rotom" but "Lycanroc Dusk",
// "Female Meowstic" but "Eternal Flower Floette", "Paldean Tauros Blaze Breed" but plain
// "Paldean Tauros". So the table is scraped from the site itself rather than invented — see
// the `_source` field in the file, and the README for how to regenerate it.
//
// Each alias is registered as an additional key onto the same record, never a replacement:
// both spellings resolve to one tooltip, so Showdown and Limitless keep working at once.
function addLimitlessAliases(outputJSON) {
    const filePath = findSource('limitless-aliases.json');
    if (!filePath) {
        console.warn('⚠️  limitless-aliases.json not found — Limitless will show no tooltip');
        console.warn('   for any form species or Mega. See the README to regenerate it.');
        return;
    }

    const table = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const entries = { ...(table.verified || {}), ...(table.derived || {}) };
    let added = 0;
    const orphans = [];

    for (const [alias, canonical] of Object.entries(entries)) {
        const record = outputJSON[canonical];
        // A canonical name that no longer exists means Showdown renamed the species out from
        // under the table, so the alias would point at nothing. Report rather than write it.
        if (!record) { orphans.push(`${alias} -> ${canonical}`); continue; }
        // An alias that collides with a real species would shadow it. Never overwrite.
        if (outputJSON[alias]) { orphans.push(`${alias} (already a species)`); continue; }
        outputJSON[alias] = record;
        added++;
    }

    const derivedCount = Object.keys(table.derived || {}).length;
    console.log(`   ${added} Limitless alias(es) added ` +
        `(${Object.keys(table.verified || {}).length} scraped, ${derivedCount} derived).`);
    if ((table._omitted || []).length > 0) {
        console.log(`   no Limitless name for: ${table._omitted.join(', ')} — not aliased.`);
    }
    if (orphans.length > 0) {
        console.error('\n❌ limitless-aliases.json entries that could not be applied:');
        orphans.forEach(o => console.error(`   - ${o}`));
        throw new Error(`${orphans.length} unusable alias entry/entries`);
    }
}

// Items and abilities share the same shape: name -> description. Champions wins where it has
// an opinion; Showdown supplies the rest, which is most of the dex and is what a Scarlet/
// Violet page needs. Champions also has entries with no Showdown counterpart at all — the
// Mega-only abilities Eelevate (Eelektross-Mega) and Fire Mane (Pyroar-Mega) — so its rows
// are added, not merely preferred, or hovering those on a team sheet would show nothing.
function buildDescriptionLibrary(sourceFile, outputFile, championsKey) {
    const data = loadSource(sourceFile);
    const champions = loadChampions()[championsKey];
    const outputJSON = {};

    for (const key in data) {
        if (data[key].name) {
            outputJSON[data[key].name] = {
                description: data[key].shortDesc || data[key].desc || "No description available."
            };
        }
    }

    let overridden = 0;
    let added = 0;
    for (const [name, row] of Object.entries(champions)) {
        const description = row.short_desc || row.long_desc || "No description available.";
        if (!outputJSON[name]) added++;
        else if (outputJSON[name].description !== description) overridden++;
        outputJSON[name] = { description };
    }
    console.log(`   ${overridden} description(s) replaced by Champions, ${added} added.`);

    writeLibrary(outputFile, outputJSON);
}

// A name that exists in two libraries (currently only "Metronome": move + item) has
// to be disambiguated at runtime by content.js. Report them so a new collision
// introduced by an upstream data update is visible instead of silent.
function checkCollisions() {
    const LIBRARIES = {
        pokemon: 'pokemon.json', move: 'moves.json',
        item: 'items.json', ability: 'abilities.json', nature: 'natures.json'
    };

    const owners = {};
    for (const [category, file] of Object.entries(LIBRARIES)) {
        const filePath = path.join(ROOT, file);
        if (!fs.existsSync(filePath)) continue;
        const library = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        for (const [name, entry] of Object.entries(library)) {
            (owners[name] = owners[name] || []).push(category);
            // content.js also registers the bare nature name for Champions sheets,
            // so a clash on that form matters just as much as one on the phrase.
            if (category === 'nature' && entry.name) {
                (owners[entry.name] = owners[entry.name] || []).push('nature (bare)');
            }
        }
    }

    const collisions = Object.entries(owners).filter(([, categories]) => categories.length > 1);
    if (collisions.length === 0) {
        console.log('🔎 No cross-library name collisions.');
        return;
    }

    console.warn(`\n⚠️  ${collisions.length} name(s) appear in more than one library:`);
    for (const [name, categories] of collisions) {
        console.warn(`   - ${name}: ${categories.join(' + ')}`);
    }
    console.warn('   content.js resolves these from the page. If a new one needs a rule,');
    console.warn('   add a scope or cue to the relevant SITE_PROFILES entry in content.js.');
}

// The content script fetches the JSON libraries through runtime.getURL, so every site
// it runs on must also be listed under web_accessible_resources. If the two lists
// drift the extension loads on the missing site and then silently fetches nothing,
// which looks exactly like "the site isn't supported".
function checkManifest() {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
    const scriptMatches = manifest.content_scripts[0].matches;
    const resourceMatches = manifest.web_accessible_resources[0].matches;
    const missing = scriptMatches.filter(m => !resourceMatches.includes(m));

    let ok = true;

    if (missing.length === 0) {
        console.log(`🔎 manifest match lists agree (${scriptMatches.length} sites).`);
    } else {
        console.error('\n❌ manifest.json: these content_scripts matches are missing from');
        console.error('   web_accessible_resources — the data libraries will not load there:');
        missing.forEach(m => console.error(`   - ${m}`));
        ok = false;
    }

    // Same failure mode for the libraries themselves: content.js fetches each one, and
    // a library the manifest does not expose is simply unreachable at runtime.
    const exposed = manifest.web_accessible_resources[0].resources;
    const unexposed = DIST_FILES.filter(f => f.endsWith('.json') && f !== 'manifest.json' && !exposed.includes(f));
    if (unexposed.length > 0) {
        console.error('\n❌ manifest.json: these data libraries are not in');
        console.error('   web_accessible_resources.resources — content.js cannot fetch them:');
        unexposed.forEach(f => console.error(`   - ${f}`));
        ok = false;
    }

    // Firefox's storage.sync implementation is keyed on the add-on ID, so without
    // an explicit one the popup toggle writes to storage that never reads back and
    // the extension behaves as if it were permanently switched on. Chrome ignores
    // the key entirely, which is why this is easy to drop and never notice.
    const geckoId = manifest.browser_specific_settings?.gecko?.id;
    if (geckoId) {
        console.log(`🔎 Firefox add-on ID present (${geckoId}).`);
    } else {
        console.error('\n❌ manifest.json: browser_specific_settings.gecko.id is missing.');
        console.error('   Firefox needs it for storage.sync — the popup toggle will do nothing.');
        ok = false;
    }

    // manifest.json is the version browsers use to decide an update has happened;
    // package.json is what a developer reads first. They should not disagree.
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    // Compared with both sides padded to major.minor.patch. The previous version of this
    // check stripped a trailing ".0" from package.json to let "1.2.0" match a manifest
    // reading "1.2" — which also turned "1.4.0" into "1.4" and reported a mismatch against
    // an identical "1.4.0". Any x.y.0 release tripped it.
    const normalize = (v) => {
        const parts = String(v).split('.');
        while (parts.length < 3) parts.push('0');
        return parts.join('.');
    };
    if (normalize(pkg.version) !== normalize(manifest.version)) {
        console.error(`\n❌ version mismatch: manifest.json ${manifest.version}, package.json ${pkg.version}`);
        ok = false;
    }

    return ok;
}

function syncDist() {
    fs.mkdirSync(DIST_DIR, { recursive: true });
    let copied = 0;
    for (const file of DIST_FILES) {
        const src = path.join(ROOT, file);
        if (!fs.existsSync(src)) {
            console.warn(`⚠️  ${file} missing — not copied to dist/`);
            continue;
        }
        fs.copyFileSync(src, path.join(DIST_DIR, file));
        copied++;
    }
    console.log(`📦 dist/ synced (${copied}/${DIST_FILES.length} files)`);
}

const DATA_TYPES = [
    { title: 'Update ALL', value: 'all' },
    { title: 'Pokemon (pokedex.ts)', value: 'pokemon' },
    { title: 'Moves (moves-data.ts + moves-text.ts)', value: 'moves' },
    { title: 'Items (items.ts)', value: 'items' },
    { title: 'Abilities (abilities.ts)', value: 'abilities' },
    { title: 'Natures (natures.ts)', value: 'natures' },
    { title: 'Sync dist/ only (no data rebuild)', value: 'sync' }
];

const ALL_TYPES = ['pokemon', 'moves', 'items', 'abilities', 'natures'];

// Targets may be passed as arguments for scripted/CI runs
// (`node build.js all`, `node build.js moves items`); otherwise we prompt.
async function resolveTargets() {
    const args = process.argv.slice(2).filter(a => a !== '--no-dist');
    if (args.length > 0) {
        const unknown = args.filter(a => a !== 'all' && a !== 'sync' && !ALL_TYPES.includes(a));
        if (unknown.length > 0) {
            console.error(`Unknown target(s): ${unknown.join(', ')}`);
            console.error(`Valid targets: all, sync, ${ALL_TYPES.join(', ')}`);
            process.exit(1);
        }
        return args.includes('all') ? [...ALL_TYPES, ...(args.includes('sync') ? ['sync'] : [])] : args;
    }

    const response = await prompts({
        type: 'multiselect',
        name: 'selectedTypes',
        message: 'Select data to build (Up/Down to move, Space to select, Enter to confirm):',
        choices: DATA_TYPES,
        hint: '- Space to select. Return to submit'
    });

    const selected = response.selectedTypes;
    if (!selected || selected.length === 0) return [];
    return selected.includes('all')
        ? [...ALL_TYPES, ...(selected.includes('sync') ? ['sync'] : [])]
        : selected;
}

async function main() {
    const targets = await resolveTargets();
    if (targets.length === 0) {
        console.log("No data selected. Exiting.");
        return;
    }

    // `sync` refreshes dist/ from the current source files without touching the
    // data libraries — used after a code-only change to content.js, the CSS, etc.
    if (targets.length === 1 && targets[0] === 'sync') {
        if (!checkManifest()) process.exitCode = 1;
        syncDist();
        console.log('\n✨ Sync Complete.');
        return;
    }

    console.log('\n🚀 Starting Build Process...\n');

    let failed = 0;
    for (const target of ALL_TYPES.filter(t => targets.includes(t))) {
        try {
            BUILDERS[target]();
        } catch (e) {
            console.error(`❌ Failed ${target}:`, e.message);
            failed++;
        }
    }

    if (failed > 0) {
        console.error(`\n💥 Build finished with ${failed} failure(s). dist/ not synced.`);
        process.exitCode = 1;
        return;
    }

    checkCollisions();
    if (!checkManifest()) process.exitCode = 1;
    if (!process.argv.includes('--no-dist')) syncDist();
    console.log('\n✨ Build Complete.');
}

main();
