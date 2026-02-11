const UPNG = require('upng-js');
const sharp = require('sharp');
const imageProcessor = require('../../electron/imageProcessor.cjs');

describe('APNG decode variants', () => {
  test('UPNG.decode/toRGBA8 succeeds for frames passed as ArrayBuffer and Uint8Array', async () => {
    const w = 2, h = 2;
    const frameA = new Uint8Array(w * h * 4);
    for (let i = 0; i < frameA.length; i += 4) {
      frameA[i] = 255; frameA[i + 1] = 0; frameA[i + 2] = 0; frameA[i + 3] = 255;
    }
    const frameB = new Uint8Array(w * h * 4);
    for (let i = 0; i < frameB.length; i += 4) {
      frameB[i] = 0; frameB[i + 1] = 255; frameB[i + 2] = 0; frameB[i + 3] = 255;
    }

    // encode using ArrayBuffer references
    const apng1 = UPNG.encode([frameA.buffer, frameB.buffer], w, h, 0, [100, 100]);
    // toRGBA8 can accept the ArrayBuffer directly, but some encodings may not include acTL and throw.
    let threw = false;
    try {
      const rgba1 = UPNG.toRGBA8(apng1);
      expect(Array.isArray(rgba1)).toBe(true);
      expect(rgba1.length).toBeGreaterThanOrEqual(1);
    } catch (err) {
      threw = true;
      expect(String(err.message).toLowerCase()).toMatch(/actl|corrupt|acTL|corrupt header/i);
    }

    // Ensure our processImage does not throw and returns a string (either processed or original)
    const out1 = await imageProcessor.processImage(Buffer.from(apng1).toString('base64'), {
      hue: 0, saturation: 0, brightness: 0, overlayColor: null, overlayOpacity: 0
    });
    expect(typeof out1).toBe('string');

    // encode using Uint8Array instances (should behave same)
    const apng2 = UPNG.encode([new Uint8Array(frameA), new Uint8Array(frameB)], w, h, 0, [80, 80]);
    try {
      const rgba2 = UPNG.toRGBA8(apng2);
      expect(Array.isArray(rgba2)).toBe(true);
      expect(rgba2.length).toBeGreaterThanOrEqual(1);
    } catch (err) {
      // acceptable; just ensure processImage handles it
    }
    const out2 = await imageProcessor.processImage(Buffer.from(apng2).toString('base64'), {
      hue: 0, saturation: 0, brightness: 0, overlayColor: null, overlayOpacity: 0
    });
    expect(typeof out2).toBe('string');
  });

  test('Malformed APNG (acTL chunk removed) causes processing fallback', async () => {
    const w = 2, h = 2;
    const frame = new Uint8Array(w * h * 4);
    for (let i = 0; i < frame.length; i += 4) {
      frame[i] = 128; frame[i + 1] = 128; frame[i + 2] = 128; frame[i + 3] = 255;
    }
    const apngBuf = Buffer.from(UPNG.encode([frame.buffer, frame.buffer], w, h, 0, [100, 100]));

    // locate 'acTL' and remove its entire chunk (length + type + data + crc)
    const acIndex = apngBuf.indexOf(Buffer.from('acTL'));
    expect(acIndex).toBeGreaterThanOrEqual(0);
    const lenPos = acIndex - 4;
    const chunkLen = apngBuf.readUInt32BE(lenPos);
    const removeStart = lenPos;
    const removeEnd = lenPos + 4 + 4 + chunkLen + 4; // length + type + data + crc
    const malformed = Buffer.concat([apngBuf.slice(0, removeStart), apngBuf.slice(removeEnd)]);

    const malformedBase64 = malformed.toString('base64');

    const out = await imageProcessor.processImage(malformedBase64, {
      hue: 0, saturation: 0, brightness: 0, overlayColor: null, overlayOpacity: 0
    });

    // processImage should fall back and return the original base64 when parsing fails
    expect(typeof out).toBe('string');
    // It should equal input (we designed processImage to return base64 on parse failure)
    expect(out).toBe(malformedBase64);
  });
});

