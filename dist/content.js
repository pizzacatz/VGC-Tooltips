// ==========================================
// Phase 0: Cross-Browser Compatibility & State
// ==========================================
const vgcApi = typeof browser !== 'undefined' ? browser : chrome;
let tooltipsEnabled = true;

// Pre-load and sync storage state
vgcApi.storage.sync.get(['tooltipsEnabled'], (result) => {
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
                let attributesHtml = '';
                if (data.flags) {
                    const ignoredFlags = ['bypasssub', 'noassist', 'failcopycat'];
                    const activeFlags = Object.keys(data.flags).filter(flag => !ignoredFlags.includes(flag));
                    if (activeFlags.length > 0) {
                        let pills = activeFlags.map(flag => `<span style="background: #333; color: #fff; padding: 1px 6px; border-radius: 4px; font-size: 9px; text-transform: uppercase; margin-right: 4px; display: inline-block; margin-top: 4px; border: 1px solid #444;">${flag}</span>`).join('');
                        attributesHtml = `<div style="margin-top: 4px;">${pills}</div>`;
                    }
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

            tooltip.classList.add(borderClass);
            tooltip.innerHTML = `<div class="vgc-ribbon">${ribbonText}</div><div class="vgc-header"></div>${contentHtml}`;
            tooltip.querySelector('.vgc-header').textContent = id;
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
const CATEGORY_PRIORITY = ['move', 'pokemon', 'ability', 'item'];

// Cues are tested against the text immediately around a match, and only for
// categories the name actually belongs to — so a possessive can mean "item" for
// Metronome without that rule interfering with any other term.
const CATEGORY_CUES = [
    // "Pikachu used Metronome!" — anchored, so only an immediately preceding "used".
    { category: 'move', before: /\bused\s+$/i },
    { category: 'move', before: /\b(called|copied)\s+$/i },
    // "... knocked off Incineroar's Metronome!"
    { category: 'item', before: /['’]s\s+$/ },
    // "Incineroar obtained one Metronome." — allowed to skip a few words, but never
    // across a sentence boundary.
    { category: 'item', before: /\b(obtained|knocked off|found|ate|holding|using its|swapped)\b[^.!?]{0,24}$/i },
    { category: 'item', after: /^\s*(was (knocked off|stolen|consumed)|activated)\b/i },
    { category: 'ability', before: /['’]s\s+$/ },
];

function lookupTerm(name, category) {
    const candidates = vgcIndex[name];
    if (!candidates || candidates.length === 0) return null;
    if (category) {
        const match = candidates.find(c => c.vgc_category === category);
        if (match) return match;
    }
    return candidates[0];
}

// Returns the category a specific occurrence of `name` refers to. `text` is the full
// text node value and start/end bracket the match inside it.
function resolveCategory(candidates, text, start, end) {
    if (candidates.length === 1) return candidates[0].vgc_category;

    const before = text.slice(Math.max(0, start - 40), start);
    const after = text.slice(end, end + 40);

    for (const cue of CATEGORY_CUES) {
        if (!candidates.some(c => c.vgc_category === cue.category)) continue;
        if (cue.before && cue.before.test(before)) return cue.category;
        if (cue.after && cue.after.test(after)) return cue.category;
    }
    return candidates[0].vgc_category;
}

Promise.all([
    fetch(vgcApi.runtime.getURL("pokemon.json")).then(res => res.json()),
    fetch(vgcApi.runtime.getURL("moves.json")).then(res => res.json()),
    fetch(vgcApi.runtime.getURL("items.json")).then(res => res.json()),
    fetch(vgcApi.runtime.getURL("abilities.json")).then(res => res.json())
])
.then(([pokemonData, movesData, itemsData, abilitiesData]) => {
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

    for (const name in vgcIndex) {
        if (vgcIndex[name].length > 1) {
            vgcIndex[name].sort((a, b) =>
                CATEGORY_PRIORITY.indexOf(a.vgc_category) - CATEGORY_PRIORITY.indexOf(b.vgc_category));
        }
    }

    const sortedKeys = Object.keys(vgcIndex).sort((a, b) => b.length - a.length);
    if (sortedKeys.length === 0) return;

    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const terms = sortedKeys.map(key => escapeRegExp(key)).join('|');
    const regex = new RegExp(`(?<![a-zA-Z0-9_])(${terms})(?![a-zA-Z0-9_])`, 'g');

    console.log("VGC Master Library Loaded.");

    // Replaces the matched terms inside a single text node with hover spans, building
    // the result out of DOM nodes. Assigning the node's text back through innerHTML
    // would re-parse markup that Showdown had already escaped, so chat text such as
    // "Pikachu <img src=x onerror=...>" would execute. Everything that is not a match
    // stays a text node and can never become an element.
    function wrapTextNode(textNode) {
        const text = textNode.nodeValue;
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
                ? resolveCategory(candidates, text, match.index, match.index + term.length)
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

    // Handles a node from anywhere in the page. Showdown appends each new log line
    // as a child of an existing .battle-history, so the added node is usually
    // inside a log rather than being the log itself — both cases are covered here.
    function scanAndWrap(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.parentElement && node.parentElement.closest('.battle-history')) {
                wrapTextNode(node);
            }
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        if (node.closest('.battle-history')) {
            collectTextNodes(node).forEach(wrapTextNode);
            return;
        }
        node.querySelectorAll('.battle-history').forEach(history => {
            collectTextNodes(history).forEach(wrapTextNode);
        });
    }

    document.querySelectorAll('.battle-history').forEach(scanAndWrap);

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
