/**
 * Viteサーバーの起動を待ってからElectronを起動するスクリプト
 */

const { spawn } = require('child_process');
const http = require('http');

const VITE_URL = 'http://localhost:5173';
const MAX_RETRIES = 60;
const RETRY_INTERVAL = 1000;

function checkServer(url) {
    return new Promise((resolve) => {
        http.get(url, (res) => {
            resolve(res.statusCode === 200);
        }).on('error', () => {
            resolve(false);
        });
    });
}

async function waitForVite() {
    console.log('⏳ Waiting for Vite server...');

    for (let i = 0; i < MAX_RETRIES; i++) {
        const isReady = await checkServer(VITE_URL);
        if (isReady) {
            console.log('✅ Vite server is ready!');
            return true;
        }

        if (i % 5 === 0) {
            console.log(`   Retry ${i + 1}/${MAX_RETRIES}...`);
        }

        await new Promise(r => setTimeout(r, RETRY_INTERVAL));
    }

    console.error('❌ Vite server did not start in time');
    return false;
}

async function main() {
    const ready = await waitForVite();

    if (!ready) {
        process.exit(1);
    }

    console.log('🚀 Launching Electron...');

    const electron = spawn(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['electron', '.'],
        {
            stdio: 'inherit',
            shell: true,
            cwd: process.cwd()
        }
    );

    electron.on('close', (code) => {
        process.exit(code);
    });
}

main();
