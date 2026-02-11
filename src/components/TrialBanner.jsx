import React from 'react';
import { AlertTriangle, Key } from 'lucide-react';

function TrialBanner({ trialStatus, onOpenLicense }) {
    if (!trialStatus || trialStatus.isFullVersion) {
        return null;
    }

    const { remaining, limit, count } = trialStatus;
    const isLow = remaining <= 3;
    const isExhausted = remaining <= 0;

    if (isExhausted) {
        return (
            <div className="bg-red-500/20 border border-red-500/50 rounded-none p-3 m-4">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                    <AlertTriangle size={16} />
                    <span className="font-medium text-sm">保存回数制限に達しました</span>
                </div>
                <p className="text-xs text-red-300/80 mb-3">
                    試用版では {limit} 回まで保存できます。
                    引き続きご利用いただくには、ライセンスキーを入力してください。
                </p>
                <button
                    onClick={onOpenLicense}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-red-500 hover:bg-red-400 text-white rounded-none text-sm font-medium transition-colors"
                >
                    <Key size={14} />
                    ライセンスを入力
                </button>
            </div>
        );
    }

    return (
        <div className={`
      rounded-none p-3 m-4
      ${isLow
                ? 'bg-yellow-500/20 border border-yellow-500/50'
                : 'bg-[#1e1e1e] border border-[#282828]'
            }
            style={!isLow ? { backgroundColor: 'var(--bg-side)', borderColor: 'var(--bg-card)' } : {}}
    `}>
            <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isLow ? 'text-yellow-400' : 'text-gray-400'}`}>
                    試用版
                </span>
                <span className={`text-xs ${isLow ? 'text-yellow-400' : 'text-gray-500'}`}>
                    残り {remaining} / {limit} 回
                </span>
            </div>

            {/* プログレスバー */}
            <div className="h-1.5 bg-[#141414] rounded-none overflow-hidden" style={{ backgroundColor: 'var(--bg-main)' }}>
                <div
                    className={`h-full transition-all ${isLow ? 'bg-yellow-500' : 'bg-accent'}`}
                    style={{ width: `${(remaining / limit) * 100}%` }}
                />
            </div>

            {isLow && (
                <button
                    onClick={onOpenLicense}
                    className="w-full mt-2 flex items-center justify-center gap-1 py-1.5 text-yellow-400 hover:text-yellow-300 text-xs transition-colors"
                >
                    <Key size={12} />
                    ライセンスを入力してアンロック
                </button>
            )}
        </div>
    );
}

export default TrialBanner;
