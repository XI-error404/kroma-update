const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { processImage, saveImage } = require('./imageProcessor.cjs');
const { decryptToBase64 } = require('./cryptoManager.cjs');
const license = require('./licenseManager.cjs');
const project = require('./projectManager.cjs');
const presets = require('./presetManager.cjs');

let mainWindow;

// Vite開発サーバーのURL
const DEV_URL = 'http://localhost:5173';
const MAX_RETRIES = 60;
const RETRY_INTERVAL = 1000;

// アプリバージョン
const CURRENT_VERSION = "1.0.0";
let hasCheckedUpdate = false;

// バージョン比較関数 (ライブラリ不使用)
function isNewer(current, latest) {
    const c = current.split('.').map(Number);
    const l = latest.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if ((l[i] || 0) > (c[i] || 0)) return true;
        if ((l[i] || 0) < (c[i] || 0)) return false;
    }
    return false;
}

// アップデートチェック
async function checkUpdate() {
    if (hasCheckedUpdate) return null;
    hasCheckedUpdate = true;

    try {
        const response = await fetch('https://raw.githubusercontent.com/XI-error404/kroma-update/main/update.json');
        if (!response.ok) return null;
        const data = await response.json();

        if (data && data.version && isNewer(CURRENT_VERSION, data.version)) {
            return {
                hasUpdate: true,
                latestVersion: data.version,
                url: data.url
            };
        }
    } catch (e) {
        // エラー時は静かに終了
    }
    return { hasUpdate: false };
}

// IPC ハンドラー設定
ipcMain.handle('app:checkUpdate', checkUpdate);

// 素材ディレクトリ
const MATERIALS_DIR = path.join(__dirname, '../materials');
const ENCRYPTED_DIR = path.join(MATERIALS_DIR, 'encrypted');

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: '開く',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => mainWindow.webContents.send('menu:open-image')
                },
                {
                    label: 'プロジェクト保存',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => mainWindow.webContents.send('menu:save-project')
                },
                { type: 'separator' },
                { label: '終了', role: 'quit' }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'リセット (UI初期化)',
                    click: () => mainWindow.webContents.send('menu:reset-ui')
                },
                { type: 'separator' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { role: 'resetZoom' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'ライセンス認証',
                    click: () => mainWindow.webContents.send('menu:open-license')
                },
                {
                    label: 'バージョン情報',
                    click: () => mainWindow.webContents.send('menu:open-about')
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 950,
        minWidth: 1440,
        minHeight: 950,
        backgroundColor: '#0f0f12',
        title: 'Kroma - Material Editor',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        titleBarStyle: 'default',
        show: false,
    });

    createMenu();

    const isDev = !app.isPackaged;

    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self' 'unsafe-inline' data:; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                    "font-src 'self' https://fonts.gstatic.com; " +
                    "img-src 'self' data: blob:;"
                ]
            }
        });
    });

    if (isDev) {
        console.log('🔧 Development mode');
        console.log('⏳ Waiting for Vite server at', DEV_URL);
        loadWithRetry(0);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
        });
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function loadWithRetry(attempt) {
    if (!mainWindow) return;

    mainWindow.loadURL(DEV_URL)
        .then(() => {
            console.log('✅ Connected to Vite server!');
            mainWindow.show();
            mainWindow.webContents.openDevTools();
        })
        .catch((err) => {
            if (attempt < MAX_RETRIES) {
                if (attempt % 5 === 0) {
                    console.log(`   Retry ${attempt + 1}/${MAX_RETRIES}...`);
                }
                setTimeout(() => loadWithRetry(attempt + 1), RETRY_INTERVAL);
            } else {
                console.error('❌ Could not connect to Vite server');
                dialog.showErrorBox('起動エラー', 'Vite開発サーバーに接続できませんでした。');
                app.quit();
            }
        });
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ==================== 画像操作 IPC ====================

ipcMain.handle('dialog:openImage', async () => {
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
        title: '画像を選択',
        properties: ['openFile'],
        filters: [
            { name: 'PNG Images', extensions: ['png'] },
            { name: 'All Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
        ],
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    const filePath = result.filePaths[0];

    try {
        const imageBuffer = fs.readFileSync(filePath);
        const base64 = imageBuffer.toString('base64');
        return {
            filePath,
            base64,
            fileName: path.basename(filePath),
        };
    } catch (error) {
        console.error('Error reading file:', error);
        dialog.showErrorBox('読み込みエラー', `ファイルを読み込めませんでした: ${error.message}`);
        return null;
    }
});

ipcMain.handle('image:process', async (event, { base64, hue, saturation, brightness }) => {
    try {
        const result = await processImage(base64, { hue, saturation, brightness });
        return { success: true, base64: result };
    } catch (error) {
        console.error('Image processing error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('image:save', async (event, { base64, originalFileName, hsv, overlay, skipProcessing }) => {
    if (!mainWindow) {
        return { success: false, error: 'Window not available' };
    }

    // 試用版制限チェック
    const trialStatus = license.getTrialStatus();
    if (!trialStatus.isFullVersion && trialStatus.remaining <= 0) {
        return {
            success: false,
            error: 'trial_limit_reached',
            message: '試用版の保存回数制限に達しました。ライセンスキーを入力してください。'
        };
    }

    try {
        const defaultName = originalFileName
            ? originalFileName.replace(/\.png$/i, '_edited.png')
            : 'edited_image.png';

        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'エクスポート',
            defaultPath: defaultName,
            filters: [
                { name: 'PNG Image', extensions: ['png'] },
            ],
        });

        if (result.canceled || !result.filePath) {
            return { success: false, canceled: true };
        }

        let processedBase64 = base64;

        // skipProcessing がある場合は加工をスキップしてそのまま保存 (Canvas結合データなどを想定)
        if (!skipProcessing) {
            processedBase64 = await processImage(base64, {
                hue: hsv?.hue || 0,
                saturation: hsv?.saturation || 0,
                brightness: hsv?.brightness || 0,
                overlayColor: overlay?.color,
                overlayOpacity: overlay?.opacity || 0
            });
        }

        await saveImage(processedBase64, result.filePath);

        // 保存カウントをインクリメント
        const saveResult = license.incrementSaveCount();

        return {
            success: true,
            filePath: result.filePath,
            trialStatus: saveResult,
        };
    } catch (error) {
        console.error('Save error:', error);
        return { success: false, error: error.message };
    }
});

// ==================== ライセンス IPC ====================

ipcMain.handle('license:validate', async (event, key) => {
    console.log('Validating license key:', key);
    const result = license.validateLicenseKey(key);

    if (result.valid) {
        license.unlockPack(result.packId);
        console.log('Pack unlocked:', result.packId);
    }

    return result;
});

ipcMain.handle('license:getInfo', async () => {
    return license.getLicenseInfo();
});

ipcMain.handle('license:getTrialStatus', async () => {
    return license.getTrialStatus();
});

ipcMain.handle('license:reset', async () => {
    license.resetLicense();
    return { success: true };
});

ipcMain.handle('app:check-update', async () => {
    const UPDATE_JSON_URL = 'https://raw.githubusercontent.com/XI-error404/kroma-update/main/update.json';
    const currentVersion = app.getVersion();

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(UPDATE_JSON_URL);
        const data = await response.json();

        const latestVersion = data.version;
        const compareVersions = (v1, v2) => {
            const parts1 = v1.split('.').map(Number);
            const parts2 = v2.split('.').map(Number);
            for (let i = 0; i < 3; i++) {
                if (parts2[i] > parts1[i]) return true;
                if (parts2[i] < parts1[i]) return false;
            }
            return false;
        };

        return {
            hasUpdate: compareVersions(currentVersion, latestVersion),
            latestVersion: latestVersion,
            message: data.message,
            boothUrl: data.url || 'https://booth.pm/ja/items/...'
        };
    } catch (error) {
        console.error('Update check failed:', error);
        return { hasUpdate: false, error: error.message };
    }
});

// ==================== 保存・エクスポート IPC ====================

ipcMain.handle('materials:getList', async () => {
    // 素材パック定義
    const packs = [
        {
            id: 'pack-01',
            name: 'パックA - 基本素材セット',
            materials: [
                { id: 'pack-01-001', name: 'キャラクター_戦士', file: 'character_warrior.enc' },
                { id: 'pack-01-002', name: 'キャラクター_魔法使い', file: 'character_mage.enc' },
                { id: 'pack-01-003', name: 'モンスター_スライム', file: 'monster_slime.enc' },
                { id: 'pack-01-004', name: 'アイテム_剣', file: 'item_sword.enc' },
                { id: 'pack-01-005', name: 'アイテム_盾', file: 'item_shield.enc' },
            ],
        },
        {
            id: 'pack-02',
            name: 'パックB - 追加素材',
            materials: [
                { id: 'pack-02-001', name: 'キャラクター_盗賊', file: 'character_thief.enc' },
                { id: 'pack-02-002', name: 'モンスター_ドラゴン', file: 'monster_dragon.enc' },
            ],
        },
    ];

    // アンロック状態を付与
    return packs.map(pack => ({
        ...pack,
        unlocked: license.isPackUnlocked(pack.id),
        materials: pack.materials.map(m => ({
            ...m,
            unlocked: license.isPackUnlocked(pack.id),
        })),
    }));
});

ipcMain.handle('materials:load', async (event, materialId) => {
    // 素材IDからパックを特定 (例: pack-01-001)
    const parts = materialId.split('-');
    const packId = parts.slice(0, 2).join('-');
    const fileName = parts[parts.length - 1]; // ラストパートをファイル名仮定

    // アンロック確認
    if (!license.isPackUnlocked(packId)) {
        return { success: false, error: 'locked', message: 'このパックはロックされています' };
    }

    // 暗号化ファイルを探す
    // 実運用ではマニフェスト等から正しいファイル名を引くべきですが、ここでは規則性から推測
    const encryptedPath = path.join(ENCRYPTED_DIR, packId, `${materialId}.enc`);

    try {
        if (fs.existsSync(encryptedPath)) {
            const base64 = decryptToBase64(encryptedPath);
            return { success: true, base64, materialId };
        }

        // デモ用: 暗号化ファイルがない場合はテスト画像を返す
        const testImagePath = path.join(__dirname, '../public/test-image.png');
        if (fs.existsSync(testImagePath)) {
            const buffer = fs.readFileSync(testImagePath);
            return {
                success: true,
                base64: buffer.toString('base64'),
                materialId,
            };
        }

        return { success: false, error: 'not_found', message: '素材ファイルが見つかりません' };
    } catch (error) {
        console.error('Material load error:', error);
        return { success: false, error: error.message };
    }
});

// ==================== プロジェクト (Pro/Std) IPC ====================

ipcMain.handle('project:save', async (event, data) => {
    if (!mainWindow) return { success: false };

    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'プロジェクトを保存',
        defaultPath: 'project.kroma',
        filters: [{ name: 'Kroma Project', extensions: ['kroma'] }],
    });

    if (result.canceled || !result.filePath) return { success: false, canceled: true };

    try {
        project.saveProject(result.filePath, data);
        return { success: true, filePath: result.filePath };
    } catch (error) {
        console.error('Project save error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('project:load', async () => {
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'プロジェクトを開く',
        filters: [{ name: 'Kroma Project', extensions: ['kroma'] }],
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    try {
        const data = project.loadProject(result.filePaths[0]);
        return { success: true, data };
    } catch (error) {
        console.error('Project load error:', error);
        return { success: false, error: error.message };
    }
});

// ==================== プリセット IPC ====================

ipcMain.handle('presets:get', async () => presets.getPresets());
ipcMain.handle('presets:save', async (event, preset) => {
    presets.savePreset(preset);
    return { success: true };
});
ipcMain.handle('presets:delete', async (event, id) => {
    presets.deletePreset(id);
    return { success: true };
});

// ==================== 一括エクスポート (Pro) IPC ====================

ipcMain.handle('batch:export', async (event, imagesToSave) => {
    // Pro版チェックは除外するか、あるいはライセンス側で判断
    // フロントエンドでフィルタリング済み前提だが、念のため
    const tier = license.getLicenseTier();
    // if (tier !== 'pro') ... (Request says "Pro判定" for save logic in general, batch is usually Pro but let's allow it if logic permits or check tier)
    // The existing code had a check. Let's keep it if it was there, or relax it if "Batch Save" is implied allowed.
    // The user request #3 says "Batch Save" implementation. #2 says "Pro Edition check".
    // I'll keep the check loosely or strictly as per existing code.

    // Existing code checked for 'pro'. I'll keep it for now as batch is usually a premium feature.
    if (tier !== 'pro') {
        return { success: false, error: 'pro_only', message: '一括保存はPro版限定機能です。' };
    }

    if (!mainWindow) return { success: false };

    const result = await dialog.showOpenDialog(mainWindow, {
        title: '一括保存先のフォルダを選択',
        properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true };

    const outputDir = result.filePaths[0];
    let successCount = 0;

    for (const img of imagesToSave) {
        try {
            // img: { base64, name, hsv, overlay }
            const processed = await processImage(img.base64, {
                hue: img.hsv?.hue || 0,
                saturation: img.hsv?.saturation || 0,
                brightness: img.hsv?.brightness || 0,
                overlayColor: img.overlay?.color,
                overlayOpacity: img.overlay?.opacity || 0
            });

            // ファイル名一意化
            let fileName = img.name || `image_${Date.now()}.png`;
            // 拡張子を除去して _edited を付与
            fileName = fileName.replace(/\.[^/.]+$/, "") + "_edited.png";

            const outputPath = path.join(outputDir, fileName);
            await saveImage(processed, outputPath);
            successCount++;
        } catch (err) {
            console.error(`Failed to export ${img.name}:`, err);
        }
    }

    return { success: true, outputDir, count: successCount };
});

// URLを外部ブラウザで開く
ipcMain.handle('app:openUrl', (event, url) => {
    if (url && url.startsWith('http')) {
        shell.openExternal(url);
    }
});

console.log('📦 Electron main process loaded with Kroma Pro system');

