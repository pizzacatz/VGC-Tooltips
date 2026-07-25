document.addEventListener('DOMContentLoaded', () => {
    const toggleSwitch = document.getElementById('toggle-tooltips');

    // Load the current state
    chrome.storage.sync.get(['tooltipsEnabled'], (result) => {
        // Default to true if not set
        if (result.tooltipsEnabled !== undefined) {
            toggleSwitch.checked = result.tooltipsEnabled;
        } else {
            toggleSwitch.checked = true;
        }
    });

    // Listen for changes and save state
    toggleSwitch.addEventListener('change', () => {
        chrome.storage.sync.set({ tooltipsEnabled: toggleSwitch.checked });
    });
});