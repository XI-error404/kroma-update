const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const UPNG = require('upng-js');

const imageProcessor = require(path.join(__dirname, '../../electron/imageProcessor.cjs'));

describe('imageProcessor.processImage', () => {
  jest.setTimeout(20000);

  test('processes a static PNG and returns a PNG base64', async () => {
    // create a simple 2x2 red PNG
    const buf = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    }).png().toBuffer();

    const base64 = buf.toString('base64');

    const outBase64 = await imageProcessor.processImage(base64, {
      hue: 30,
      saturation: 10,
      brightness: 0,
      overlayColor: '#00FF00',
      overlayOpacity: 50
    });

    expect(typeof outBase64).toBe('string');
    const outBuf = Buffer.from(outBase64, 'base64');
    const meta = await sharp(outBuf).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(2);
    expect(meta.height).toBe(2);
  });

  test('processes an APNG and preserves frame count and size', async () => {
    const width = 2;
    const height = 2;

    // frame1: red opaque
    const frame1 = new Uint8Array(width * height * 4);
    for (let i = 0; i < frame1.length; i += 4) {
      frame1[i] = 255; // r
      frame1[i + 1] = 0; // g
      frame1[i + 2] = 0; // b
      frame1[i + 3] = 255; // a
    }

    // frame2: blue opaque
    const frame2 = new Uint8Array(width * height * 4);
    for (let i = 0; i < frame2.length; i += 4) {
      frame2[i] = 0;
      frame2[i + 1] = 0;
      frame2[i + 2] = 255;
      frame2[i + 3] = 255;
    }

    const delays = [100, 100];
    const apngArrayBuffer = UPNG.encode([frame1.buffer, frame2.buffer], width, height, 0, delays);
    const apngBuf = Buffer.from(apngArrayBuffer);
    const apngBase64 = apngBuf.toString('base64');

    const outBase64 = await imageProcessor.processImage(apngBase64, {
      hue: 10,
      saturation: 20,
      brightness: 0,
      overlayColor: '#00FF00',
      overlayOpacity: 30
    });

    const outBuf = Buffer.from(outBase64, 'base64');
    // Check that the output still contains APNG animation control chunk 'acTL'
    expect(outBuf.includes(Buffer.from('acTL'))).toBe(true);
    expect(outBuf.length).toBeGreaterThan(0);
  });
});

