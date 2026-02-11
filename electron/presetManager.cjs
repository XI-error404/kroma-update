/**
 * プリセットマネージャー
 */

const Store = require('electron-store');

const store = new Store({
    name: 'kroma-presets',
    defaults: {
        presets: [
            { id: 'p01', name: 'セピア', hue: 20, saturation: -50, brightness: 0 },
            { id: 'p02', name: 'ビビッド', hue: 0, saturation: 50, brightness: 10 },
            { id: 'p03', name: '夜間', hue: -150, saturation: -20, brightness: -20 },
        ]
    }
});

module.exports = {
    getPresets: () => store.get('presets'),
    savePreset: (preset) => {
        const presets = store.get('presets');
        presets.push({
            ...preset,
            id: 'p' + Date.now()
        });
        store.set('presets', presets);
    },
    deletePreset: (id) => {
        const presets = store.get('presets').filter(p => p.id !== id);
        store.set('presets', presets);
    }
};
