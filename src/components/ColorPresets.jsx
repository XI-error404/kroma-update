import React, { useState, useEffect } from 'react';
import { Save, Trash2, Palette, ChevronRight } from 'lucide-react';
import ProBadge from './ProBadge';

function ColorPresets({ hue, saturation, brightness, onApply, isPro }) {
    const [presets, setPresets] = useState([]);
    const [newPresetName, setNewPresetName] = useState('');

    useEffect(() => {
        refreshPresets();
    }, []);

    const refreshPresets = async () => {
        const data = await window.electronAPI.getPresets();
        setPresets(data);
    };

    const handleSave = async () => {
        if (!newPresetName.trim()) return;

        // 保存制限チェック
        if (!isPro && presets.length >= 3) {
            alert('Trial Modeの保存上限（3個）に達しました。Pro Edition へアップグレードして無制限に保存しましょう！');
            return;
        }

        await window.electronAPI.savePreset({
            name: newPresetName,
            hue,
            saturation,
            brightness
        });

        setNewPresetName('');
        refreshPresets();
    };

    const handleDelete = async (id) => {
        await window.electronAPI.deletePreset(id);
        refreshPresets();
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Palette size={12} className="text-[#fe7f2e]" style={{ color: 'var(--accent-orange)' }} />
                    Color Presets
                    {!isPro && (
                        <span className="text-[8px] px-1.5 py-0.5 bg-[#fe7f2e]/10 text-[#fe7f2e] border border-[#fe7f2e]/20 rounded" style={{ backgroundColor: 'rgba(254, 127, 46, 0.1)', color: 'var(--accent-orange)', borderColor: 'rgba(254, 127, 46, 0.2)' }}>
                            {presets.length}/3
                        </span>
                    )}
                </h2>
            </div>

            {/* 保存フォーム */}
            <div className="flex gap-1.5">
                <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="New preset name..."
                    className="flex-1 px-3 py-2 bg-[#141414] border border-[#282828] rounded-xl text-[11px] font-bold text-white focus:outline-none focus:border-[#fe7f2e]/50 transition-all placeholder:text-gray-400"
                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--bg-card)' }}
                />
                <button
                    onClick={handleSave}
                    disabled={!newPresetName.trim()}
                    className="p-2 bg-[#75509f] hover:bg-[#fe7f2e] text-white rounded-xl shadow-glow transition-all active:scale-90 disabled:opacity-20 disabled:grayscale"
                    style={{ backgroundColor: 'var(--accent-purple)' }}
                >
                    <Save size={14} />
                </button>
            </div>

            {/* プリセットリスト */}
            <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                {presets.map((preset) => (
                    <div key={preset.id} className="group flex items-center gap-1.5">
                        <button
                            onClick={() => onApply(preset)}
                            className="flex-1 flex items-center justify-between px-3 py-2.5 bg-[#282828]/50 hover:bg-[#282828] rounded-xl text-[11px] font-bold text-gray-400 hover:text-white transition-all text-left border border-white/5"
                            style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                        >
                            <span>{preset.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[12px] font-mono text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {preset.hue}° {preset.saturation}%
                                </span>
                                <ChevronRight size={10} className="text-gray-400 group-hover:text-[#fe7f2e]" style={{ '--tw-text-opacity': '1' }} />
                            </div>
                        </button>
                        <button
                            onClick={() => handleDelete(preset.id)}
                            className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ColorPresets;
