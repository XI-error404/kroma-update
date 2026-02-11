const sharp = require('sharp');

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

/**
 * HSV色変換処理
 * @param {string} base64 - Base64エンコードされた画像データ
 * @param {Object} options - HSV調整オプション
 * @param {number} options.hue - 色相調整値 (-180 ~ 180)
 * @param {number} options.saturation - 彩度調整値 (-100 ~ 100、0が元の値)
 * @param {number} options.brightness - 明度調整値 (-100 ~ 100、0が元の値)
 * @returns {Promise<string>} 処理後のBase64エンコード画像
 */
async function processImage(base64, { hue = 0, saturation = 0, brightness = 0, overlayColor = null, overlayOpacity = 0 }) {
    // Base64からBufferに変換
    const inputBuffer = Buffer.from(base64, 'base64');

    // 1. まず HSV 調整を適用したバッファを作成
    const sat = 1.0 + (saturation / 100);
    const bri = 1.0 + (brightness / 100);

    const hsvBuffer = await sharp(inputBuffer, { animated: true })
        .modulate({
            hue: hue,
            saturation: Math.max(0, sat),
            brightness: Math.max(0, bri),
        })
        .png({
            loop: 0 // APNG 無限ループ設定
        })
        .toBuffer();

    let image = sharp(hsvBuffer, { animated: true });

    // 2. カラーオーバーレイ (Pro機能) を適用
    if (overlayColor && overlayOpacity > 0) {
        const metadata = await sharp(hsvBuffer).metadata();
        const { r, g, b } = hexToRgb(overlayColor);
        const alpha = overlayOpacity / 100; // overlayOpacity is 0-100, Sharp needs 0-1

        const rgbaOverlay = await sharp({
            create: {
                width: metadata.width,
                height: metadata.height,
                channels: 4,
                background: { r, g, b, alpha: alpha }
            }
        })
            .png()
            .toBuffer();

        // 塗りつぶしのブレンド処理 (透過部分を保護する source-atop を選択)
        image = image.composite([{
            input: rgbaOverlay,
            blend: 'atop' // HSV適用後の画像のうち、透過していない部分にのみ重ねる
        }]);
    }

    const processedBuffer = await image
        .png({
            compressionLevel: 6,
            adaptiveFiltering: true,
            palette: false,
            loop: 0 // APNG 無限ループ設定
        })
        .toBuffer();

    return processedBuffer.toString('base64');
}

/**
 * 画像をファイルに保存
 * @param {string} base64 - Base64エンコードされた画像データ
 * @param {string} filePath - 保存先のファイルパス
 */
async function saveImage(base64, filePath) {
    const buffer = Buffer.from(base64, 'base64');

    // sharpを使って元の解像度を維持したまま保存
    await sharp(buffer, { animated: true })
        .png({
            compressionLevel: 6,
            adaptiveFiltering: true,
            palette: false,
            loop: 0 // APNG 無限ループ設定
        })
        .toFile(filePath);
}

module.exports = {
    processImage,
    saveImage,
};
