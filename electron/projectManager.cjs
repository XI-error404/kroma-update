/**
 * Kroma プロジェクトマネージャー
 * .kroma ファイルの保存と読み込み
 */

const fs = require('fs');
const path = require('path');

const KROMA_VERSION = '1.0';

/**
 * プロジェクトを保存
 * @param {string} filePath - 保存先 (.kroma)
 * @param {Object} data - プロジェクトデータ
 */
function saveProject(filePath, data) {
    const projectData = {
        version: KROMA_VERSION,
        materialId: data.materialId,
        isExternal: data.isExternal || false,
        settings: {
            hue: data.hue,
            saturation: data.saturation,
            brightness: data.brightness
        },
        presets: data.presets || [],
        timestamp: Date.now()
    };

    const json = JSON.stringify(projectData, null, 2);
    fs.writeFileSync(filePath, json, 'utf8');
}

/**
 * プロジェクトを読み込み
 * @param {string} filePath - 読み込み元 (.kroma)
 * @returns {Object}
 */
function loadProject(filePath) {
    const json = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(json);

    if (data.version !== KROMA_VERSION) {
        console.warn(`Project version mismatch: ${data.version} vs ${KROMA_VERSION}`);
    }

    return data;
}

module.exports = {
    saveProject,
    loadProject
};
