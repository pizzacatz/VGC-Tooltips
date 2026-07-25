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

async function main() {
    const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.ts'));

    if (files.length === 0) {
        console.log("No .ts files found in this directory.");
        return;
    }

    const response = await prompts({
        type: 'multiselect',
        name: 'selectedFiles',
        message: 'Select the files to convert (Up/Down arrows to move, Space to select, Enter to confirm):',
        choices: files.map(f => ({ title: f, value: f }))
    });

    let selected = response.selectedFiles;
    if (!selected || selected.length === 0) {
        console.log("No files selected. Exiting.");
        return;
    }

    // Determine if we need to process specific complex files
    const processMoves = selected.some(f => f.includes('moves'));
    const processPokedex = selected.some(f => f.includes('pokedex'));
    
    // Filter out complex files for the standard loop (Items, Abilities)
    const standardFiles = selected.filter(f => 
        !f.includes('moves') && 
        !f.includes('pokedex')
    );

    console.log('\nBuilding JSON libraries...\n');

    // --- 1. PROCESS STANDARD FILES (Items, Abilities) ---
    for (const file of standardFiles) {
        try {
            const exportsObj = require(`./${file}`);
            const exportKey = Object.keys(exportsObj)[0]; 
            const data = exportsObj[exportKey];
            const outputJSON = {};

            for (const key in data) {
                const entry = data[key];
                if (entry.name) {
                    outputJSON[entry.name] = {
                        description: entry.shortDesc || entry.desc || "No description available."
                    };
                }
            }

            const outName = file.replace('.ts', '.json');
            fs.writeFileSync(`../${outName}`, JSON.stringify(outputJSON, null, 4));
            console.log(`✅ Successfully created ${outName}`);

        } catch (error) {
            console.error(`❌ Failed to process ${file}:`, error.message);
        }
    }

    // --- 2. PROCESS POKEDEX (Pokemon) ---
    if (processPokedex) {
        try {
            const pokedexExports = require('./pokedex.ts');
            const pokedexData = pokedexExports[Object.keys(pokedexExports)[0]];
            const outputJSON = {};

            for (const key in pokedexData) {
                const pokemon = pokedexData[key];
                if (!pokemon.name || !pokemon.baseStats) continue;

                // Format stats into the string format content.js expects: HP/Atk/Def/SpA/SpD/Spe
                const s = pokemon.baseStats;
                const statsString = `${s.hp}/${s.atk}/${s.def}/${s.spa}/${s.spd}/${s.spe}`;

                outputJSON[pokemon.name] = {
                    types: pokemon.types,
                    stats: statsString
                };
            }

            fs.writeFileSync('../pokemon.json', JSON.stringify(outputJSON, null, 4));
            console.log(`✅ Successfully created pokemon.json`);

        } catch (error) {
            console.error(`❌ Failed to process pokedex.ts:`, error.message);
        }
    }

    // --- 3. PROCESS MOVES (Merging Data and Text) ---
    if (processMoves) {
        try {
            const IGNORED_FLAGS = [
                'bypasssub', 'noassist', 'protect', 'mirror', 
                'heal', 'metronome', 'reflectable', 'failencore', 
                'snatch', 'nonsky', 'distance', 'defrost', 'failcopycat',
                'failinstruct', 'nosleeptalk', 'charge', 'noparentalbond',
                'cantusetwice', 'failmefirst', 'failmimic', 
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
                    priority: move.priority,
                    description: textInfo.shortDesc || textInfo.desc || "No description available.",
                    flags: processedFlags
                };
            }

            fs.writeFileSync('../moves.json', JSON.stringify(outputJSON, null, 4));
            console.log(`✅ Successfully merged and created moves.json`);

        } catch (error) {
            console.error(`❌ Failed to process moves:`, error.message);
        }
    }
}

main();