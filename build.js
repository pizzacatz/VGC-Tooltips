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

// Classification membership that the Showdown source does not carry, listed by hand because
// there is nothing upstream to derive it from. Two distinct reasons, both real:
//
//   1. `explosive` and `mental` are Champions-native — the flags do not exist in Showdown at
//      all. A Showdown-sourced tooltip does not get a wrong answer here, it gets silence.
//      Both sets are closed: every move carrying each label is named, so absence means the
//      move does not have it.
//
//   2. `slicing` and `sound` DO exist upstream, but Champions puts them on moves Scarlet &
//      Violet does not. The four claw moves are not Slicing in SV and Dragon Cheer is not
//      Sound-Based, yet all five are in Champions — verified against champions-logic, whose
//      own move flags carry them. This matters in play: Sharpness boosts Slicing, and
//      Soundproof blocks Sound-Based. Note that champions-logic's `divergence-from-showdown`
//      document states flag membership agrees with Showdown apart from the native two; its
//      data says otherwise for these five, and the data is what was checked.
//
// Mental is NOT the Mental Herb cure list, despite being the same five moves. The item keys
// on the volatile condition its holder ends up with, not on this property; the overlap is a
// coincidence of naming. Do not describe one in terms of the other.
const CHAMPIONS_OVERLAY = {
    explosive: ['Explosion', 'Self-Destruct', 'Misty Explosion'],
    mental: ['Taunt', 'Attract', 'Encore', 'Disable', 'Torment'],
    slicing: ['Crush Claw', 'Dire Claw', 'Dragon Claw', 'Shadow Claw'],
    sound: ['Dragon Cheer']
};

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
        writeLibrary('pokemon.json', outputJSON);
    },

    moves() {
        console.log('⏳ Merging Move Data...');
        const movesData = loadSource('moves-data.ts');
        const movesText = loadSource('moves-text.ts');
        const outputJSON = {};

        // Invert CHAMPIONS_OVERLAY into move name -> the flags it adds, so the main loop can
        // treat a hand-listed Classification exactly like one read from the Showdown flags.
        const overlayByMove = {};
        for (const [flag, moveNames] of Object.entries(CHAMPIONS_OVERLAY)) {
            for (const name of moveNames) {
                (overlayByMove[name] = overlayByMove[name] || []).push(flag);
            }
        }
        const overlayMatched = new Set();
        const overlayRedundant = [];

        for (const key in movesData) {
            const move = movesData[key];
            const textInfo = movesText[key] || {};
            if (!move.name) continue;

            const overlay = overlayByMove[move.name] || [];
            if (overlay.length > 0) overlayMatched.add(move.name);
            // An overlay row for a flag the source now carries by itself means upstream has
            // caught up and the row can be deleted. Harmless, but say so rather than let the
            // table accumulate entries nobody can tell are still needed.
            for (const flag of overlay) {
                if (move.flags && move.flags[flag]) overlayRedundant.push(`${move.name} (${flag})`);
            }

            // Emitted as finished labels in the game's filter order, not as flag keys, so
            // the tooltip has no vocabulary of its own to keep in sync with this table.
            const classifications = Object.entries(CLASSIFICATIONS)
                .filter(([flag]) => (move.flags && move.flags[flag]) || overlay.includes(flag))
                .map(([, label]) => label);

            const entry = {
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
            if (move.flags && move.flags.contact) entry.contact = true;

            outputJSON[move.name] = entry;
        }

        // The overlay is matched on the move's display name, which is the one part of this
        // that upstream can change under us. If a rename ever lands, the Classification would
        // silently vanish from the tooltip rather than fail, so make it fail.
        const unmatched = Object.keys(overlayByMove).filter(name => !overlayMatched.has(name));
        if (unmatched.length > 0) {
            console.error('\n❌ CHAMPIONS_OVERLAY names not found in moves-data.ts:');
            unmatched.forEach(name => console.error(`   - ${name}`));
            console.error('   Renamed upstream? Fix the name, or that Classification is now missing.');
            throw new Error(`${unmatched.length} overlay move name(s) unmatched`);
        }
        if (overlayRedundant.length > 0) {
            console.warn(`\n⚠️  ${overlayRedundant.length} CHAMPIONS_OVERLAY row(s) now redundant —`);
            console.warn('   the Showdown source carries these itself and the row can be removed:');
            overlayRedundant.forEach(entry => console.warn(`   - ${entry}`));
        }

        writeLibrary('moves.json', outputJSON);
    },

    natures() {
        console.log('⏳ Processing Natures...');
        const natureData = loadSource('natures.ts');
        const STAT_LABELS = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
        const outputJSON = {};

        for (const key in natureData) {
            const nature = natureData[key];
            if (!nature.name) continue;

            // Keyed on the full phrase the sites actually print. A bare nature name
            // is an ordinary English word — Bold, Calm, Serious, Rash, Naive — and
            // matching those alone would highlight half of Showdown's chat.
            const plus = STAT_LABELS[nature.plus];
            const minus = STAT_LABELS[nature.minus];
            // `name` is the bare form. Pokemon Champions team sheets print
            // "Stat Alignment: Adamant" rather than "Adamant Nature", so content.js
            // needs the name on its own — but only inside that field, never loose.
            //
            // No description for a stat-changing nature: the tooltip shows the raised
            // and lowered stat as labelled boxes, and a sentence repeating them adds
            // nothing. The neutral natures have no boxes, so they keep their text.
            outputJSON[`${nature.name} Nature`] = plus && minus
                ? { name: nature.name, plus, minus }
                : { name: nature.name, description: 'Neutral nature. No stat changes.' };
        }
        writeLibrary('natures.json', outputJSON);
    },

    items() {
        console.log('⏳ Processing Items...');
        buildDescriptionLibrary('items.ts', 'items.json');
    },

    abilities() {
        console.log('⏳ Processing Abilities...');
        buildDescriptionLibrary('abilities.ts', 'abilities.json');
    }
};

// Items and abilities share the same shape: name -> description.
function buildDescriptionLibrary(sourceFile, outputFile) {
    const data = loadSource(sourceFile);
    const outputJSON = {};
    for (const key in data) {
        if (data[key].name) {
            outputJSON[data[key].name] = {
                description: data[key].shortDesc || data[key].desc || "No description available."
            };
        }
    }
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
