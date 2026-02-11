const sharp = require('sharp');
const UPNG = require('upng-js');
const fs = require('fs');

// APNG判定用: PNGシグネチャと acTL チャンクの有無で判断
function isApng(buffer) {
    // PNGシグネチャ (8 bytes)
    const pngSig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    if (buffer.length < 8 || !buffer.slice(0, 8).equals(pngSig)) return false;
    // 簡易的に "acTL" チャンクを検索
    return buffer.includes(Buffer.from('acTL'));
}

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
 * @returns {Promise<string>} 処理後のBase64エンコード画像 (APNGの場合はAPNGのまま)
 */
async function processImage(base64, { hue = 0, saturation = 0, brightness = 0, overlayColor = null, overlayOpacity = 0 }) {
    // Base64からBufferに変換
    const inputBuffer = Buffer.from(base64, 'base64');

    // APNGの場合はUPNG.jsを用いて全フレームをピクセル単位で編集
    if (isApng(inputBuffer)) {
        try {
            // UPNG expects an ArrayBuffer; convert Node Buffer to precise ArrayBuffer slice
            const arrBuf = inputBuffer.buffer.slice(inputBuffer.byteOffset, inputBuffer.byteOffset + inputBuffer.byteLength);
            const png = UPNG.decode(arrBuf);
            const { width, height } = png;
            const delays = png.frames.map(f => f.delay || 0);

            // RGBAフレーム配列を取得
            let rgbaFrames;
            try {
                rgbaFrames = UPNG.toRGBA8(png); // Array<Uint8Array>
            } catch (err) {
                // Fallback: try passing the raw ArrayBuffer if decode-shaped object isn't suitable
                rgbaFrames = UPNG.toRGBA8(arrBuf);
            }

            const satScale = 1.0 + (saturation / 100);
            const briScale = 1.0 + (brightness / 100);
            const { r: overlayR, g: overlayG, b: overlayB } = hexToRgb(overlayColor || '#ffffff');
            const overlayAlpha = (overlayOpacity || 0) / 100; // 0-1

            // Process frames in small asynchronous chunks to avoid blocking the event loop
            const processedFrames = [];
            const chunkSize = 4; // frames per micro-yield; tune as needed
            for (let fi = 0; fi < rgbaFrames.length; fi += chunkSize) {
                const end = Math.min(fi + chunkSize, rgbaFrames.length);
                for (let j = fi; j < end; j++) {
                    const src = rgbaFrames[j];
                    const out = new Uint8Array(src.length);
                    for (let i = 0; i < src.length; i += 4) {
                        let r = src[i] / 255;
                        let g = src[i + 1] / 255;
                        let b = src[i + 2] / 255;
                        const a = src[i + 3]; // 0-255

                        // --- RGB -> HSV ---
                        const max = Math.max(r, g, b);
                        const min = Math.min(r, g, b);
                        const v0 = max;
                        const d = max - min;
                        let h = 0;
                        let s = max === 0 ? 0 : d / (max || 1);

                        if (d !== 0) {
                            if (max === r) {
                                h = (g - b) / d + (g < b ? 6 : 0);
                            } else if (max === g) {
                                h = (b - r) / d + 2;
                            } else {
                                h = (r - g) / d + 4;
                            }
                            h *= 60; // 0-360度
                        }

                        // --- Hue / Saturation / Brightness 調整 ---
                        h = (h + hue + 360) % 360;
                        s = Math.max(0, Math.min(1, s * satScale));
                        let v = Math.max(0, Math.min(1, v0 * briScale));

                        // --- HSV -> RGB ---
                        const c = v * s;
                        const hh = h / 60;
                        const x = c * (1 - Math.abs((hh % 2) - 1));
                        let rr = 0, gg = 0, bb = 0;
                        if (hh >= 0 && hh < 1) {
                            rr = c; gg = x; bb = 0;
                        } else if (hh < 2) {
                            rr = x; gg = c; bb = 0;
                        } else if (hh < 3) {
                            rr = 0; gg = c; bb = x;
                        } else if (hh < 4) {
                            rr = 0; gg = x; bb = c;
                        } else if (hh < 5) {
                            rr = x; gg = 0; bb = c;
                        } else {
                            rr = c; gg = 0; bb = x;
                        }
                        const m = v - c;
                        rr += m; gg += m; bb += m;

                        let outR = Math.round(rr * 255);
                        let outG = Math.round(gg * 255);
                        let outB = Math.round(bb * 255);

                        // --- カラーオーバーレイ (source-atop 相当: 透過していないピクセルのみ) ---
                        if (overlayAlpha > 0 && a > 0) {
                            const or = overlayR;
                            const og = overlayG;
                            const ob = overlayB;
                            outR = Math.round(outR * (1 - overlayAlpha) + or * overlayAlpha);
                            outG = Math.round(outG * (1 - overlayAlpha) + og * overlayAlpha);
                            outB = Math.round(outB * (1 - overlayAlpha) + ob * overlayAlpha);
                        }

                        out[i] = outR;
                        out[i + 1] = outG;
                        out[i + 2] = outB;
                        out[i + 3] = a;
                    }
                    processedFrames.push(out);
                }
                // yield to event loop between chunks to keep process responsive
                await new Promise(resolve => setImmediate(resolve));
            }

            // APNGとして再エンコード (ループ回数は元ファイルに依存)
            const apngBuffer = UPNG.encode(processedFrames, width, height, 0, delays);
            return Buffer.from(apngBuffer).toString('base64');
        } catch (e) {
            // If APNG parsing fails for any reason, avoid crashing: return original data unchanged
            console.warn('APNG parsing failed with UPNG; attempting apng-js + canvas fallback. Error:', e && e.message);
            try {
                // attempt apng-js + node-canvas fallback
                const apng = require('apng-js');
                const { createCanvas, Image } = require('canvas');
                // expose Image globally so apng-js can create imageElements
                const prevImage = global.Image;
                global.Image = Image;

                const parsed = apng.default(arrBuf);
                const frames = parsed.frames || [];
                const fallbackFrames = [];
                const fw = parsed.width || width;
                const fh = parsed.height || height;

                for (const f of frames) {
                    // if imageData exists and has .data, use it
                    if (f.imageData && f.imageData.data && f.imageData.data.length) {
                        const data = f.imageData.data;
                        // ensure Uint8Array
                        fallbackFrames.push(new Uint8Array(data.buffer || data));
                        continue;
                    }

                    // try drawing imageElement into canvas
                    if (f.imageElement) {
                        const canvas = createCanvas(f.width || fw, f.height || fh);
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(f.imageElement, f.left || 0, f.top || 0, f.width || fw, f.height || fh);
                        const id = ctx.getImageData(0, 0, f.width || fw, f.height || fh);
                        fallbackFrames.push(new Uint8Array(id.data.buffer));
                        continue;
                    }

                    // last resort: skip frame
                }

                // restore global.Image
                global.Image = prevImage;

                if (fallbackFrames.length > 0) {
                    // process fallbackFrames similar to processedFrames earlier
                    const satScale = 1.0 + (saturation / 100);
                    const briScale = 1.0 + (brightness / 100);
                    const { r: overlayR, g: overlayG, b: overlayB } = hexToRgb(overlayColor || '#ffffff');
                    const overlayAlpha = (overlayOpacity || 0) / 100;

                    const processedFramesFallback = [];
                    for (const src of fallbackFrames) {
                        const out = new Uint8Array(src.length);
                        for (let i = 0; i < src.length; i += 4) {
                            let r = src[i] / 255;
                            let g = src[i + 1] / 255;
                            let b = src[i + 2] / 255;
                            const a = src[i + 3];
                            const max = Math.max(r, g, b);
                            const min = Math.min(r, g, b);
                            const v0 = max;
                            const d = max - min;
                            let h = 0;
                            let s = max === 0 ? 0 : d / (max || 1);
                            if (d !== 0) {
                                if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
                                else if (max === g) h = (b - r) / d + 2;
                                else h = (r - g) / d + 4;
                                h *= 60;
                            }
                            h = (h + hue + 360) % 360;
                            s = Math.max(0, Math.min(1, s * satScale));
                            let v = Math.max(0, Math.min(1, v0 * briScale));
                            const c = v * s;
                            const hh = h / 60;
                            const x = c * (1 - Math.abs((hh % 2) - 1));
                            let rr = 0, gg = 0, bb = 0;
                            if (hh >= 0 && hh < 1) { rr = c; gg = x; bb = 0; }
                            else if (hh < 2) { rr = x; gg = c; bb = 0; }
                            else if (hh < 3) { rr = 0; gg = c; bb = x; }
                            else if (hh < 4) { rr = 0; gg = x; bb = c; }
                            else if (hh < 5) { rr = x; gg = 0; bb = c; }
                            else { rr = c; gg = 0; bb = x; }
                            const m = v - c;
                            rr += m; gg += m; bb += m;
                            let outR = Math.round(rr * 255);
                            let outG = Math.round(gg * 255);
                            let outB = Math.round(bb * 255);
                            if (overlayAlpha > 0 && a > 0) {
                                outR = Math.round(outR * (1 - overlayAlpha) + overlayR * overlayAlpha);
                                outG = Math.round(outG * (1 - overlayAlpha) + overlayG * overlayAlpha);
                                outB = Math.round(outB * (1 - overlayAlpha) + overlayB * overlayAlpha);
                            }
                            out[i] = outR; out[i + 1] = outG; out[i + 2] = outB; out[i + 3] = a;
                        }
                        processedFramesFallback.push(out);
                    }
                    const apngBuf2 = UPNG.encode(processedFramesFallback, fw, fh, 0, delays);
                    return Buffer.from(apngBuf2).toString('base64');
                }
            } catch (fallbackErr) {
                console.warn('apng-js + canvas fallback failed:', fallbackErr && fallbackErr.message);
            }
            // final fallback: return original base64 to avoid crash
            return base64;
        }
    }

    // 1. まず HSV 調整を適用したバッファを作成
    try {
        const sat = 1.0 + (saturation / 100);
        const bri = 1.0 + (brightness / 100);

        const hsvBuffer = await sharp(inputBuffer)
            .modulate({
                hue: hue,
                saturation: Math.max(0, sat),
                brightness: Math.max(0, bri),
            })
            .png()
            .toBuffer();

        let image = sharp(hsvBuffer);

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
            })
            .toBuffer();

        return processedBuffer.toString('base64');
    } catch (err) {
        console.warn('Static PNG processing failed, returning original base64. Error:', err && err.message);
        return base64;
    }
}

/**
 * 画像をファイルに保存
 * @param {string} base64 - Base64エンコードされた画像データ
 * @param {string} filePath - 保存先のファイルパス
 */
async function saveImage(base64, filePath) {
    const buffer = Buffer.from(base64, 'base64');

    // APNGはフレーム情報を保持したままそのまま書き出す（sharpを通すと静止画化されるため）
    if (isApng(buffer)) {
        await fs.promises.writeFile(filePath, buffer);
        return;
    }

    // 通常PNGは sharp を使って元の解像度を維持したまま保存
    await sharp(buffer)
        .png({
            compressionLevel: 6,
            adaptiveFiltering: true,
            palette: false,
        })
        .toFile(filePath);
}

module.exports = {
    processImage,
    saveImage,
};
