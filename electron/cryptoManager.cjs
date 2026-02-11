/**
 * 暗号化・復号マネージャー
 * AES-256-GCM を使用した素材保護
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 暗号化設定
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// マスターキー（本番環境では環境変数またはセキュアな場所から取得）
// これは素材パックの暗号化に使用するアプリケーションキー
const MASTER_KEY = Buffer.from('TRPGMaterialEditorSecretKey2024!'); // 32 bytes

/**
 * 画像ファイルを暗号化
 * @param {string} inputPath - 入力ファイルパス
 * @param {string} outputPath - 出力ファイルパス (.enc)
 */
function encryptFile(inputPath, outputPath) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);

    const input = fs.readFileSync(inputPath);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // フォーマット: [IV (16 bytes)][AuthTag (16 bytes)][Encrypted Data]
    const output = Buffer.concat([iv, authTag, encrypted]);
    fs.writeFileSync(outputPath, output);

    console.log(`Encrypted: ${inputPath} -> ${outputPath}`);
    return outputPath;
}

/**
 * 暗号化ファイルを復号
 * @param {string} filePath - 暗号化ファイルパス (.enc)
 * @returns {Buffer} 復号されたデータ
 */
function decryptFile(filePath) {
    const data = fs.readFileSync(filePath);

    // データを分解
    const iv = data.slice(0, IV_LENGTH);
    const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.slice(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted;
}

/**
 * 暗号化ファイルをBase64で取得（レンダラーに渡す用）
 * @param {string} filePath - 暗号化ファイルパス
 * @returns {string} Base64エンコードされた画像データ
 */
function decryptToBase64(filePath) {
    const decrypted = decryptFile(filePath);
    return decrypted.toString('base64');
}

/**
 * ディレクトリ内の全PNG画像を暗号化
 * @param {string} inputDir - 入力ディレクトリ
 * @param {string} outputDir - 出力ディレクトリ
 */
function encryptDirectory(inputDir, outputDir) {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const files = fs.readdirSync(inputDir);
    const results = [];

    for (const file of files) {
        if (file.toLowerCase().endsWith('.png')) {
            const inputPath = path.join(inputDir, file);
            const outputPath = path.join(outputDir, file.replace('.png', '.enc'));
            encryptFile(inputPath, outputPath);
            results.push({
                original: file,
                encrypted: path.basename(outputPath),
            });
        }
    }

    return results;
}

/**
 * 素材マニフェストを生成
 * @param {string} encryptedDir - 暗号化素材ディレクトリ
 * @param {string} packId - パックID
 * @returns {Object} マニフェスト
 */
function generateManifest(encryptedDir, packId) {
    const files = fs.readdirSync(encryptedDir)
        .filter(f => f.endsWith('.enc'));

    const manifest = {
        packId,
        version: '1.0.0',
        materials: files.map((file, index) => ({
            id: `${packId}-${String(index + 1).padStart(3, '0')}`,
            name: file.replace('.enc', ''),
            file: file,
            thumbnail: null, // サムネイルは別途生成
        })),
    };

    return manifest;
}

module.exports = {
    encryptFile,
    decryptFile,
    decryptToBase64,
    encryptDirectory,
    generateManifest,
    MASTER_KEY, // 暗号化ツール用にエクスポート
};
