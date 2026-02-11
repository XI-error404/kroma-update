import React, { useState } from 'react';
import { X, Key, Check, AlertCircle } from 'lucide-react';

function LicenseModal({ isOpen, onClose, onSuccess }) {
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(null);

    // 認証済みキーのリスト
    const [savedKeys, setSavedKeys] = useState(() => {
        return JSON.parse(localStorage.getItem('kroma_keys') || '[]');
    });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!key) return;

        setLoading(true);
        setError('');
        setSuccess(null);

        try {
            // サーバー検証を実行
            const result = await window.electronAPI.validateLicense(key);

            if (result.valid) {
                const normalized = key.toUpperCase();

                // localStorage から最新状態を取得して重複チェック (Source of Truth)
                const currentKeys = JSON.parse(localStorage.getItem('kroma_keys') || '[]');

                if (currentKeys.includes(normalized)) {
                    setError('このキーは既に登録されています');
                    setLoading(false);
                    return;
                }

                const updated = [...currentKeys, normalized];
                localStorage.setItem('kroma_keys', JSON.stringify(updated));
                setSavedKeys(updated);

                // プラン名の決定 (Standard x3 -> Pro のロジックは App.jsx 側だが、ここでは単体の名前を表示)
                // ユーザー要望による厳格化: KR-STD- キー入力時は 1, 2, 3本目に関わらず "Standard Edition" と表示
                // KR-PRO- キーのみ "Pro Edition" と表示。
                let unlockName;
                const normalizedKey = key.toUpperCase();

                if (normalizedKey.startsWith('KR-PRO-')) {
                    unlockName = 'Pro Edition';
                } else if (normalizedKey.startsWith('KR-STD-')) {
                    // 要件: Standard Edition が有効になりました (常に)
                    unlockName = 'Standard Edition';
                } else {
                    // フォールバック
                    if (result.tier === 'pro') {
                        unlockName = 'Pro Edition';
                    } else if (result.tier === 'standard') {
                        unlockName = 'Standard Edition';
                    } else {
                        unlockName = result.name || 'Unknown Edition';
                    }
                }

                setSuccess(`${unlockName} が有効になりました`);
                setKey('');

                // 親コンポーネントへ通知 (App.jsx で即座にプラン変更が走る)
                onSuccess?.(result);
            } else {
                setError(result.error || '無効なキーです');
            }
        } catch (err) {
            console.error(err);
            setError('認証中にエラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveKey = (keyToRemove) => {
        // 最新を取得してから削除
        const currentKeys = JSON.parse(localStorage.getItem('kroma_keys') || '[]');
        const updated = currentKeys.filter(k => k !== keyToRemove);

        localStorage.setItem('kroma_keys', JSON.stringify(updated));
        setSavedKeys(updated);

        // 親コンポーネントへ通知 (App.jsx で即座にプラン変更が走る)
        onSuccess?.();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#1e1e1e] border border-white/5 rounded-none max-w-md w-full shadow-2xl overflow-hidden p-8 relative" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="absolute top-4 right-4">
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col items-center text-center mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <h1 className="text-3xl font-semibold bg-kroma-gradient bg-clip-text text-transparent tracking-tighter">
                            Kroma
                        </h1>
                    </div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest leading-none">ライセンス認証</h2>
                </div>

                {/* 認証済みキーリスト */}
                {savedKeys.length > 0 && (
                    <div className="mb-6 space-y-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">認証済みキー</label>
                        <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                            {savedKeys.map(k => (
                                <div key={k} className="flex items-center justify-between bg-black/40 p-2 border border-white/5 group">
                                    <span className="text-[11px] font-mono text-gray-300 tracking-wider truncate">{k}</span>
                                    <button
                                        onClick={() => handleRemoveKey(k)}
                                        className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        title="ライセンス解除"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={key}
                                onChange={(e) => setKey(e.target.value.toUpperCase())}
                                placeholder="ライセンスキーを入力 (KR-STD-...)"
                                className="flex-1 px-4 py-3 bg-[#141414] border border-[#282828] rounded-none text-white placeholder-gray-600 focus:outline-none focus:border-[#fe7f2e]/50 font-mono text-center text-xs tracking-wider uppercase transition-all"
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={!key || loading}
                                className="px-6 bg-[#75509f] hover:bg-[#865eb3] text-white font-bold transition-all disabled:opacity-30 rounded-none shadow-glow active:scale-95 whitespace-nowrap text-xs"
                            >
                                {loading ? '...' : '有効化'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-[11px] mb-4 p-3 bg-red-400/5 border border-red-400/10">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center gap-2 text-green-400 text-[11px] mb-4 p-3 bg-green-400/5 border border-green-400/10">
                            <Check size={14} />
                            {success}
                        </div>
                    )}
                </form>

                <div className="mt-8 p-4 bg-black/20 border-t border-white/5 text-center">
                    <p className="text-[14px] text-[#FFFFFF] font-normal leading-relaxed">
                        ライセンスキーを３枚累積すると Pro版のアップグレード権利を取得します。
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LicenseModal;
