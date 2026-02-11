/**
 * テスト用透過PNG画像を生成するスクリプト
 * 実行: node scripts/generate-test-image.cjs
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateTestImage() {
    const outputDir = path.join(__dirname, '..', 'public');
    const outputPath = path.join(outputDir, 'test-image.png');

    // publicディレクトリがなければ作成
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 256x256の透過PNG画像を作成
    const size = 256;
    const channels = 4; // RGBA
    const pixels = Buffer.alloc(size * size * channels);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * channels;

            // 円形のグラデーション（中心からの距離で色を変える）
            const cx = size / 2;
            const cy = size / 2;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = size / 2;

            if (dist < maxDist) {
                // 円の内側：グラデーションカラー
                const t = dist / maxDist;
                const angle = Math.atan2(dy, dx);

                // HSVをRGBに変換（色相を角度で、彩度と明度を距離で）
                const hue = ((angle + Math.PI) / (2 * Math.PI)) * 360;
                const sat = 0.8;
                const val = 1 - t * 0.3;

                const { r, g, b } = hsvToRgb(hue, sat, val);

                pixels[idx] = r;     // R
                pixels[idx + 1] = g; // G  
                pixels[idx + 2] = b; // B
                pixels[idx + 3] = Math.floor(255 * (1 - t * 0.5)); // A（外側が半透明）
            } else {
                // 円の外側：完全透明
                pixels[idx] = 0;
                pixels[idx + 1] = 0;
                pixels[idx + 2] = 0;
                pixels[idx + 3] = 0;
            }
        }
    }

    // sharpで画像を生成
    await sharp(pixels, {
        raw: {
            width: size,
            height: size,
            channels: channels,
        },
    })
        .png()
        .toFile(outputPath);

    console.log('✅ テスト画像を生成しました:', outputPath);
    console.log('   - サイズ: 256x256');
    console.log('   - 形式: 透過PNG（円形グラデーション）');
}

// HSVからRGBへの変換
function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;

    let r, g, b;

    if (h < 60) {
        r = c; g = x; b = 0;
    } else if (h < 120) {
        r = x; g = c; b = 0;
    } else if (h < 180) {
        r = 0; g = c; b = x;
    } else if (h < 240) {
        r = 0; g = x; b = c;
    } else if (h < 300) {
        r = x; g = 0; b = c;
    } else {
        r = c; g = 0; b = x;
    }

    return {
        r: Math.floor((r + m) * 255),
        g: Math.floor((g + m) * 255),
        b: Math.floor((b + m) * 255),
    };
}

generateTestImage().catch(console.error);
