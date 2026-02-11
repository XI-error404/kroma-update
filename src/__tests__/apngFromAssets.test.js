const fs = require('fs');
const path = require('path');
const imageProcessor = require('../../electron/imageProcessor.cjs');

describe('APNG samples from test-assets/apng', () => {
  jest.setTimeout(60000);

  const assetsDir = path.join(__dirname, '../../test-assets/apng');

  test('process all APNG files placed in test-assets/apng (if any)', async () => {
    if (!fs.existsSync(assetsDir)) {
      // No samples provided; skip silently but pass.
      console.warn('No APNG samples found in test-assets/apng — drop .png/.apng files there to run this test.');
      return;
    }

    const files = fs.readdirSync(assetsDir).filter(f => /\.(png|apng)$/i.test(f));
    if (files.length === 0) {
      console.warn('No APNG files in test-assets/apng folder.');
      return;
    }

    for (const file of files) {
      const fp = path.join(assetsDir, file);
      const buf = fs.readFileSync(fp);
      const base64 = buf.toString('base64');
      const out = await imageProcessor.processImage(base64, {
        hue: 0, saturation: 0, brightness: 0, overlayColor: null, overlayOpacity: 0
      });
      expect(typeof out).toBe('string');
      expect(out.length).toBeGreaterThan(0);
    }
  });
});

