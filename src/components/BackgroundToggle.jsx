import React from 'react';
import { Grid, Square } from 'lucide-react';

function BackgroundToggle({ currentMode, onChange }) {
    const modes = [
        {
            id: 'checkerboard',
            label: '格子',
            icon: Grid,
            bgClass: 'checkerboard',
        },
        {
            id: 'white',
            label: '白',
            icon: Square,
            bgClass: 'bg-white',
        },
        {
            id: 'black',
            label: '黒',
            icon: Square,
            bgClass: 'bg-black border border-gray-600',
        },
    ];

    return (
        <div className="flex gap-2"> {/* ボタン間の隙間を微調整 */}
            {modes.map((mode) => {
                const Icon = mode.icon;
                const isActive = currentMode === mode.id;

                return (
                    <button
                        key={mode.id}
                        onClick={() => onChange(mode.id)}
                        className={`
                            flex items-center justify-center gap-2 py-1 px-2 rounded-none
                            text-[14px] font-bold transition-all uppercase tracking-tighter
                            ${isActive
                                ? 'bg-[#75509f] text-white ring-1 ring-[#75509f] ring-offset-1 ring-offset-[#1e1e1e]'
                                : 'bg-[#1e1e1e] text-gray-500 hover:bg-[#282828] hover:text-gray-300 border border-white/5'
                            }
                        `}
                        style={isActive ? { backgroundColor: 'var(--accent-purple)', '--tw-ring-color': 'var(--accent-purple)' } : {}}
                    >
                        {/* プレビューボックスのサイズを少し小さくしてスッキリさせる */}
                        <div className={`w-3 h-3 rounded-none ${mode.bgClass}`} />
                        {mode.label}
                    </button>
                );
            })}
        </div>
    );
}

export default BackgroundToggle;