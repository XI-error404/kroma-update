import React from 'react';
import { X, Info } from 'lucide-react';

function AboutModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 p-6">
            <div
                className="bg-[#1e1e1e] border border-white/5 w-full max-w-sm rounded-none shadow-2xl relative overflow-hidden flex flex-col items-center p-10 text-center"
                style={{ backgroundColor: '#1e1e1e', fontFamily: 'Montserrat, sans-serif' }}
            >
                {/* 閉じるボタン */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1"
                >
                    <X size={20} />
                </button>

                {/* ロゴ */}
                <div className="mb-6">
                    <img
                        src="/kroma.png"
                        alt="Kroma Logo"
                        className="w-16 h-auto object-contain"
                        style={{ width: '64px' }}
                    />
                </div>

                {/* テキスト内容 */}
                <h2 className="text-lg font-semibold text-white mb-2 tracking-tight">
                    Kroma Material Editor
                </h2>

                <div className="text-[11px] font-bold text-[#fe7f2e] uppercase tracking-widest mb-6 px-3 py-1 bg-[#fe7f2e]/10 border border-[#fe7f2e]/20 inline-block">
                    Version 1.0.0
                </div>

                <p className="text-sm text-[#e6e6e6] leading-relaxed max-w-[240px]">
                    Professional Material Processing Tool for Game Developers.
                </p>

                <div className="mt-10 pt-6 border-t border-white/5 w-full text-[9px] text-gray-600 uppercase tracking-widest font-medium">
                    © 2026 Kroma Development Team
                </div>
            </div>
        </div>
    );
}

export default AboutModal;
