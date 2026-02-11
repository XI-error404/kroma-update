import React from 'react';
import { ImageIcon, Loader2, Layers, Trash2, Maximize2 } from 'lucide-react';

function ImagePreview({
    images = [],
    selectedIndex = null,
    selectedIds = [], // 複数選択用
    viewMode = 'grid',
    onSelect,
    onDelete,
    onToggleView,
    canvasRef,
    bgMode,
    isProcessing,
    // Selection related props
    selectionRect = null, // { x, y, width, height } or null
    onMultiSelect, // (index, isRange, isToggle) => void (handling Ctrl/Shift)
    containerRef // Ref for the grid container to handle drag events
}) {
    const localCanvasRef = React.useRef(null);

    // 外部Refとの同期
    React.useEffect(() => {
        if (canvasRef) {
            canvasRef.current = localCanvasRef.current;
        }
    });

    // シングルビューの描画ロジック
    // APNGを含むすべての画像について、Canvas上で requestAnimationFrame によるループ描画を行う。
    // ブラウザのAPNGデコーダが <img> の内部アニメーションを管理するため、
    // drawImage を繰り返すことで全フレームがループし続ける。
    React.useEffect(() => {
        if (viewMode !== 'single' || selectedIndex === null || !images[selectedIndex]) return;

        const canvas = localCanvasRef.current;
        if (!canvas) return;

        const imgData = images[selectedIndex];
        const ctx = canvas.getContext('2d');
        const img = new Image();
        let animationFrameId;

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            const render = () => {
                if (!canvas || !ctx) return;

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // 1. HSV処理済みの絵を描画
                ctx.drawImage(img, 0, 0);

                // 2. オーバーレイ (source-atop)
                if (imgData.overlay && imgData.overlay.opacity > 0) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'source-atop';
                    ctx.fillStyle = imgData.overlay.color;
                    ctx.globalAlpha = imgData.overlay.opacity / 100;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.restore();
                }

                // APNG / 静止画を問わず、常にループ描画
                animationFrameId = window.requestAnimationFrame(render);
            };

            render();
        };

        const b64 = imgData.processed || imgData.original;
        img.src = b64.startsWith('data:image') ? b64 : `data:image/png;base64,${b64}`;

        // クリーンアップ: ビュー切り替えや選択変更時にループを停止
        return () => {
            if (animationFrameId) {
                window.cancelAnimationFrame(animationFrameId);
            }
        };
    }, [selectedIndex, images, viewMode]);
    const getBgClass = () => {
        switch (bgMode) {
            case 'white': return 'bg-white';
            case 'black': return 'bg-black';
            case 'checkerboard':
            default: return 'checkerboard';
        }
    };

    if (images.length === 0) {
        return (
            <div className={`relative w-full h-full flex flex-col items-center justify-center text-gray-500 ${getBgClass()}`}>
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-[#282828] rounded-none opacity-40">
                    <ImageIcon size={48} className="mb-4" />
                    <p className="text-sm uppercase tracking-widest font-bold">素材が読み込まれていません</p>
                    <p className="text-[10px] mt-2">PNGファイルをここにドロップして開始</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative w-full h-full flex flex-col ${getBgClass()} overflow-hidden`}>
            {/* メインエリア */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-auto custom-scrollbar p-6"
            >
                {viewMode === 'grid' ? (
                    <>
                        {/* グリッドビュー */}
                        <div key={images.length} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pointer-events-none">
                            {images.map((img, idx) => {
                                const isSelected = selectedIndex === idx || (selectedIds && selectedIds.includes(img.id));
                                // Batch Edit Sync: Use CSS filters for immediate preview
                                const filterStyle = {
                                    filter: `hue-rotate(${img.hsv.hue}deg) saturate(${100 + img.hsv.saturation}%) brightness(${100 + img.hsv.brightness}%)`
                                };

                                return (
                                    <div
                                        key={img.id}
                                        onClick={(e) => {
                                            // ポインターイベントを有効化
                                            // コンテナのドラッグ選択と干渉しないように制御が必要だが、
                                            // ここではクリックを優先する
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (onMultiSelect) {
                                                const isCtrl = e.ctrlKey || e.metaKey;
                                                const isShift = e.shiftKey;
                                                onMultiSelect(idx, isShift, isCtrl);
                                            } else {
                                                onSelect(idx, e);
                                            }
                                        }}
                                        onDoubleClick={() => onToggleView('single')}
                                        className={`relative aspect-square group cursor-pointer border-2 transition-all pointer-events-auto select-none ${isSelected ? 'border-[#fe7f2e] bg-[#fe7f2e]/15' : 'border-[#282828] bg-black/20 hover:border-gray-600'
                                            }`}
                                        style={{ aspectRatio: '1/1' }}
                                    >
                                        <img
                                            src={(() => {
                                                // Grid preview always uses original + CSS filters for real-time performance
                                                const b64 = img.original;
                                                if (!b64) return ''; // Placeholder?
                                                return b64.startsWith('data:image')
                                                    ? b64
                                                    : `data:image/png;base64,${b64}`;
                                            })()}
                                            alt={img.name}
                                            className="w-full h-full object-contain p-2 rounded-none pointer-events-none"
                                            style={filterStyle}
                                        />
                                        {/* Real-time Overlay using CSS Mask to simulate source-atop */}
                                        {img.overlay && img.overlay.opacity > 0 && (
                                            <div
                                                className="absolute inset-0 p-2 pointer-events-none"
                                                style={{
                                                    backgroundColor: img.overlay.color,
                                                    opacity: img.overlay.opacity / 100,
                                                    maskImage: `url(${(() => {
                                                        const b64 = img.original;
                                                        return b64?.startsWith('data:image') ? b64 : `data:image/png;base64,${b64}`;
                                                    })()})`,
                                                    maskSize: 'contain',
                                                    maskPosition: 'center',
                                                    maskRepeat: 'no-repeat',
                                                    WebkitMaskImage: `url(${(() => {
                                                        const b64 = img.original;
                                                        return b64?.startsWith('data:image') ? b64 : `data:image/png;base64,${b64}`;
                                                    })()})`,
                                                    WebkitMaskSize: 'contain',
                                                    WebkitMaskPosition: 'center',
                                                    WebkitMaskRepeat: 'no-repeat'
                                                }}
                                            />
                                        )}
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(idx); }}
                                                className="p-1.5 bg-red-600 text-white hover:bg-red-700 transition-colors"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1.5 backdrop-blur-sm">
                                            <p className="text-[9px] text-gray-300 truncate font-mono uppercase tracking-tighter">
                                                {img.name}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* ドラッグ選択範囲の描画 */}
                        {selectionRect && (
                            <div
                                className="absolute border border-[#fe7f2e] bg-[#fe7f2e]/20 pointer-events-none z-50"
                                style={{
                                    left: selectionRect.x,
                                    top: selectionRect.y,
                                    width: selectionRect.width,
                                    height: selectionRect.height
                                }}
                            />
                        )}
                    </>
                ) : (
                    /* シングルビュー */
                    <div className="w-full h-full flex items-center justify-center relative">
                        <canvas
                            ref={localCanvasRef}
                            className="max-w-full max-h-full object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.4)]"
                        />
                        <button
                            onClick={() => onToggleView('grid')}
                            className="absolute top-0 right-0 p-2 bg-black/40 hover:bg-black/60 text-white transition-colors"
                        >
                            <Maximize2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* ボトムフィルムストリップ (シングルビュー時のみ) */}
            {viewMode === 'single' && (
                <div className="h-24 bg-[#1e1e1e]/80 backdrop-blur-md border-t border-[#282828] flex items-center gap-2 p-2 overflow-x-auto custom-scrollbar shrink-0">
                    {images.map((img, idx) => (
                        <div
                            key={img.id}
                            onClick={() => onSelect(idx)}
                            className={`h-full aspect-square shrink-0 cursor-pointer border-2 transition-all ${selectedIndex === idx ? 'border-[#fe7f2e] bg-[#fe7f2e]/10' : 'border-[#282828] opacity-60 hover:opacity-100'
                                }`}
                        >
                            <img
                                src={`data:image/png;base64,${img.processed}`}
                                alt={img.name}
                                className="w-full h-full object-contain p-1 rounded-none"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* 処理中インジケーター */}
            {isProcessing && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-none border border-white/10 shadow-lg z-50">
                    <Loader2 size={12} className="animate-spin text-[#fe7f2e]" />
                    処理中...
                </div>
            )}
        </div>
    );
}

export default ImagePreview;
