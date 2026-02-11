import React, { useState, useEffect } from 'react';
import { Hash } from 'lucide-react';

// HSV (0-360, 0-1, 0-1) <-> RGB 変換ヘルパー
const hsvToRgb = (h, s, v) => {
    h = ((h % 360) + 360) % 360;
    let r, g, b;
    let i = Math.floor(h / 60);
    let f = h / 60 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

const rgbToHex = (r, g, b) => {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
};

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
};

const rgbToHsv = (r, g, b) => {
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    let d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
        h = 0;
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
};

function HSVSliders({ hue, saturation, brightness, onChange, overlayColor, overlayOpacity, onOverlayChange, isPro, disabled }) {
    const [hex, setHex] = useState('#fe7f2e');

    // HSV (アプリのオフセット値) から HEX を計算 (デモ表示用)
    useEffect(() => {
        const baseH = 240;
        const h = (baseH + hue + 360) % 360;
        const s = Math.min(1, Math.max(0, 0.5 * (1 + saturation / 100)));
        const v = Math.min(1, Math.max(0, 0.5 * (1 + brightness / 100)));
        const [r, g, b] = hsvToRgb(h, s, v);
        setHex(rgbToHex(r, g, b).toUpperCase());
    }, [hue, saturation, brightness]);

    const handleHexChange = (e) => {
        const value = e.target.value.toUpperCase();
        setHex(value.startsWith('#') ? value : '#' + value);
        if (/^#?[0-9A-F]{6}$/i.test(value.startsWith('#') ? value : '#' + value)) {
            const rgb = hexToRgb(value.startsWith('#') ? value : '#' + value);
            if (rgb) {
                const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
                const baseH = 240;
                onChange('hue', Math.round((h - baseH + 180 + 360) % 360 - 180));
                onChange('saturation', Math.round((s / 50 - 1) * 100));
                onChange('brightness', Math.round((v / 50 - 1) * 100));
            }
        }
    };

    const hsvSlidersData = [
        {
            id: 'hue',
            label: 'COLOR CHANGE (色味の変更)',
            value: hue,
            min: -180,
            max: 180,
            unit: '°',
            gradient: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
        },
        {
            id: 'saturation',
            label: 'VIVIDNESS (鮮やかさ)',
            value: saturation,
            min: -100,
            max: 100,
            unit: '%',
            gradient: 'linear-gradient(to right, #888, #fe7f2e)',
        },
        {
            id: 'brightness',
            label: 'BRIGHTNESS (明るさ)',
            value: brightness,
            min: -100,
            max: 100,
            unit: '%',
            gradient: 'linear-gradient(to right, #000, #fff)',
        },
    ];

    return (
        <div className="space-y-6">
            {/* HEX入力 & カラーピッカー */}
            <div className={`flex items-center gap-3 p-3 bg-[#141414] border border-[#282828] rounded-none ${disabled ? 'opacity-40' : ''}`} style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--bg-card)' }}>
                <div className="flex items-center gap-2 flex-1">
                    <Hash size={14} className="text-gray-400" />
                    <input
                        type="text"
                        value={hex}
                        onChange={handleHexChange}
                        disabled={disabled}
                        className="bg-transparent text-[13px] font-mono text-white focus:outline-none w-full"
                        placeholder="#FFFFFF"
                    />
                </div>
                <div className="relative group">
                    <input
                        type="color"
                        value={hex.startsWith('#') ? hex : '#FFFFFF'}
                        onChange={handleHexChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        disabled={disabled}
                    />
                    <div
                        className="w-10 h-6 rounded-none border border-white/10 shadow-inner group-hover:border-[#fe7f2e]/50 transition-colors"
                        style={{ backgroundColor: hex }}
                    />
                </div>
            </div>

            <div className="space-y-5">
                {hsvSlidersData.map((slider) => (
                    <div key={slider.id} className={disabled ? 'opacity-40' : ''}>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[12px] font-semibold text-gray-400 uppercase tracking-widest">{slider.label}</label>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="number"
                                    min={slider.min}
                                    max={slider.max}
                                    value={slider.value}
                                    onChange={(e) => onChange(slider.id, parseInt(e.target.value, 10) || 0)}
                                    disabled={disabled}
                                    className="w-12 bg-[#141414] border border-[#282828] rounded-none text-center text-[10px] font-mono text-white py-0.5 focus:border-[#fe7f2e]/50 focus:outline-none transition-colors"
                                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--bg-card)' }}
                                />
                                <span className="text-[10px] font-mono text-gray-400 w-3">{slider.unit}</span>
                            </div>
                        </div>

                        <div className="relative flex items-center gap-3">
                            <input
                                type="range"
                                min={slider.min}
                                max={slider.max}
                                value={slider.value}
                                onChange={(e) => onChange(slider.id, parseInt(e.target.value, 10))}
                                disabled={disabled}
                                className="w-full relative z-10 disabled:cursor-not-allowed accent-[#fe7f2e]"
                                style={{ accentColor: 'var(--accent-orange)' }}
                            />
                        </div>
                    </div>
                ))}
                <p className="text-[12px] text-whiteContent font-semibold mt-1 pl-1">※元の質感を維持したまま調整します</p>
            </div>

            {/* [Pro限定] カラーオーバーレイ */}
            <div className={`pt-4 border-t border-[#282828] space-y-4 ${!isPro ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                <div className="flex items-center justify-between">
                    <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        OVERLAY COLOR (塗りつぶし)
                    </label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#141414] border border-[#282828] rounded-none" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--bg-card)' }}>
                    <div className="flex items-center gap-2 flex-1">
                        <Hash size={14} className="text-gray-400" />
                        <input
                            type="text"
                            value={overlayColor}
                            onChange={(e) => onOverlayChange('color', e.target.value)}
                            disabled={!isPro || disabled}
                            className="bg-transparent text-[13px] font-mono text-white focus:outline-none w-full"
                        />
                    </div>
                    <input
                        type="color"
                        value={overlayColor}
                        onChange={(e) => onOverlayChange('color', e.target.value)}
                        disabled={!isPro || disabled}
                        className="w-10 h-6 rounded-none bg-transparent cursor-pointer border-none"
                    />
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[12px] text-gray-400 tracking-wider">OPACITY (不透明度)</span>
                        <span className="text-[10px] font-mono text-whiteContent">{overlayOpacity}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={overlayOpacity}
                        onChange={(e) => onOverlayChange('opacity', parseInt(e.target.value, 10))}
                        disabled={!isPro || disabled}
                        className="w-full accent-[#75509f]"
                    />
                </div>
            </div>
        </div>
    );
}

export default HSVSliders;
