// Same shim and promise form as content.js: Firefox exposes only `browser.*`
// with promises, Chrome only `chrome.*`, and both return a promise from
// storage when no callback is passed.
const vgcApi = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', () => {
    const toggleSwitch = document.getElementById('toggle-tooltips');

    // Load the current state
    vgcApi.storage.sync.get(['tooltipsEnabled']).then((result) => {
        // Default to true if not set
        if (result.tooltipsEnabled !== undefined) {
            toggleSwitch.checked = result.tooltipsEnabled;
        } else {
            toggleSwitch.checked = true;
        }
    });

    // Listen for changes and save state
    toggleSwitch.addEventListener('change', () => {
        vgcApi.storage.sync.set({ tooltipsEnabled: toggleSwitch.checked });
    });
});