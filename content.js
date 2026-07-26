// ==========================================
// Phase 0: Cross-Browser Compatibility & State
// ==========================================
const vgcApi = typeof browser !== 'undefined' ? browser : chrome;
let tooltipsEnabled = true;

// Pre-load and sync storage state.
//
// Read via the returned promise rather than a callback. Firefox's `browser.*`
// APIs are promise-only, so a callback passed here would never run and the
// toggle would silently stay on for every Firefox user. Chrome's `chrome.*`
// storage API also returns a promise when no callback is given, so one form
// covers both browsers.
vgcApi.storage.sync.get(['tooltipsEnabled']).then((result) => {
    if (result.tooltipsEnabled !== undefined) {
        tooltipsEnabled = result.tooltipsEnabled;
    }
});

// Watch for changes in real-time
vgcApi.storage.onChanged.addListener((changes) => {
    if (changes.tooltipsEnabled) {
        tooltipsEnabled = changes.tooltipsEnabled.newValue;
    }
});

// ==========================================
// Phase 1: The Visual Tooltip Chassis
// ==========================================
const tooltip = document.createElement('div');
tooltip.id = 'vgc-tooltip';
document.body.appendChild(tooltip);

function createTag(text) {
    const className = `bg-${text.toLowerCase()}`;
    return `<span class="vgc-tag ${className}">${text}</span>`;
}

// Event Delegation (The Hover Mechanic)
document.addEventListener('mouseover', (e) => {
    if (!tooltipsEnabled) return;

    if (e.target && e.target.classList.contains('vgc-hover')) {
        const id = e.target.getAttribute('data-id');
        // A name can belong to more than one library (see NAME COLLISIONS below), so the
        // scanner records which one it resolved to and the tooltip honours that choice.
        const data = lookupTerm(id, e.target.getAttribute('data-cat'));

        if (data) {
            tooltip.className = '';
            tooltip.style.setProperty('--move-border-color', 'transparent');
            
            let ribbonText = '';
            let borderClass = '';
            let contentHtml = '';
            // Defaults to the text that was hovered; a category may override it to
            // present a canonical name instead.
            let headerText = id;
            // Text pulled from the data libraries is injected as textContent after the
            // markup is built, never interpolated into an HTML string.
            let descText = '';

            if (data.vgc_category === 'pokemon') {
                ribbonText = 'POKÉMON';
                borderClass = 'pokemon-border';
                let tagsHtml = data.types.map(type => createTag(type)).join('');
                const stats = data.stats.split('/');
                const labels = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
                let statsHtml = '<div style="margin-top: 4px;">';
                labels.forEach((label, i) => {
                    const val = parseInt(stats[i]) || 0;
                    const width = Math.min(100, (val / 255) * 100);
                    statsHtml += `<div class="vgc-stat-row"><span class="vgc-stat-label">${label}</span><span class="vgc-stat-value">${val}</span><div class="vgc-bar-bg"><div class="vgc-bar-fill" style="width: ${width}%;"></div></div></div>`;
                });
                statsHtml += '</div>';
                contentHtml = `<div style="margin-bottom: 4px;">${tagsHtml}</div><div class="vgc-content" style="padding-top: 0;">${statsHtml}</div>`;
            } 
            else if (data.vgc_category === 'move') {
                ribbonText = 'MOVE';
                borderClass = 'move-border';
                tooltip.style.setProperty('--move-border-color', `var(--type-${data.type.toLowerCase()})`);
                let typeTag = createTag(data.type);
                let catTag = createTag(data.category);
                let bp = data.basePower || '--';
                let acc = data.accuracy === true ? '--' : (typeof data.accuracy === 'number' ? data.accuracy + '%' : data.accuracy || '--');
                let pp = data.pp || '--';
                let prio = data.priority || 0;
                let prioDisplay = prio > 0 ? `+${prio}` : prio;
                let statsHtml = `<div class="vgc-stat-grid vgc-move-stats" style="margin-bottom: 4px;"><div class="vgc-stat-box"><span class="vgc-stat-label">Power</span><span class="vgc-stat-value">${bp}</span></div><div class="vgc-stat-box"><span class="vgc-stat-label">Accuracy</span><span class="vgc-stat-value">${acc}</span></div><div class="vgc-stat-box"><span class="vgc-stat-label">PP</span><span class="vgc-stat-value">${pp}</span></div><div class="vgc-stat-box"><span class="vgc-stat-label">Priority</span><span class="vgc-stat-value">${prioDisplay}</span></div></div>`;
                descText = data.description || data.shortDesc || '';
                // Classifications arrive from moves.json already carrying their official
                // Champions labels, in the order the game's own filter list uses, so there
                // is nothing to translate or sort here. Contact goes last, since it is not
                // one of the twelve — Champions does not label it — but it is otherwise
                // presented the same way.
                let attributesHtml = '';
                const classifications = data.classifications || [];
                const pills = classifications
                    .map(label => `<span class="vgc-pill">${label}</span>`)
                    .join('');
                const contactPill = data.contact
                    ? `<span class="vgc-pill">Contact</span>`
                    : '';
                if (pills || contactPill) {
                    attributesHtml = `<div class="vgc-pill-row">${pills}${contactPill}</div>`;
                }
                contentHtml = `<div style="margin-bottom: 4px;">${typeTag} ${catTag}</div><div class="vgc-content" style="padding-top: 0;">${statsHtml}<div class="desc-text" style="color: #fff; margin-top: 4px;"></div>${attributesHtml}</div>`;
            }
            else if (data.vgc_category === 'ability') {
                ribbonText = 'ABILITY';
                borderClass = 'ability-border';
                descText = data.description || data.shortDesc || '';
                contentHtml = `<div class="vgc-content" style="border-top: none; padding-top: 0;"><div class="desc-text"></div></div>`;
            }
            else if (data.vgc_category === 'item') {
                ribbonText = 'ITEM';
                borderClass = 'item-border';
                descText = data.description || data.shortDesc || '';
                contentHtml = `<div class="vgc-content" style="border-top: none; padding-top: 0;"><div class="desc-text"></div></div>`;
            }
            else if (data.vgc_category === 'nature') {
                // "Stat Alignment" is the official term; "Nature" is the community one.
                // Pages use either — mainline sheets write "Adamant Nature", Pokemon
                // Champions sheets write "Stat Alignment: Adamant" — but the tooltip
                // always presents the official term, and the header is always the bare
                // name, so both spellings produce exactly the same tooltip.
                ribbonText = 'STAT ALIGNMENT';
                headerText = data.name || id;
                borderClass = 'nature-border';
                descText = data.description || '';
                let statsHtml = '';
                if (data.plus && data.minus) {
                    // No trailing margin: the boxes are the last thing in the tooltip.
                    statsHtml = `<div class="vgc-stat-grid vgc-nature-stats">`
                        + `<div class="vgc-stat-box"><span class="vgc-stat-label">Raises</span><span class="vgc-stat-value vgc-stat-plus">${data.plus}</span></div>`
                        + `<div class="vgc-stat-box"><span class="vgc-stat-label">Lowers</span><span class="vgc-stat-value vgc-stat-minus">${data.minus}</span></div>`
                        + `</div>`;
                }
                // Only the neutral natures carry text, so the element is omitted rather
                // than left empty for the rest.
                const descHtml = descText ? `<div class="desc-text"></div>` : '';
                contentHtml = `<div class="vgc-content" style="border-top: none; padding-top: 0;">${statsHtml}${descHtml}</div>`;
            }

            tooltip.classList.add(borderClass);
            tooltip.innerHTML = `<div class="vgc-ribbon">${ribbonText}</div><div class="vgc-header"></div>${contentHtml}`;
            tooltip.querySelector('.vgc-header').textContent = headerText;
            const descEl = tooltip.querySelector('.desc-text');
            if (descEl) descEl.textContent = descText;
            tooltip.style.display = 'block';
        }
    }
});

document.addEventListener('mousemove', (e) => {
    if (tooltip.style.display === 'block') {
        const padding = 15;
        let x = e.pageX + padding;
        let y = e.pageY + padding;
        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;
        const pageWidth = window.innerWidth + window.scrollX;
        const pageHeight = window.innerHeight + window.scrollY;
        if (x + tooltipWidth > pageWidth) x = e.pageX - tooltipWidth - padding;
        if (y + tooltipHeight > pageHeight) y = e.pageY - tooltipHeight - padding;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }
});

document.addEventListener('mouseout', (e) => {
    if (e.target && e.target.classList.contains('vgc-hover')) {
        tooltip.style.display = 'none';
    }
});

// ==========================================
// Phase 2: The Data Pipeline & Scanner Engine
// ==========================================

// NAME COLLISIONS
// ---------------
// A single name can exist in more than one library — "Metronome" is both a move
// ("Picks a random move.") and an item ("Damage of moves used on consecutive turns
// is increased."). vgcIndex therefore maps each name to a LIST of candidates rather
// than to one entry, so a collision cannot silently overwrite anything. Which
// candidate a given occurrence means is decided from the surrounding log text by
// resolveCategory(); `node build.js` warns whenever a new collision appears.
let vgcIndex = {};

// When no cue matches, prefer the category a battle log is most likely to be
// naming. Candidate lists are kept sorted by this order, so candidates[0] is the
// default. Moves lead because logs announce them explicitly on every use.
const CATEGORY_PRIORITY = ['move', 'pokemon', 'ability', 'item', 'nature'];

// SITE PROFILES
// -------------
// Each supported site says where its text lives and how to tell a colliding name
// apart there. `containers` is where scanning is allowed at all, which keeps the
// scanner out of navigation and chrome. `scopes` map an enclosing element straight
// to a category and are preferred when a site marks up its data structurally.
// `cues` are wording tests applied to the text around a match, used where the page
// is only formatted text.
const SITE_PROFILES = [
    {
        id: 'showdown',
        hosts: ['play.pokemonshowdown.com', 'replay.pokemonshowdown.com'],
        containers: '.battle-history',
        cues: [
            // "Pikachu used Metronome!" — anchored, so only an immediately preceding "used".
            { category: 'move', before: /\bused\s+$/i },
            { category: 'move', before: /\b(called|copied)\s+$/i },
            // "... knocked off Incineroar's Metronome!"
            { category: 'item', before: /['’]s\s+$/ },
            // "Incineroar obtained one Metronome." — allowed to skip a few words, but
            // never across a sentence boundary.
            { category: 'item', before: /\b(obtained|knocked off|found|ate|holding|using its|swapped)\b[^.!?]{0,24}$/i },
            { category: 'item', after: /^\s*(was (knocked off|stolen|consumed)|activated)\b/i },
            { category: 'ability', before: /['’]s\s+$/ },
        ],
    },
    {
        // PokePaste renders each set into <article><pre>, colouring names with <span>
        // by type. The type classes say nothing about which library a name came from,
        // so the set format itself is the signal: the item always follows " @ ".
        id: 'pokepaste',
        hosts: ['pokepast.es', 'www.pokepast.es'],
        containers: 'article pre',
        cues: [
            { category: 'item', before: /@\s*$/ },
            { category: 'ability', before: /\bAbility:\s*$/i },
            // A move line starts with "- ". The dash is inside its own <span>, so this
            // is only reachable because context is gathered across element boundaries.
            { category: 'move', before: /(^|\n)\s*-\s+$/ },
            { category: 'pokemon', after: /^[^\n]*\s@\s/ },
        ],
    },
    {
        // Both Limitless sites mark their team lists up structurally — .item, .ability
        // and the move list are separate elements — so the enclosing element is a
        // definitive answer and no text heuristic is needed. They share a template but
        // differ in places: play.limitlesstcg.com names the move list .attacks,
        // limitlessvgc.com names it .moves, and only limitlessvgc.com has the usage
        // tables on /pokemon/<name>. Listing both sets of selectors covers each site;
        // a selector that does not exist on a page simply never matches.
        id: 'limitless',
        hosts: ['play.limitlesstcg.com', 'limitlessvgc.com', 'www.limitlessvgc.com'],
        containers: '.teamlist, .stats-tables',
        scopes: [
            { selector: '.item', category: 'item' },
            { selector: '.ability', category: 'ability' },
            { selector: '.attacks, .moves', category: 'move' },
            { selector: '.name', category: 'pokemon' },
            // Usage tables on limitlessvgc.com/pokemon/<name>. Each table is titled by
            // its leading <th> ("Items", "Moves", "Abilities", "Team Partners"), which
            // states the category of every name in that table.
            { selector: 'table', header: /^\s*Items\s*$/i, category: 'item' },
            { selector: 'table', header: /^\s*Moves\s*$/i, category: 'move' },
            { selector: 'table', header: /^\s*Abilities\s*$/i, category: 'ability' },
            { selector: 'table', header: /^\s*Team Partners\s*$/i, category: 'pokemon' },
        ],
        cues: [
            // Fallback if the team-list markup ever changes: the item is the line
            // directly above the one reading "Ability:".
            { category: 'item', after: /^\s*Ability:/i },
        ],
        // Champions events reuse the .tera slot for "Stat Alignment: Adamant".
        bareNatures: '.nature, .tera',
    },
    {
        // The standings app keeps .item and .ability but is otherwise a separate
        // build: there is no .teamlist wrapper, the species is a link, and the move
        // list is a plain <ul> carrying only layout classes. It therefore needs its
        // own container — reusing this one on the other Limitless sites would widen
        // scanning there from team lists to their whole content area.
        id: 'limitless-standings',
        hosts: ['standings.limitlessvgc.com'],
        containers: '.container.content',
        scopes: [
            { selector: '.item', category: 'item' },
            { selector: '.ability', category: 'ability' },
            { selector: 'a[href*="/pokemon/"]', category: 'pokemon' },
            { selector: 'ul li', category: 'move' },
        ],
        cues: [
            { category: 'item', after: /^\s*Ability:/i },
        ],
        bareNatures: '.nature, .tera',
    },
];

// Saved replay files opened from disk have no hostname, and they are Showdown pages,
// so the Showdown profile is also the fallback.
const SITE = SITE_PROFILES.find(p => p.hosts.includes(location.hostname)) || SITE_PROFILES[0];
const CONTAINER_SELECTOR = SITE.containers;

// Lets styles.css defer to a host site's own colouring — PokePaste and Limitless
// already colour names, and overriding that would throw away information.
document.documentElement.setAttribute('data-vgc-site', SITE.id);

function lookupTerm(name, category) {
    const candidates = vgcIndex[name];
    if (!candidates || candidates.length === 0) return null;
    if (category) {
        const match = candidates.find(c => c.vgc_category === category);
        if (match) return match;
    }
    return candidates[0];
}

const CONTEXT_CHARS = 40;

// Walks the DOM in document order collecting up to `budget` characters of text on
// one side of `node`, without leaving `container`. A text node rarely holds all the
// context needed: PokePaste puts " @ " in a text node of its own between the species
// <span> and the item <span>, so reading only the matched node would never see it.
function textAround(node, container, budget, forwards) {
    let out = '';
    let current = node;

    while (out.length < budget && current && current !== container) {
        const sibling = forwards ? current.nextSibling : current.previousSibling;
        if (!sibling) {
            current = current.parentNode;
            continue;
        }
        current = sibling;
        const text = sibling.textContent || '';
        out = forwards ? out + text : text + out;
    }
    return forwards ? out.slice(0, budget) : out.slice(-budget);
}

// Returns the category a specific occurrence refers to. `text` is the matched node's
// value; start/end bracket the match inside it.
function resolveCategory(candidates, textNode, container, text, start, end) {
    if (candidates.length === 1) return candidates[0].vgc_category;
    const has = (category) => candidates.some(c => c.vgc_category === category);

    // 1. Structural scopes: an enclosing element that states the category outright.
    const element = textNode.parentElement;
    if (element) {
        for (const scope of SITE.scopes || []) {
            if (!has(scope.category)) continue;
            const host = element.closest(scope.selector);
            if (!host) continue;
            // A scope may additionally require the enclosing element to be titled —
            // used for tables whose heading names the category of their contents.
            if (scope.header) {
                const heading = host.querySelector('th');
                if (!heading || !scope.header.test(heading.textContent)) continue;
            }
            return scope.category;
        }
    }

    // 2. Wording cues, extended across element boundaries only when needed.
    let before = text.slice(Math.max(0, start - CONTEXT_CHARS), start);
    let after = text.slice(end, end + CONTEXT_CHARS);
    if (container) {
        if (before.length < CONTEXT_CHARS) {
            before = textAround(textNode, container, CONTEXT_CHARS - before.length, false) + before;
        }
        if (after.length < CONTEXT_CHARS) {
            after += textAround(textNode, container, CONTEXT_CHARS - after.length, true);
        }
    }

    for (const cue of SITE.cues || []) {
        if (!has(cue.category)) continue;
        if (cue.before && cue.before.test(before)) return cue.category;
        if (cue.after && cue.after.test(after)) return cue.category;
    }

    // 3. Nothing decisive — fall back to the most likely category.
    return candidates[0].vgc_category;
}

Promise.all([
    fetch(vgcApi.runtime.getURL("pokemon.json")).then(res => res.json()),
    fetch(vgcApi.runtime.getURL("moves.json")).then(res => res.json()),
    fetch(vgcApi.runtime.getURL("items.json")).then(res => res.json()),
    fetch(vgcApi.runtime.getURL("abilities.json")).then(res => res.json()),
    fetch(vgcApi.runtime.getURL("natures.json")).then(res => res.json())
])
.then(([pokemonData, movesData, itemsData, abilitiesData, naturesData]) => {
    // Collect every library into name -> [candidates] instead of merging them, which
    // previously let the last spread win and made colliding names unreachable.
    const addLibrary = (library, category) => {
        for (const name in library) {
            const entry = library[name];
            entry.vgc_category = category;
            (vgcIndex[name] = vgcIndex[name] || []).push(entry);
        }
    };
    addLibrary(pokemonData, 'pokemon');
    addLibrary(movesData, 'move');
    addLibrary(itemsData, 'item');
    addLibrary(abilitiesData, 'ability');
    addLibrary(naturesData, 'nature');

    // Pokemon Champions team sheets label the field "Stat Alignment: Adamant", so the
    // nature name appears on its own. Register the bare form as well, and remember
    // which keys those are — they are kept out of the default term list below, because
    // loose nature names are ordinary words (Bold, Calm, Serious, Brave, Naive).
    const bareNatureNames = new Set();
    for (const phrase in naturesData) {
        const entry = naturesData[phrase];
        if (!entry.name || vgcIndex[entry.name]) continue;
        vgcIndex[entry.name] = [entry];
        bareNatureNames.add(entry.name);
    }

    for (const name in vgcIndex) {
        if (vgcIndex[name].length > 1) {
            vgcIndex[name].sort((a, b) =>
                CATEGORY_PRIORITY.indexOf(a.vgc_category) - CATEGORY_PRIORITY.indexOf(b.vgc_category));
        }
    }

    const sortedKeys = Object.keys(vgcIndex).sort((a, b) => b.length - a.length);
    if (sortedKeys.length === 0) return;

    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Longest first, so "Adamant Orb" wins over "Adamant" and "Adamant Nature" over
    // the bare "Adamant".
    const buildRegex = (keys) =>
        new RegExp(`(?<![a-zA-Z0-9_])(${keys.map(escapeRegExp).join('|')})(?![a-zA-Z0-9_])`, 'g');

    const baseRegex = buildRegex(sortedKeys.filter(key => !bareNatureNames.has(key)));
    // Built only for sites that have a field where a bare nature name can appear.
    const bareNatureRegex = SITE.bareNatures ? buildRegex(sortedKeys) : null;

    function regexFor(textNode) {
        if (bareNatureRegex && textNode.parentElement &&
            textNode.parentElement.closest(SITE.bareNatures)) {
            return bareNatureRegex;
        }
        return baseRegex;
    }

    console.log("VGC Master Library Loaded.");

    // Replaces the matched terms inside a single text node with hover spans, building
    // the result out of DOM nodes. Assigning the node's text back through innerHTML
    // would re-parse markup that Showdown had already escaped, so chat text such as
    // "Pikachu <img src=x onerror=...>" would execute. Everything that is not a match
    // stays a text node and can never become an element.
    function wrapTextNode(textNode, container) {
        const text = textNode.nodeValue;
        const regex = regexFor(textNode);
        regex.lastIndex = 0;
        let match;
        let lastIndex = 0;
        let fragment = null;

        while ((match = regex.exec(text)) !== null) {
            if (!fragment) fragment = document.createDocumentFragment();
            const term = match[1];

            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }

            // Resolve which library this occurrence means before building the span, so
            // the underline colour matches the tooltip the hover will show.
            const candidates = vgcIndex[term] || [];
            const category = candidates.length
                ? resolveCategory(candidates, textNode, container, text, match.index, match.index + term.length)
                : '';

            const span = document.createElement('span');
            span.className = category ? `vgc-hover vgc-type-${category}` : 'vgc-hover';
            span.setAttribute('data-id', term);
            if (category) span.setAttribute('data-cat', category);
            span.textContent = term;
            fragment.appendChild(span);

            lastIndex = match.index + term.length;
        }

        if (!fragment) return;
        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        textNode.replaceWith(fragment);
    }

    // Collects every text node under `root` that has not already been wrapped.
    function collectTextNodes(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            if (node.parentElement && !node.parentElement.classList.contains('vgc-hover')) {
                textNodes.push(node);
            }
        }
        return textNodes;
    }

    function scanContainer(container) {
        collectTextNodes(container).forEach(node => wrapTextNode(node, container));
    }

    // Handles a node from anywhere in the page. Showdown appends each new log line as
    // a child of an existing .battle-history, so an added node is usually inside a
    // container rather than being one — both cases are covered here.
    function scanAndWrap(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const container = node.parentElement && node.parentElement.closest(CONTAINER_SELECTOR);
            if (container) wrapTextNode(node, container);
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const container = node.closest(CONTAINER_SELECTOR);
        if (container) {
            collectTextNodes(node).forEach(textNode => wrapTextNode(textNode, container));
            return;
        }
        node.querySelectorAll(CONTAINER_SELECTOR).forEach(scanContainer);
    }

    document.querySelectorAll(CONTAINER_SELECTOR).forEach(scanContainer);

    // A single document-level observer replaces the previous 2s polling loop, so new
    // log lines highlight as they arrive instead of up to two seconds later, and no
    // work happens while the page is idle.
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach(scanAndWrap);
        });
        // Discard the records our own wrapping just generated; re-scanning them would
        // find nothing, and dropping them keeps the observer from looping over itself.
        observer.takeRecords();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
})
.catch(error => console.error("Error loading VGC Libraries:", error));
