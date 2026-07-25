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
const prompts = require('prompts');
const path = require('path');

async function main() {
    // Define the logical data types
    const DATA_TYPES = [
        { title: 'Update ALL', value: 'all' },
        { title: 'Pokemon (pokedex.ts)', value: 'pokemon' },
        { title: 'Moves (moves-data.ts + moves-text.ts)', value: 'moves' },
        { title: 'Items (items.ts)', value: 'items' },
        { title: 'Abilities (abilities.ts)', value: 'abilities' }
    ];

    const response = await prompts({
        type: 'multiselect',
        name: 'selectedTypes',
        message: 'Select data to build (Up/Down to move, Space to select, Enter to confirm):',
        choices: DATA_TYPES,
        hint: '- Space to select. Return to submit'
    });

    let selected = response.selectedTypes;
    if (!selected || selected.length === 0) {
        console.log("No data selected. Exiting.");
        return;
    }

    // If "Update ALL" is selected, select everything else
    if (selected.includes('all')) {
        selected = ['pokemon', 'moves', 'items', 'abilities'];
    }

    console.log('\n🚀 Starting Build Process...\n');

    // --- 1. PROCESS POKEMON ---
    if (selected.includes('pokemon')) {
        try {
            console.log('⏳ Processing Pokedex...');
            const pokedexExports = require('./pokedex.ts');
            const pokedexData = pokedexExports[Object.keys(pokedexExports)[0]];
            const outputJSON = {};

            for (const key in pokedexData) {
                const pokemon = pokedexData[key];
                if (!pokemon.name || !pokemon.baseStats) continue;

                const s = pokemon.baseStats;
                const statsString = `${s.hp}/${s.atk}/${s.def}/${s.spa}/${s.spd}/${s.spe}`;

                outputJSON[pokemon.name] = {
                    types: pokemon.types,
                    stats: statsString
                };
            }
            fs.writeFileSync('./pokemon.json', JSON.stringify(outputJSON, null, 4));
            console.log(`✅ pokemon.json created (${Object.keys(outputJSON).length} entries)`);
        } catch (e) { console.error('❌ Failed Pokemon:', e.message); }
    }

    // --- 2. PROCESS MOVES ---
    if (selected.includes('moves')) {
        try {
            console.log('⏳ Merging Move Data...');
            const IGNORED_FLAGS = [
                'bypasssub', 'noassist', 'protect', 'mirror', 
                'heal', 'metronome', 'reflectable', 'failencore', 
                'snatch', 'nonsky', 'distance', 'defrost', 'failcopycat'
            ];

            const dataExports = require('./moves-data.ts');
            const textExports = require('./moves-text.ts');
            const movesData = dataExports[Object.keys(dataExports)[0]];
            const movesText = textExports[Object.keys(textExports)[0]];
            const outputJSON = {};

            for (const key in movesData) {
                const move = movesData[key];
                const textInfo = movesText[key] || {};
                if (!move.name) continue;

                const processedFlags = {};
                if (move.flags) {
                    for (const flag in move.flags) {
                        if (!IGNORED_FLAGS.includes(flag)) {
                            processedFlags[flag] = move.flags[flag];
                        }
                    }
                }

                outputJSON[move.name] = {
                    type: move.type,
                    category: move.category,
                    basePower: move.basePower,
                    accuracy: move.accuracy,
                    pp: move.pp,
                    priority: move.priority || 0,
                    description: textInfo.shortDesc || textInfo.desc || "No description available.",
                    flags: processedFlags
                };
            }
            fs.writeFileSync('./moves.json', JSON.stringify(outputJSON, null, 4));
            console.log(`✅ moves.json created (${Object.keys(outputJSON).length} entries)`);
        } catch (e) { console.error('❌ Failed Moves:', e.message); }
    }

    // --- 3. PROCESS ITEMS ---
    if (selected.includes('items')) {
        try {
            console.log('⏳ Processing Items...');
            const exportsObj = require('./items.ts');
            const data = exportsObj[Object.keys(exportsObj)[0]];
            const outputJSON = {};
            for (const key in data) {
                if (data[key].name) {
                    outputJSON[data[key].name] = {
                        description: data[key].shortDesc || data[key].desc || "No description."
                    };
                }
            }
            fs.writeFileSync('./items.json', JSON.stringify(outputJSON, null, 4));
            console.log(`✅ items.json created (${Object.keys(outputJSON).length} entries)`);
        } catch (e) { console.error('❌ Failed Items:', e.message); }
    }

    // --- 4. PROCESS ABILITIES ---
    if (selected.includes('abilities')) {
        try {
            console.log('⏳ Processing Abilities...');
            const exportsObj = require('./abilities.ts');
            const data = exportsObj[Object.keys(exportsObj)[0]];
            const outputJSON = {};
            for (const key in data) {
                if (data[key].name) {
                    outputJSON[data[key].name] = {
                        description: data[key].shortDesc || data[key].desc || "No description."
                    };
                }
            }
            fs.writeFileSync('./abilities.json', JSON.stringify(outputJSON, null, 4));
            console.log(`✅ abilities.json created (${Object.keys(outputJSON).length} entries)`);
        } catch (e) { console.error('❌ Failed Abilities:', e.message); }
    }

    console.log('\n✨ Build Complete. Remember to manually copy updated files to the dist/ folder.');
}

main();