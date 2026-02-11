const UPNG = require('upng-js');
const imageProcessor = require('../../electron/imageProcessor.cjs');

// Generate an RGBA frame filled with given color and alpha
function makeFrame(width, height, r, g, b, a = 255) {
  const frame = new Uint8Array(width * height * 4);
  for (let i = 0; i < frame.length; i += 4) {
    frame[i] = r;
    frame[i + 1] = g;
    frame[i + 2] = b;
    frame[i + 3] = a;
  }
  return frame;
}

describe('APNG sample variants processing (regression set)', () => {
  jest.setTimeout(30000);

  test('many-frames small-size APNG (50 frames x 32x32)', async () => {
    const w = 32, h = 32;
    const frames = [];
    const delays = [];
    for (let i = 0; i < 50; i++) {
      const r = (i * 5) % 256;
      const g = (i * 11) % 256;
      const b = (i * 17) % 256;
      frames.push(makeFrame(w, h, r, g, b, 255).buffer);
      delays.push(40 + (i % 3) * 10);
    }
    const apngAB = UPNG.encode(frames, w, h, 0, delays);
    const base64 = Buffer.from(apngAB).toString('base64');

    const out = await imageProcessor.processImage(base64, {
      hue: 10, saturation: 5, brightness: 2, overlayColor: '#112233', overlayOpacity: 20
    });
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  test('transparency and alternating alpha frames', async () => {
    const w = 48, h = 24;
    const frames = [];
    const delays = [];
    for (let i = 0; i < 20; i++) {
      const alpha = i % 2 === 0 ? 128 : 255;
      frames.push(makeFrame(w, h, 200, 50, 100, alpha).buffer);
      delays.push(80);
    }
    const apngAB = UPNG.encode(frames, w, h, 0, delays);
    const base64 = Buffer.from(apngAB).toString('base64');

    const out = await imageProcessor.processImage(base64, {
      hue: -30, saturation: 10, brightness: 0, overlayColor: '#00ff00', overlayOpacity: 35
    });
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  test('large single-frame APNG-like (256x256 repeated frames) to stress memory', async () => {
    const w = 256, h = 256;
    const frames = [];
    const delays = [];
    for (let i = 0; i < 6; i++) {
      frames.push(makeFrame(w, h, 120 + i * 10, 80 + i * 5, 60 + i * 3, 255).buffer);
      delays.push(100);
    }
    const apngAB = UPNG.encode(frames, w, h, 0, delays);
    const base64 = Buffer.from(apngAB).toString('base64');

    const out = await imageProcessor.processImage(base64, {
      hue: 15, saturation: 0, brightness: 0, overlayColor: '#ffffff', overlayOpacity: 10
    });
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });
});

