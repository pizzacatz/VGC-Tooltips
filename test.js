// Event Delegation (The Hover Mechanic)
document.addEventListener('mouseover', (e) => {
    if (e.target && e.target.classList.contains('vgc-hover')) {
        const id = e.target.getAttribute('data-id');
        const data = vgcData[id];
        
        if (data) {
            // 1. Reset to the default dark theme for Items, Abilities, and Pokemon
            tooltip.style.backgroundColor = '#1a1a1a';
            tooltip.style.textShadow = 'none';
            tooltip.style.borderColor = '#4a4a4a';

            let html = `<strong style="font-size: 16px;">${id}</strong><hr style="margin: 5px 0; border-color: rgba(255,255,255,0.2);">`;
            
            // Check if it's a Pokemon (has an array of types)
            if (data.types) {
                let tagsHtml = data.types.map(type => createTag(type)).join('');
                html += `<div style="margin-bottom: 5px;">${tagsHtml}</div>`;
                if (data.stats) html += `<div style="margin-top: 5px;"><strong>Base Stats:</strong><br>${data.stats}</div>`;
            }
            
            // Check if it's a Move (has a single type and a damage category)
            if (data.category && data.type) {
                // THE UPGRADE: Dynamically change the entire tooltip background
                tooltip.style.backgroundColor = `var(--type-${data.type.toLowerCase()})`;
                
                // Showdex Trick: Force a heavy text-shadow so white text is readable on bright colors like Electric/Ice
                tooltip.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.8)'; 
                tooltip.style.borderColor = 'rgba(0,0,0,0.3)';

                let typeTag = createTag(data.type);
                let catTag = createTag(data.category);
                html += `<div style="margin-bottom: 5px;">${typeTag} ${catTag}</div>`;
                
                // The Expanded Stats
                if (data.basePower) html += `<div><strong>BP:</strong> ${data.basePower}</div>`;
                if (data.accuracy) html += `<div><strong>Acc:</strong> ${data.accuracy === true ? '--' : data.accuracy}</div>`;
                if (data.pp) html += `<div><strong>PP:</strong> ${data.pp}</div>`;
                
                // The Flag Parser
                if (data.flags) {
                    const ignoredFlags = ['bypasssub', 'noassist', 'failycopycat'];
                    
                    // Grab the keys, filter out the ignored ones, and join them with a comma
                    const activeFlags = Object.keys(data.flags)
                        .filter(flag => !ignoredFlags.includes(flag))
                        .join(', ');
                        
                    if (activeFlags) {
                        html += `<div style="margin-top: 5px; font-size: 11px; text-transform: capitalize;"><strong>Flags:</strong> ${activeFlags}</div>`;
                    }
                }
            }

            // Append standard descriptions (works for Items, Abilities, and Moves)
            if (data.description) html += `<div style="margin-top: 5px;"><em>${data.description}</em></div>`;
            if (data.shortDesc) html += `<div style="margin-top: 5px;"><em>${data.shortDesc}</em></div>`;
            
            tooltip.innerHTML = html;
            tooltip.style.display = 'block';
        }
    }
});