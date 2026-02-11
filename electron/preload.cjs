const { contextBridge, ipcRenderer } = require('electron');

// セキュアな API をレンダラープロセスに公開
contextBridge.exposeInMainWorld('electronAPI', {
    // ==================== 画像操作 ====================
    openImage: () => ipcRenderer.invoke('dialog:openImage'),
    processImage: (params) => ipcRenderer.invoke('image:process', params),
    saveImage: (params) => ipcRenderer.invoke('image:save', params),

    // ==================== ライセンス ====================
    validateLicense: (key) => ipcRenderer.invoke('license:validate', key),
    getLicenseInfo: () => ipcRenderer.invoke('license:getInfo'),
    getTrialStatus: () => ipcRenderer.invoke('license:getTrialStatus'),
    resetLicense: () => ipcRenderer.invoke('license:reset'),

    // ==================== 素材リスト ====================
    getMaterialList: () => ipcRenderer.invoke('materials:getList'),
    loadMaterial: (materialId) => ipcRenderer.invoke('materials:load', materialId),

    // ==================== プロジェクト (.kroma) ====================
    saveProject: (data) => ipcRenderer.invoke('project:save', data),
    loadProject: () => ipcRenderer.invoke('project:load'),

    // ==================== プリセット ====================
    getPresets: () => ipcRenderer.invoke('presets:get'),
    savePreset: (preset) => ipcRenderer.invoke('presets:save', preset),
    deletePreset: (id) => ipcRenderer.invoke('presets:delete', id),

    // ==================== 一括操作 (Pro) ====================
    batchExport: (params) => ipcRenderer.invoke('batch:export', params),

    // ==================== アップデート ====================
    checkUpdate: () => ipcRenderer.invoke('app:checkUpdate'),
    openUrl: (url) => ipcRenderer.invoke('app:openUrl', url),

    // ==================== イベントリスナー ====================
    onMenuAction: (callback) => {
        const subscription = (event, action) => callback(action);
        ipcRenderer.on('menu:open-image', () => callback('open-image'));
        ipcRenderer.on('menu:save-project', () => callback('save-project'));
        ipcRenderer.on('menu:reset-ui', () => callback('reset-ui'));
        ipcRenderer.on('menu:open-license', () => callback('open-license'));
        ipcRenderer.on('menu:open-about', () => callback('open-about'));

        return () => {
            ipcRenderer.removeAllListeners('menu:open-image');
            ipcRenderer.removeAllListeners('menu:save-project');
            ipcRenderer.removeAllListeners('menu:reset-ui');
            ipcRenderer.removeAllListeners('menu:open-license');
            ipcRenderer.removeAllListeners('menu:open-about');
        };
    }
});

console.log('✅ Preload script loaded with license API');
