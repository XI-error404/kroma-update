import React from 'react';
import { Award, ExternalLink, X, Zap } from 'lucide-react';

function UpgradeModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
            <div className="bg-[#1e1e1e] border border-[#fe7f2e]/60 max-w-lg w-full p-8 shadow-[0_0_50px_rgba(254,127,46,0.2)] relative overflow-hidden rounded-none">
                {/* 装飾 */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#fe7f2e]/10 rounded-full blur-3xl" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-[#fe7f2e]/20 flex items-center justify-center rounded-none mb-6 border border-[#fe7f2e]/40">
                        <Award size={32} className="text-[#fe7f2e]" />
                    </div>

                    <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Pro Upgrade Eligible!</h2>
                    <p className="text-[#fe7f2e] font-bold text-sm mb-6 uppercase tracking-widest">Standardキーが3つ揃いました！</p>

                    <div className="space-y-4 text-[13px] text-gray-300 leading-relaxed mb-8 text-left bg-black/40 p-6 border border-white/5">
                        <p>Standardキーを3つ以上登録されたユーザー様は、無料で **Pro Edition** へアップグレードが可能です。</p>
                        <div className="pt-2 border-t border-white/10">
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">優待アップグレード用シークレットページ</p>
                            <button
                                onClick={() => window.electronAPI.openUrl('https://booth.pm/ja/items/secret-upgrade-page')}
                                className="text-[#fe7f2e] hover:underline flex items-center gap-2 font-mono text-left bg-transparent border-none p-0"
                            >
                                https://booth.pm/ja/items/secret-upgrade-page
                                <ExternalLink size={12} />
                            </button>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">ページ閲覧用合言葉</p>
                            <div className="bg-[#1e1e1e] px-3 py-2 border border-white/5 text-white font-mono text-center tracking-[0.2em]">
                                KROMA-PRO-UPGRADE-2026
                            </div>
                        </div>
                    </div>

                    <div className="w-full flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-[#282828] hover:bg-[#333] text-gray-300 font-bold transition-all uppercase tracking-widest text-xs border border-white/5"
                        >
                            閉じる
                        </button>
                        <button
                            onClick={() => window.electronAPI.openUrl('https://booth.pm/ja/items/secret-upgrade-page')}
                            className="flex-1 py-4 bg-kroma-gradient text-white font-black shadow-glow hover:scale-[1.02] transition-transform active:scale-95 uppercase tracking-widest text-xs"
                        >
                            BOOTHを開く
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UpgradeModal;
