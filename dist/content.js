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
        const data = vgcData[id];
        
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
let vgcData = {}; 

Promise.all([
    fetch(chrome.runtime.getURL("pokemon.json")).then(res => res.json()),
    fetch(chrome.runtime.getURL("moves.json")).then(res => res.json()),
    fetch(chrome.runtime.getURL("items.json")).then(res => res.json()),
    fetch(chrome.runtime.getURL("abilities.json")).then(res => res.json())
])
.then(([pokemonData, movesData, itemsData, abilitiesData]) => {
    Object.values(pokemonData).forEach(d => d.vgc_category = 'pokemon');
    Object.values(movesData).forEach(d => d.vgc_category = 'move');
    Object.values(itemsData).forEach(d => d.vgc_category = 'item');
    Object.values(abilitiesData).forEach(d => d.vgc_category = 'ability');

    vgcData = { ...pokemonData, ...movesData, ...itemsData, ...abilitiesData };
    const sortedKeys = Object.keys(vgcData).sort((a, b) => b.length - a.length);
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

            const data = vgcData[term];
            const span = document.createElement('span');
            span.className = data && data.vgc_category
                ? `vgc-hover vgc-type-${data.vgc_category}`
                : 'vgc-hover';
            span.setAttribute('data-id', term);
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

    function scanAndWrap(rootNode) {
        if (rootNode.nodeType === 1 && rootNode.classList && rootNode.classList.contains('battle-history')) {
            const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null, false);
            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                if (node.parentElement && !node.parentElement.classList.contains('vgc-hover')) {
                    textNodes.push(node);
                }
            }
            textNodes.forEach(wrapTextNode);
        }
    }
    
    const staticLogs = document.querySelectorAll('.battle-log-inline .battle-history');
    staticLogs.forEach(node => scanAndWrap(node));

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => scanAndWrap(node));
        });
    });

    setInterval(() => {
        const unobservedLogs = document.querySelectorAll('.battle-log:not(.vgc-observed)');
        unobservedLogs.forEach(log => {
            log.classList.add('vgc-observed'); 
            observer.observe(log, { childList: true, subtree: true });
            log.querySelectorAll('.battle-history').forEach(node => scanAndWrap(node));
        });
    }, 2000);
})
.catch(error => console.error("Error loading VGC Libraries:", error));
