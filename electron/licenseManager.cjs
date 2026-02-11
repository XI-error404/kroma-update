/**
 * ライセンス管理マネージャー (Kroma Pro版対応)
 * electron-store による永続化とキー認証
 */

const Store = require('electron-store');

// ストア設定
const store = new Store({
    name: 'kroma-license-data',
    encryptionKey: 'kroma-storage-encryption-key', // ストレージの暗号化
    defaults: {
        unlockedPacks: [],       // アンロック済みパックID
        saveCount: 0,            // 保存回数カウンター
        trialLimit: 10,          // 試用版の保存制限
        licenseTier: 'trial',    // 'trial', 'standard', 'pro'
        licenseKeys: [],         // 保存済みライセンスキー配列 (累積対応)
        isFullVersion: false,    // 後方互換性用
    },
});

// マスターキー定義
const MASTER_KEYS = {
    'KROMA-DEVELOPER-2026': 'pro'
};

/**
 * 保存済みの全キーから現在の最高ティアを計算
 */
function getCumulativeTier() {
    const keys = store.get('licenseKeys', []);
    if (keys.length === 0) return 'trial';

    let hasProKey = false;
    let standardKeyCount = 0;

    for (const key of keys) {
        const normalizedKey = key.trim().toUpperCase();

        // Pro判定
        if (MASTER_KEYS[normalizedKey] === 'pro' ||
            /^KROMA-PRO-/.test(normalizedKey) ||
            /^KR-PRO-/.test(normalizedKey) ||
            (normalizedKey.length === 15 && normalizedKey.startsWith('KR-') && normalizedKey.endsWith('-25') && normalizedKey.substring(3, 12).includes('7'))) {
            hasProKey = true;
        }
        // Standard判定
        else if (/^KROMA-STD-/.test(normalizedKey) || /^TRPG-PACK-/.test(normalizedKey) || /^KR-STD-/.test(normalizedKey)) {
            standardKeyCount++;
        }
    }

    if (hasProKey || standardKeyCount >= 3) return 'pro';
    if (standardKeyCount >= 1) return 'standard';
    return 'trial';
}

/**
 * Standardキーの累積数を取得
 */
function getStandardKeyCount() {
    const keys = store.get('licenseKeys', []);
    return keys.filter(k => {
        const uk = k.toUpperCase();
        return /^KROMA-STD-/.test(uk) || /^TRPG-PACK-/.test(uk) || /^KR-STD-/.test(uk);
    }).length;
}

/**
 * ライセンスキーを検証・追加
 * @param {string} key - 入力されたキー
 * @returns {{ valid: boolean, tier?: string, upgradeEligible?: boolean, name?: string, error?: string }}
 */
function validateLicenseKey(key) {
    if (!key || typeof key !== 'string') {
        return { valid: false, error: 'キーが入力されていません' };
    }

    const normalizedKey = key.trim().toUpperCase();
    const existingKeys = store.get('licenseKeys', []);

    if (existingKeys.includes(normalizedKey)) {
        // 既に存在してもエラーにせず、正常なレスポンスを返す (クライアント側で localStorage と同期するため)
        // ただし再追加はしない
        const stdCount = getStandardKeyCount();
        const finalTier = getCumulativeTier();
        return {
            valid: true,
            tier: finalTier,
            upgradeEligible: stdCount >= 3 && finalTier === 'standard',
            name: finalTier === 'pro' ? 'Pro Edition' : 'Standard Edition'
        };
    }

    // 検証ロジック (一時的な検証用)
    let isValid = false;
    let newKeyTier = 'trial';

    if (MASTER_KEYS[normalizedKey]) {
        isValid = true;
        newKeyTier = MASTER_KEYS[normalizedKey];
    } else if (normalizedKey.length === 15 && normalizedKey.startsWith('KR-') && normalizedKey.endsWith('-25') && normalizedKey.substring(3, 12).includes('7')) {
        isValid = true;
        newKeyTier = 'pro';
    } else if (/^KROMA-PRO-/.test(normalizedKey) || /^KR-PRO-/.test(normalizedKey)) {
        isValid = true;
        newKeyTier = 'pro';
    } else if (/^KROMA-STD-/.test(normalizedKey) || /^TRPG-PACK-/.test(normalizedKey) || /^KR-STD-/.test(normalizedKey)) {
        isValid = true;
        newKeyTier = 'standard';
    }

    if (isValid) {
        // キーを保存
        existingKeys.push(normalizedKey);
        store.set('licenseKeys', existingKeys);

        // 全体のティアを再計算・保存
        const finalTier = getCumulativeTier();
        store.set('licenseTier', finalTier);
        if (finalTier !== 'trial') {
            store.set('isFullVersion', true);
        }

        const stdCount = getStandardKeyCount();

        return {
            valid: true,
            tier: finalTier,
            upgradeEligible: stdCount >= 3 && finalTier === 'standard',
            name: finalTier === 'pro' ? 'Pro Edition' : 'Standard Edition'
        };
    }

    return { valid: false, error: '無効なキー、または形式が正しくありません' };
}

/**
 * 現在のティアを取得
 * @returns {string} 'trial', 'standard', 'pro'
 */
function getLicenseTier() {
    return store.get('licenseTier', 'trial');
}

/**
 * パックをアンロック (維持しつつ、Standard以上なら全解禁の補助)
 */
function unlockPack(packId) {
    const unlockedPacks = store.get('unlockedPacks', []);
    if (!unlockedPacks.includes(packId)) {
        unlockedPacks.push(packId);
        store.set('unlockedPacks', unlockedPacks);
    }
    return true;
}

/**
 * 試用版の保存回数をインクリメント
 */
function incrementSaveCount() {
    const tier = getLicenseTier();
    if (tier !== 'trial') {
        return { count: 0, remaining: Infinity, limitReached: false };
    }

    const count = store.get('saveCount', 0) + 1;
    const limit = store.get('trialLimit', 10);

    store.set('saveCount', count);

    return {
        count,
        remaining: Math.max(0, limit - count),
        limitReached: count >= limit,
    };
}

/**
 * 現在の試用版状態を取得
 */
function getTrialStatus() {
    const tier = getLicenseTier();
    const count = store.get('saveCount', 0);
    const limit = store.get('trialLimit', 10);
    const stdCount = getStandardKeyCount();

    return {
        count,
        remaining: tier !== 'trial' ? Infinity : Math.max(0, limit - count),
        limit,
        isFullVersion: tier !== 'trial',
        tier,
        upgradeEligible: stdCount >= 3 && tier === 'standard',
    };
}

module.exports = {
    validateLicenseKey,
    getLicenseTier,
    getTrialStatus,
    incrementSaveCount,
    unlockPack,
    isPackUnlocked: (packId) => {
        const tier = getLicenseTier();
        if (tier === 'pro' || tier === 'standard') return true;
        return store.get('unlockedPacks', []).includes(packId);
    },
    resetLicense: () => store.clear(),
};
