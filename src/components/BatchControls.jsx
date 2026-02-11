import React from 'react';
import { Package, CheckSquare, Square, Download, X } from 'lucide-react';
import ProBadge from './ProBadge';

function BatchControls({
    isBatchMode,
    onToggleMode,
    selectedCount,
    onExport,
    onCancel,
    isPro
}) {
    if (!isBatchMode) {
        return (
            <button
                onClick={onToggleMode}
                className="w-full flex items-center justify-between gap-2 py-2 px-3 bg-[#1e1e1e] hover:bg-[#282828] text-gray-400 hover:text-white rounded-lg text-xs transition-colors group"
                style={{ backgroundColor: 'var(--bg-side)' }}
            >
                <div className="flex items-center gap-2">
                    <CheckSquare size={14} />
                    <span>一括編集モード</span>
                </div>
                {!isPro && <ProBadge />}
            </button>
        );
    }

    return (
        <div className="bg-[#fe7f2e]/5 border border-[#fe7f2e]/10 rounded-none p-3 space-y-3 fade-in" style={{ backgroundColor: 'rgba(254, 127, 46, 0.05)', borderColor: 'rgba(254, 127, 46, 0.1)' }}>
            <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-[#fe7f2e] uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--accent-orange)' }}>
                    <Package size={12} />
                    Batch Mode
                </h3>
                <button onClick={onCancel} className="text-gray-500 hover:text-white">
                    <X size={14} />
                </button>
            </div>

            <div className="text-[13px] text-white font-medium">
                {selectedCount} 個選択中
            </div>

            <button
                onClick={onExport}
                disabled={selectedCount === 0}
                className="w-full flex items-center justify-center gap-2 py-2 bg-[#fe7f2e] hover:bg-[#ff914d] text-white rounded-none text-[13px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-orange"
                style={{ backgroundColor: 'var(--accent-orange)' }}
            >
                <Download size={14} />
                一括エクスポート
            </button>

            <p className="text-[11px] text-[#fe7f2e]/60 text-center" style={{ color: 'rgba(254, 127, 46, 0.6)' }}>
                ※ 選択した全素材に現在の設定を適用
            </p>
        </div>
    );
}

export default BatchControls;
