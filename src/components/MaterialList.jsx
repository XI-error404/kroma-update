import React, { useState } from 'react';
import { Lock, Unlock, Package, ChevronRight, ChevronDown, Image as ImageIcon } from 'lucide-react';

function MaterialList({
    packs,
    onSelectMaterial,
    onRequestUnlock,
    selectedMaterialId,
    isBatchMode = false,
    selectedBatchIds = [],
    onToggleBatchId
}) {
    const [expandedPacks, setExpandedPacks] = useState(['pack-01']); // 初期展開

    const togglePack = (packId) => {
        setExpandedPacks(prev =>
            prev.includes(packId) ? prev.filter(id => id !== packId) : [...prev, packId]
        );
    };

    if (!packs || packs.length === 0) {
        return (
            <div className="p-4 text-gray-500 text-sm text-center">
                素材パックがありません
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar">
            {packs.map((pack) => {
                const isExpanded = expandedPacks.includes(pack.id);

                return (
                    <div key={pack.id} className="border-b border-[#282828]/30 last:border-0" style={{ borderColor: 'rgba(40, 40, 40, 0.3)' }}>
                        {/* パックヘッダー (クリックで展開) */}
                        <button
                            onClick={() => togglePack(pack.id)}
                            className="w-full flex items-center gap-2 px-3 py-3 bg-[#1e1e1e] hover:bg-[#282828] transition-colors group text-left"
                            style={{ backgroundColor: 'var(--bg-side)' }}
                        >
                            {isExpanded ? (
                                <ChevronDown size={14} className="text-gray-500" />
                            ) : (
                                <ChevronRight size={14} className="text-gray-500" />
                            )}
                            <Package size={14} className={`${pack.unlocked ? 'text-[#fe7f2e]' : 'text-gray-500'}`} style={pack.unlocked ? { color: 'var(--accent-orange)' } : {}} />
                            <span className={`text-[12px] font-normal flex-1 truncate uppercase tracking-tighter ${pack.unlocked ? 'text-gray-200' : 'text-gray-500'}`}>
                                {pack.name}
                            </span>
                            {/* Locked indicator if needed, but "PRO" text/badge is removed per request */}
                            {!pack.unlocked && <Lock size={12} className="text-yellow-600/50" />}
                        </button>

                        {/* 素材リスト (展開時のみ) */}
                        {isExpanded && (
                            <div className="bg-[#141414]/20 py-1" style={{ backgroundColor: 'rgba(20, 20, 20, 0.2)' }}>
                                {pack.materials.map((material) => {
                                    const isActive = selectedMaterialId === material.id;
                                    const isBatchSelected = selectedBatchIds.includes(material.id);

                                    return (
                                        <div key={material.id} className="relative">
                                            <button
                                                onClick={() => {
                                                    if (material.unlocked) {
                                                        if (isBatchMode) {
                                                            onToggleBatchId?.(material.id);
                                                        } else {
                                                            onSelectMaterial(material);
                                                        }
                                                    } else {
                                                        onRequestUnlock(pack);
                                                    }
                                                }}
                                                className={`
                          w-full flex items-center gap-3 px-4 py-2 text-left
                          transition-all text-[13px]
                          ${isActive && !isBatchMode
                                                        ? 'bg-[#fe7f2e]/10 text-[#fe7f2e] font-bold border-r-2 border-[#fe7f2e]'
                                                        : 'text-gray-400 hover:bg-[#282828] hover:text-gray-200'
                                                    }
                          ${isBatchSelected && isBatchMode ? 'bg-[#fe7f2e]/10 text-[#fe7f2e] font-bold border-r-2 border-[#fe7f2e]' : ''}
                          ${!material.unlocked ? 'opacity-40 grayscale pointer-events-none' : ''}
                        `}
                                                style={(isActive && !isBatchMode) || (isBatchSelected && isBatchMode) ? { backgroundColor: 'rgba(254, 127, 46, 0.1)', color: 'var(--accent-orange)', borderRightColor: 'var(--accent-orange)' } : {}}
                                            >
                                                {/* アイコンまたはチェックボックス */}
                                                <div className="w-5 h-5 rounded-none flex items-center justify-center flex-shrink-0">
                                                    {isBatchMode && material.unlocked ? (
                                                        <div className={`w-4 h-4 rounded-none border transition-colors flex items-center justify-center
                               ${isBatchSelected ? 'bg-[#75509f] border-[#75509f] shadow-[0_0_8px_rgba(117,80,159,0.5)]' : 'border-gray-600'}`}>
                                                            {isBatchSelected && <div className="w-1.5 h-1.5 bg-white rounded-none scale-in" />}
                                                        </div>
                                                    ) : material.unlocked ? (
                                                        <ImageIcon size={14} className={isActive ? 'text-[#fe7f2e]' : 'text-gray-500'} style={isActive ? { color: 'var(--accent-orange)' } : {}} />
                                                    ) : (
                                                        <Lock size={12} className="text-gray-600" />
                                                    )}
                                                </div>

                                                {/* 名前 */}
                                                <span className="flex-1 truncate">
                                                    {material.name}
                                                </span>

                                                {/* ステータスドット */}
                                                {material.unlocked && !isBatchMode && isActive && (
                                                    <div className="w-1.5 h-1.5 rounded-none bg-[#fe7f2e] shadow-[0_0_8px_rgba(254,127,46,0.8)]" style={{ backgroundColor: '#fe7f2e' }} />
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default MaterialList;
