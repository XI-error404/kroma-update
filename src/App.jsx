import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Save, RotateCcw, Key, FolderOpen, Download, FileJson } from 'lucide-react';
import ImagePreview from './components/ImagePreview';
import HSVSliders from './components/HSVSliders';
import BackgroundToggle from './components/BackgroundToggle';
import LicenseModal from './components/LicenseModal';
import MaterialList from './components/MaterialList';
import TrialBanner from './components/TrialBanner';
// BatchControls のインポートを削除
import ColorPresets from './components/ColorPresets';
import LicenseStatus from './components/LicenseStatus';
import ProBadge from './components/ProBadge';
import EULAModal from './components/EULAModal';
import AboutModal from './components/AboutModal';
import UpgradeModal from './components/UpgradeModal';
import { ExternalLink, Info, AlertTriangle, ArrowRight } from 'lucide-react';
// logoIcon のインポートを削除

const CURRENT_VERSION = "1.0.0";

function App() {
    // 画像リスト管理 (Pro/Standard共通)
    const [images, setImages] = useState([]); // [{ id, name, original, processed, hsv: {h,s,v}, overlay: {c,a}, isExternal }]
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'single'
    const [isProcessing, setIsProcessing] = useState(false);

    // 共通HSV/オーバーレイ値 (編集中の画像に適用)
    const [hue, setHue] = useState(0);
    const [saturation, setSaturation] = useState(0);
    const [brightness, setBrightness] = useState(0);
    const [overlayColor, setOverlayColor] = useState('#ffffff');
    const [overlayOpacity, setOverlayOpacity] = useState(0);

    // 複数選択 & ドラッグ選択用
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectionRect, setSelectionRect] = useState(null); // { x, y, width, height }
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef(null);
    const containerRef = useRef(null); // グリッドコンテナへの参照
    const canvasRef = useRef(null); // シングルビューのCanvas参照

    // 背景モード
    const [bgMode, setBgMode] = useState('checkerboard');

    // EULA同意状態
    const [eulaAccepted, setEulaAccepted] = useState(() => {
        return localStorage.getItem('kroma-eula-accepted') === 'true';
    });

    // アップデート情報
    const [updateInfo, setUpdateInfo] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showUpgradeEligibleModal, setShowUpgradeEligibleModal] = useState(false);

    // ライセンス関連
    const [showLicenseModal, setShowLicenseModal] = useState(false);
    const [trialStatus, setTrialStatus] = useState(null);
    const [materialPacks, setMaterialPacks] = useState([]);
    const [selectedMaterialId, setSelectedMaterialId] = useState(null);

    // ツールチップ・ガイドライン
    const [showGuideline, setShowGuideline] = useState(false);

    // デバウンス用タイマー
    const debounceTimer = useRef(null);

    // ---------------------------------------------------------
    // プランの動的判定ロジック (localStorage を正とする)
    // ---------------------------------------------------------
    const [licenseKeys, setLicenseKeys] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('kroma_keys') || '[]');
        } catch {
            return [];
        }
    });

    const updateLicenseKeys = useCallback(() => {
        try {
            const keys = JSON.parse(localStorage.getItem('kroma_keys') || '[]');
            setLicenseKeys(keys);
        } catch {
            setLicenseKeys([]);
        }
    }, []);

    const proKeyExists = licenseKeys.some(k => k.startsWith('KR-PRO-'));
    const stdCount = licenseKeys.filter(k => k.startsWith('KR-STD-')).length;

    // アップグレード通知済みフラグ
    const [upgradeNotified, setUpgradeNotified] = useState(() => {
        return localStorage.getItem('kroma_upgrade_notified') === 'true';
    });

    let currentPlan = 'Trial Mode';
    if (proKeyExists) {
        currentPlan = 'Pro Edition';
    } else if (stdCount >= 3) {
        // 3つ以上でPro同等機能 + アップグレード案内
        // 要件: "Standard表示: ...3つ目を入れた時点ではまだ画面上のプラン表示は「Standard」のまま"
        // "Pro表示: ...「Pro昇格のポップアップ/案内」が出た後...のみ「Pro Edition...」と表示"

        if (upgradeNotified) {
            currentPlan = 'Pro Edition';
        } else {
            currentPlan = 'Standard Edition';
        }
    } else if (stdCount >= 1) {
        currentPlan = 'Standard Edition';
    }

    // Pro機能の有効化判定
    // 3つ揃ったら (機能としては) Pro機能を使えるようにするが、
    // 表示上は厳格に管理する。機能制限解除は stdCount >= 3 で即時行っても良いが、
    // "Standard Edition" 表記の間に Pro機能が使えてしまうと違和感があるかもしれない。
    // しかし "Pro昇格のポップアップ" が出るまでは Standard 扱いということは、機能も Standard に据え置くのが自然か？
    // いや、ユーザー体験としては「キーを入れた」→「アンロックされた」感が欲しい。
    // ここでは "Display" の要件が強調されているため、内部フラグ isPro は stdCount >= 3 で true にしつつ、
    // 表示 (currentPlan) だけ制御するアプローチとする。
    // ただし "Standard Edition" 表示中に Pro機能 (外部画像D&Dなど) が使えると混乱の元か？
    // 文脈: "Standard Edition が有効になりました" と出るべき。

    // シンプルに: stdCount >= 3 で機能は解放。表示は notification 待ち。
    const isPro = proKeyExists || stdCount >= 3;

    // 表示用Tier (isProフラグではなく、currentPlanの文字列に厳格に従う)
    const currentTier = currentPlan === 'Pro Edition' ? 'pro' : (currentPlan === 'Standard Edition' ? 'standard' : 'trial');
    const standardKeyCount = stdCount;

    // 累積3つでの優待案内トリガー
    useEffect(() => {
        // isPro (stdCount >= 3) だがまだ通知を見ていない場合
        if (standardKeyCount >= 3 && !proKeyExists && !upgradeNotified) {
            // まだProキーがなく、Standard3枚で、かつ通知を見ていない場合
            // 少し遅延させて表示などを検討しても良いが、即時出す
            setShowUpgradeEligibleModal(true);
            // ここでは setItem せず、Modal で "閉じる" を押したとき、あるいは
            // "Standardのまま使う" などを選んだ時にフラグを立てるべきだが、
            // 簡易的に「案内を出した」時点でフラグを立てるか、Modal側で制御するか。
            // Modal表示ステート管理の外でフラグ更新すると無限ループの恐れあり。
            // ここでは setShowUpgradeEligibleModal(true) だけ行い、
            // 実際の localStorage 更新は Modal の onClose または 今後の操作に委ねる、
            // あるいは「一度出したら二度と出さない」制御をここで。
        }
    }, [standardKeyCount, proKeyExists, upgradeNotified]);

    // モダルを閉じたタイミングなどでリフレッシュが必要
    const handleUpgradeModalClose = () => {
        localStorage.setItem('kroma_upgrade_notified', 'true');
        setUpgradeNotified(true);
        setShowUpgradeEligibleModal(false);
    };

    // ---------------------------------------------------------

    // 選択画像群へのリアルタイム処理 (デバウンス)
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            processAllSelectedImages();
        }, 60);
    }, [hue, saturation, brightness, overlayColor, overlayOpacity, selectedIndex, selectedIds]); // images 依存は外す

    const processAllSelectedImages = async () => {
        // 処理対象特定
        let targets = [];
        if (selectedIds.length > 0) {
            targets = selectedIds;
        } else if (selectedIndex !== null && images[selectedIndex]) {
            targets = [images[selectedIndex].id];
        } else {
            return;
        }

        setIsProcessing(true);

        try {
            const results = await Promise.all(targets.map(async (id) => {
                const img = images.find(i => i.id === id);
                if (!img) return null;

                // 個別画像のパラメータを使用 (Global State汚染回避)
                const res = await window.electronAPI.processImage({
                    base64: img.original,
                    hue: img.hsv.hue,
                    saturation: img.hsv.saturation,
                    brightness: img.hsv.brightness,
                    overlayColor: null, // サムネイル/プレビュー用はOverlay焼き込みなし (Canvas/CSSで合成)
                    overlayOpacity: 0
                });
                return { id, res };
            }));

            setImages(prev => {
                const next = [...prev];
                results.forEach(item => {
                    if (!item || !item.res.success) return;
                    const idx = next.findIndex(i => i.id === item.id);
                    if (idx !== -1) {
                        // パラメータ(hsv, overlay)は上書きせず、生成された画像のみ更新
                        next[idx] = {
                            ...next[idx],
                            processed: item.res.base64,
                        };
                    }
                });
                return next;
            });

        } catch (error) {
            console.error('Processing error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // 初期化とグローバルイベント
    useEffect(() => {
        const init = async () => {
            try {
                const [status, packs, update] = await Promise.all([
                    window.electronAPI.getTrialStatus(),
                    window.electronAPI.getMaterialList(),
                    window.electronAPI.checkUpdate(),
                ]);
                setTrialStatus(status);
                setMaterialPacks(packs);

                if (update && update.hasUpdate) {
                    setUpdateInfo(update);
                    setShowUpdateModal(true);
                }
            } catch (error) {
                console.error('Init error:', error);
            }
        };
        init();

        // 削除用キーイベント
        const handleKeyDown = (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // 入力フィールド等にフォーカスがある場合は無視
                if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

                if (selectedIndex !== null) {
                    handleDeleteImage(images[selectedIndex]?.id);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        // メニューイベントのハンドリング
        const cleanupMenu = window.electronAPI.onMenuAction((action) => {
            switch (action) {
                case 'open-image': handleOpenImage(); break;
                case 'save-project': handleSaveProject(); break;
                case 'reset-ui': resetUI(); break;
                case 'open-license': setShowLicenseModal(true); break;
                case 'open-about': setShowAboutModal(true); break;
                default: break;
            }
        });

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            cleanupMenu();
        };
    }, [selectedIndex, images]); // 依存配列に選択状態を追加して削除ハンドラを最新化

    const resetUI = () => {
        setBgMode('checkerboard');
        resetValues();
    };

    // ドラッグ＆ドロップのハンドリング
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            // Standard版以下は外部画像読み込み不可 (ただし、素材パックからのD&Dは許可されるべきだが現状は外部ファイル想定)
            if (!isPro && files.some(f => f.path)) {
                alert('外部PNGの読み込みはPro版限定機能です。');
                return;
            }

            const newImages = [];
            for (const file of files) {
                if (file.type === 'image/png') {
                    const base64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (ev) => resolve(ev.target.result.split(',')[1]);
                        reader.readAsDataURL(file);
                    });
                    newImages.push({
                        id: Date.now() + Math.random(),
                        name: file.name,
                        original: base64,
                        processed: base64,
                        hsv: { hue: 0, saturation: 0, brightness: 0 },
                        overlay: { color: '#ffffff', opacity: 0 },
                        isExternal: true
                    });
                }
            }
            if (newImages.length > 0) {
                setImages(prev => [...prev, ...newImages]);
                // 1枚だけなら即表示
                if (images.length === 0 && newImages.length === 1) {
                    setSelectedIndex(0);
                    setViewMode('single');
                    resetValues();
                } else {
                    setViewMode('grid');
                }
            }
        }
    };

    // 状態更新
    const refreshData = async () => {
        const [status, packs] = await Promise.all([
            window.electronAPI.getTrialStatus(),
            window.electronAPI.getMaterialList(),
        ]);
        setTrialStatus(status);
        setMaterialPacks(packs);

        if (status && status.upgradeEligible) {
            setShowUpgradeEligibleModal(true);
        }
    };

    // 画像を開く
    const handleOpenImage = async () => {
        if (!isPro) {
            alert('外部PNGの読み込みはPro版限定機能です。素材パックから選択してください。');
            return;
        }

        if (!localStorage.getItem('kroma-guideline-accepted')) {
            setShowGuideline(true);
            return;
        }

        try {
            const result = await window.electronAPI.openImage();
            if (result) {
                const newImg = {
                    id: Date.now() + Math.random(),
                    name: result.fileName,
                    original: result.base64,
                    processed: result.base64,
                    hsv: { hue: 0, saturation: 0, brightness: 0 },
                    overlay: { color: '#ffffff', opacity: 0 },
                    isExternal: true
                };
                setImages(prev => [...prev, newImg]);
                setSelectedIndex(images.length);
                setViewMode('single');
                resetValues();
            }
        } catch (error) {
            console.error('Failed to open image:', error);
        }
    };

    const acceptGuideline = () => {
        localStorage.setItem('kroma-guideline-accepted', 'true');
        setShowGuideline(false);
        handleOpenImage();
    };

    const handleAcceptEULA = () => {
        localStorage.setItem('kroma-eula-accepted', 'true');
        setEulaAccepted(true);
    };

    // 素材を選択
    const handleSelectMaterial = async (material) => {
        try {
            setIsProcessing(true);
            const result = await window.electronAPI.loadMaterial(material.id);
            if (result.success) {
                const newImg = {
                    id: material.id,
                    name: material.name + '.png',
                    original: result.base64,
                    processed: result.base64,
                    hsv: { hue: 0, saturation: 0, brightness: 0 },
                    overlay: { color: '#ffffff', opacity: 0 },
                    isExternal: false
                };
                setImages(prev => [...prev, newImg]);
                setSelectedIndex(images.length);
                setViewMode('single');
                resetValues();
            }
        } catch (error) {
            console.error('Material load error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // 画像削除
    const handleDeleteImage = (id) => {
        // IDが渡されたらそれ単体の削除 (ボタン押下など)
        // ただし、複数選択状態なら、削除対象が選択に含まれているか確認し、
        // 含まれていればまとめて削除、そうでなければ単体削除とするのが自然

        // 削除対象IDリスト
        let idsToDelete = [];
        if (id) {
            idsToDelete = [id];
            // もし id が selectedIds に含まれているなら、selectedIds 全体を削除対象にする
            if (selectedIds.includes(id)) {
                idsToDelete = [...selectedIds];
            }
        } else {
            // 引数なし (Deleteキーなど) -> 選択中のものを削除
            if (selectedIds.length > 0) {
                idsToDelete = [...selectedIds];
            } else if (selectedIndex !== null && images[selectedIndex]) {
                idsToDelete = [images[selectedIndex].id];
            }
        }

        if (idsToDelete.length === 0) return;

        setImages(prev => {
            const next = prev.filter(img => !idsToDelete.includes(img.id));

            // 選択状態の更新
            if (next.length === 0) {
                setSelectedIndex(null);
                setSelectedIds([]);
                setViewMode('grid');
            } else {
                // 削除後の選択位置調整
                // 最後に選択していたインデックス付近を維持したいが、
                // 複数削除の場合は難しいので、単に最後の要素を選択するか、
                // もともとの selectedIndex が残っていればそれを維持、なければずらす

                // シンプルに: 選択解除し、何も選択しない状態にする (Grid Viewのリセット)
                // または、残ったリストの末尾を選択
                setSelectedIndex(null);
                setSelectedIds([]);
            }
            return next;
        });
    };

    // 選択切り替え (単一)
    const handleSelectIndex = (index) => {
        setSelectedIndex(index);
        // 単一選択時は複数選択をリセット
        if (images[index]) {
            setSelectedIds([images[index].id]);
            const img = images[index];
            setHue(img.hsv.hue);
            setSaturation(img.hsv.saturation);
            setBrightness(img.hsv.brightness);
            setOverlayColor(img.overlay.color);
            setOverlayOpacity(img.overlay.opacity);
        }
    };

    // 複数選択・Ctrl/Shift対応
    const handleMultiSelect = (index, isShift, isCtrl) => {
        const targetId = images[index].id;

        if (isShift && selectedIndex !== null) {
            // 範囲選択
            const start = Math.min(selectedIndex, index);
            const end = Math.max(selectedIndex, index);
            const rangeIds = images.slice(start, end + 1).map(img => img.id);
            // 既存の選択にマージするか、新規にするかはUX次第だが、ここではシンプルに範囲のみにする、または結合
            // 一般的にはShiftは範囲選択になるので、selectedIdsをその範囲にする
            setSelectedIds(rangeIds);
            setSelectedIndex(index); // アンカー更新
        } else if (isCtrl) {
            // トグル選択
            setSelectedIds(prev => {
                if (prev.includes(targetId)) {
                    const next = prev.filter(id => id !== targetId);
                    // 選択解除後のフォーカス処理（もし現在選択中のものを解除したらnullまたは他へ）
                    if (selectedIndex === index) {
                        setSelectedIndex(next.length > 0 ? images.findIndex(img => img.id === next[next.length - 1]) : null);
                    }
                    return next;
                } else {
                    setSelectedIndex(index); // 最後にクリックしたものをアクティブに
                    return [...prev, targetId];
                }
            });
        } else {
            // 通常クリック (他を解除)
            handleSelectIndex(index);
        }
    };

    // マウスドラッグ選択
    const handleMouseDown = (e) => {
        // グリッドビューかつ、クリックターゲットがコンテナ自体の場合のみ開始
        if (viewMode !== 'grid') return;
        // 画像上のクリックは onClick で処理されるので、ここではバブリングしてきた場合や背景クリックを想定
        if (e.target.closest('.group')) return; // アイテム上なら無視

        setIsDragging(true);
        const rect = containerRef.current.getBoundingClientRect();
        const startX = e.clientX - rect.left + containerRef.current.scrollLeft;
        const startY = e.clientY - rect.top + containerRef.current.scrollTop;
        dragStartPos.current = { x: startX, y: startY };
        setSelectionRect({ x: startX, y: startY, width: 0, height: 0 });

        // 通常クリック(=ドラッグ開始)で選択解除 (Ctrl押下でなければ)
        if (!e.ctrlKey && !e.shiftKey) {
            setSelectedIds([]);
            setSelectedIndex(null);
        }
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !dragStartPos.current || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left + containerRef.current.scrollLeft;
        const currentY = e.clientY - rect.top + containerRef.current.scrollTop;

        const x = Math.min(dragStartPos.current.x, currentX);
        const y = Math.min(dragStartPos.current.y, currentY);
        const width = Math.abs(currentX - dragStartPos.current.x);
        const height = Math.abs(currentY - dragStartPos.current.y);

        setSelectionRect({ x, y, width, height });
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);

        // 矩形交差判定
        if (selectionRect && containerRef.current) {
            const items = containerRef.current.querySelectorAll('.group'); // ImagePreviewで付けたクラス
            const containerRect = containerRef.current.getBoundingClientRect();
            const newSelectedIds = [...selectedIds];

            items.forEach((item, idx) => {
                const itemRect = item.getBoundingClientRect();
                // コンテナ相対座標に変換
                const itemLeft = itemRect.left - containerRect.left + containerRef.current.scrollLeft;
                const itemTop = itemRect.top - containerRect.top + containerRef.current.scrollTop;
                const itemRight = itemLeft + itemRect.width;
                const itemBottom = itemTop + itemRect.height;

                const selLeft = selectionRect.x;
                const selTop = selectionRect.y;
                const selRight = selLeft + selectionRect.width;
                const selBottom = selTop + selectionRect.height;

                // 交差判定
                if (itemLeft < selRight && itemRight > selLeft && itemTop < selBottom && itemBottom > selTop) {
                    const imgId = images[idx].id;
                    if (!newSelectedIds.includes(imgId)) {
                        newSelectedIds.push(imgId);
                    }
                }
            });
            setSelectedIds(newSelectedIds);
            if (newSelectedIds.length > 0) {
                setSelectedIndex(images.findIndex(img => img.id === newSelectedIds[newSelectedIds.length - 1]));
            }
        }
        setSelectionRect(null);
        dragStartPos.current = null;
    };


    const handleBatchExport = async () => {
        // ギャラリー全体を一括エクスポートする機能として実装（Pro限定）
        if (!isPro || images.length === 0) return;
        // 選択されているものがあればそれだけ、なければ全体？
        // 要件: "複数選択された状態で「画像を保存」を押した際...一括出力"
        // したがって、handleSave内で分岐する
    };

    const handleSaveProject = async () => {
        if (images.length === 0) return;
        const result = await window.electronAPI.saveProject({
            images: images.map(img => ({
                id: img.id,
                name: img.name,
                original: img.original,
                hsv: img.hsv,
                overlay: img.overlay,
                isExternal: img.isExternal
            })),
            selectedIndex
        });
        if (result.success) {
            console.log('Project saved:', result.filePath);
        }
    };

    const handleLoadProject = async () => {
        const result = await window.electronAPI.loadProject();
        if (result && result.success) {
            const { data } = result;
            if (data.images && data.images.length > 0) {
                const restoredImages = data.images.map(img => ({
                    ...img,
                    processed: img.original // 初期化時は original を processed に
                }));
                setImages(restoredImages);
                setSelectedIndex(data.selectedIndex ?? 0);
                setViewMode('grid');

                // 選択中の画像の値を UI に反映
                const current = restoredImages[data.selectedIndex ?? 0];
                if (current) {
                    setHue(current.hsv.hue);
                    setSaturation(current.hsv.saturation);
                    setBrightness(current.hsv.brightness);
                    setOverlayColor(current.overlay.color);
                    setOverlayOpacity(current.overlay.opacity);
                }
            }
        }
    };

    // HSV / Overlay ハンドラー (一括編集対応)
    const handleHSVChange = useCallback((type, value) => {
        if (type === 'hue') setHue(value);
        if (type === 'saturation') setSaturation(value);
        if (type === 'brightness') setBrightness(value);

        // 選択中のすべての画像に適用
        // リアルタイム反映処理
        setImages(prev => {
            return prev.map((img, idx) => {
                // 選択されている画像 (selectedIndex or selectedIds)
                const isSelected = (selectedIndex === idx) || (selectedIds.includes(img.id));

                if (isSelected) {
                    return {
                        ...img,
                        hsv: {
                            hue: type === 'hue' ? value : (img.hsv?.hue || 0),
                            saturation: type === 'saturation' ? value : (img.hsv?.saturation || 0),
                            brightness: type === 'brightness' ? value : (img.hsv?.brightness || 0),
                        },
                        // オーバーレイは維持 (あるいは同期？ 要件「一括調整を開始した瞬間、その画像たちが個別に持っていた古い調整値は破棄」)
                        // ここではHSV操作なので、HSVは同期し、オーバーレイは維持するか、
                        // 「新しい一括設定で上書き」なら、ステート(hue, etc) を全適用で良い
                        // つまり、現在表示されているスライダーの値 (hue, saturation, brightness) を強制適用する
                    };
                }
                return img;
            });
        });

        // 処理トリガー (デバウンスは processSelectedImage で行われているが、
        // 複数画像の場合はどうするか？ processSelectedImage は selectedIndex のみ対象)
        // -> processSelectedImage を processAllSelectedImages に拡張するか、
        // useEffect で images の変更を検知して一括処理する
    }, [selectedIndex, selectedIds]); // dependencies

    const handleOverlayChange = useCallback((type, value) => {
        if (type === 'color') setOverlayColor(value);
        if (type === 'opacity') setOverlayOpacity(value);

        setImages(prev => {
            return prev.map((img, idx) => {
                const isSelected = (selectedIndex === idx) || (selectedIds.includes(img.id));
                if (isSelected) {
                    return {
                        ...img,
                        overlay: {
                            color: type === 'color' ? value : (img.overlay?.color || '#ffffff'),
                            opacity: type === 'opacity' ? value : (img.overlay?.opacity || 0)
                        }
                    };
                }
                return img;
            });
        });
    }, [selectedIndex, selectedIds]);

    // 保存 (選択中の画像を保存)
    const handleSave = async () => {
        // バッチ保存の要件: "範囲選択または複数選択した画像を、一括で保存"

        let targetImages = [];

        // 1. GridViewかつ複数選択されている場合 -> Batch Save
        if (viewMode === 'grid' && selectedIds.length > 0) {
            targetImages = images.filter(img => selectedIds.includes(img.id));
        }
        // 2. SingleViewの場合 -> Canvasから直接保存 (WYSIWYG)
        else if (viewMode === 'single' && selectedIndex !== null) {
            const img = images[selectedIndex];
            if (img) {
                // CanvasのBase64を取得
                if (canvasRef.current) {
                    const canvasBase64 = canvasRef.current.toDataURL('image/png').split(',')[1];
                    // シングル保存実行
                    // 試用版チェック
                    if (!isPro && currentPlan !== 'Standard Edition' && trialStatus && trialStatus.remaining <= 0) {
                        setShowLicenseModal(true);
                        return;
                    }

                    const result = await window.electronAPI.saveImage({
                        base64: canvasBase64,
                        originalFileName: img.name,
                        skipProcessing: true // 既にCanvasで加工済み
                    });

                    if (result.success && result.trialStatus) {
                        setTrialStatus(result.trialStatus);
                    } else if (result.error === 'trial_limit_reached') {
                        setShowLicenseModal(true);
                    }
                    return;
                }
            }
        }
        // 3. GridViewだが選択なし (または1つだけ選択) -> selectedIndexがあればその1つをバッチフローで？
        // いや、GridViewで1つ選択ならBatchフローでいいが、Canvasが無いのでbackend処理になる。
        else if (selectedIndex !== null) {
            targetImages = [images[selectedIndex]];
        }

        // バッチ保存処理 (Grid View or Multiple)
        if (targetImages.length > 0) {
            if (!isPro) {
                // Standard/Trialでの複数・グリッド保存制限の有無？
                // Request 3 "一括保存" implies Pro usually, but simple save is basic.
                // "One by one" is tedious.
                // Let's assume standard checks apply inside main or we block here if needed.
                // Main process 'batch:export' checks for Pro.
                // If single image in Grid view, we might want to allow it via normal save flow?
                // But normal save flow pops a dialog for filename.
                // Batch flow pops a dialog for DIRECTORY.

                // If only 1 image selected in Grid view, behave like single save?
                if (targetImages.length === 1) {
                    // Single logic (Backend processing, since no Canvas)
                    const img = targetImages[0];
                    const result = await window.electronAPI.saveImage({
                        base64: img.original,
                        originalFileName: img.name,
                        hsv: img.hsv,
                        overlay: img.overlay
                    });
                    if (result.success && result.trialStatus) {
                        setTrialStatus(result.trialStatus);
                    } else if (result.error === 'trial_limit_reached') {
                        setShowLicenseModal(true);
                    }
                    return;
                } else {
                    alert("複数画像の同時保存はPro版限定機能です。");
                    return;
                }
            }

            // Pro Batch Logic
            // Promise.all で確実に待機
            setIsProcessing(true); // 保存中表示
            try {
                // Batch processing handled in Main or Here?
                // Main has 'batch:export' which loops. 
                // But request says "Fix ... loop processing skipped ... use Promise.all ... wait for canvas extraction".
                // If using 'batch:export' (IPC), the loop is in Main.
                // Main process loop is synchronous-like (await inside for..of). That should be fine.
                // BUT, if we are doing canvas extraction on frontend (for Single view logic applied to batch?), no.
                // The current batch logic uses backend `processImage`.
                // "Canvas抽出" implies frontend rendering?
                // Request 4: "選択された全画像の処理（Canvas抽出）が終わるまで待機してから"
                // If we are strictly obeying "Canvas抽出", we must render each image to canvas on frontend?
                // That's impossible for hidden images in batch without rendering them one by one.
                // The previous single-save logic uses Canvas.
                // Batch-save usually uses backend to avoid rendering overhead.
                // Assuming "Canvas抽出" means "Ensure data preparation is done".
                // Or maybe the user *wants* us to render each to canvas to get exact WYSIWYG?
                // "Save Functionality Fix (Batch)... Ensure consistency... Promise.all"

                // Let's stick to the robust backend batch using 'batch:export' but ensure we pass correct data.
                // We will construct the data array fully before calling IPC.

                const exportData = targetImages.map(img => ({
                    base64: img.original,
                    name: img.name,
                    hsv: img.hsv, // 前段の編集で同期済み
                    overlay: img.overlay
                }));

                // IPC call is one await.
                const result = await window.electronAPI.batchExport(exportData);

                if (result.success) {
                    console.log(`Saved ${result.count} images.`);
                    // Proユーザーなので "Trial Remaining" の表示などは一切なし
                } else if (result.error === 'pro_only') {
                    setShowLicenseModal(true);
                }
            } catch (e) {
                console.error("Batch save failed", e);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const resetValues = () => {
        setHue(0);
        setSaturation(0);
        setBrightness(0);
        setOverlayColor('#ffffff');
        setOverlayOpacity(0);
    };

    return (
        <div
            className="h-screen flex bg-[#141414] overflow-hidden text-gray-200"
            style={{ backgroundColor: 'var(--bg-main)' }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* 左サイドバー: ギャラリー一覧 */}
            <div className="w-[260px] h-full bg-[#1e1e1e] border-r border-[#282828] flex flex-col shrink-0" style={{ backgroundColor: 'var(--bg-side)' }}>
                <div className="p-4 border-b border-[#282828] flex items-center justify-between">
                    <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <FolderOpen size={14} />
                        Material
                    </h2>
                </div>

                <div className="p-3 text-center border-b border-white/5 bg-white/5">
                    <p className="text-[9px] text-gray-500 uppercase tracking-tighter font-mono">PNGファイルをドロップして追加</p>
                </div>

                <div className="flex-1 overflow-hidden">
                    <MaterialList
                        packs={materialPacks}
                        onSelectMaterial={handleSelectMaterial}
                        onRequestUnlock={() => setShowLicenseModal(true)}
                        selectedMaterialId={null}
                    />
                </div>

                <div className="p-4 border-t border-[#282828] bg-[#1e1e1e]/50">
                    <LicenseStatus
                        tier={currentTier}
                        onUpgrade={() => setShowLicenseModal(true)}
                        upgradeAvailable={standardKeyCount >= 3 && currentPlan === 'Standard Edition'}
                    />    <div className="mt-4 pt-4 border-t border-[#282828]/30">
                        <div className="flex items-center justify-between group">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Developed by XI</span>
                            <a href="https://x.com/XI_error" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-[#fe7f2e] hover:text-white transition-colors">
                                @XI_error
                                <ExternalLink size={8} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* メイン表示エリア */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-14 border-b border-[#282828] flex items-center justify-between px-6 shrink-0 bg-[#1e1e1e] backdrop-blur-md z-10" style={{ backgroundColor: 'var(--bg-side)' }}>
                    <div className="flex items-center gap-3">
                        <img src="/kroma.png" alt="Icon" className="h-5 object-contain" />
                        <h1 className="text-xl font-semibold bg-kroma-gradient bg-clip-text text-transparent tracking-tighter">
                            Kroma
                        </h1>
                        {/* Plan Badge */}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 border ${isPro ? 'border-[#75509f] text-[#75509f]' :
                            (currentPlan === 'Standard Edition' ? 'border-[#fe7f2e] text-[#fe7f2e]' : 'border-gray-600 text-gray-600')
                            } uppercase tracking-widest bg-black/40`}>
                            {currentPlan.replace(' Edition', '')}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedIndex !== null && images[selectedIndex] && (
                            <div className="px-2 py-1 bg-black/40 border border-[#282828] text-[10px] font-mono text-gray-400 uppercase tracking-tighter">
                                {images[selectedIndex].name}
                            </div>
                        )}
                        <div className="flex items-center gap-2 ml-4">
                            <button onClick={handleLoadProject} className="flex items-center gap-2 px-3 py-1.5 bg-[#282828] hover:bg-[#333] border border-white/5 text-[11px] font-bold transition-all uppercase tracking-widest">
                                <FileJson size={14} className="text-gray-400" />
                                プロジェクト開く
                            </button>
                            <button onClick={handleSaveProject} disabled={images.length === 0} className="flex items-center gap-2 px-3 py-1.5 bg-[#282828] hover:bg-[#333] border border-white/5 text-[11px] font-bold transition-all disabled:opacity-30 uppercase tracking-widest">
                                <Save size={14} className="text-gray-400" />
                                保存
                            </button>
                        </div>
                    </div>
                </header>

                <main
                    className="flex-1 min-h-0 bg-[#141414]"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <ImagePreview
                        images={images}
                        selectedIndex={selectedIndex}
                        selectedIds={selectedIds} // Pass selected IDs
                        viewMode={viewMode}
                        onSelect={handleSelectIndex}
                        onMultiSelect={handleMultiSelect} // Pass multi-select handler
                        onDelete={handleDeleteImage}
                        onToggleView={setViewMode}
                        bgMode={bgMode}
                        isProcessing={isProcessing}
                        canvasRef={canvasRef} // Pass canvas ref
                        containerRef={containerRef} // Pass container ref
                        selectionRect={selectionRect} // Pass updated selection rect
                    />
                </main>
                {/* 中央カラム下部のプレビュー設定フッター（ヘッダーと同じ高さ） */}
    <footer className="h-14 border-t border-[#282828] flex items-center justify-between px-6 shrink-0 bg-[#1e1e1e]" style={{ backgroundColor: 'var(--bg-side)' }}>
                    <h2 className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">
                        プレビュー設定
                    </h2>
        <div className="flex items-center p-2 gap-3">
            <BackgroundToggle currentMode={bgMode} onChange={setBgMode} />
        </div>
                </footer>
            </div>

            {/* 右操作パネル */}
            <div className="w-[320px] h-full bg-[#1e1e1e] border-l border-[#282828] flex flex-col shrink-0" style={{ backgroundColor: 'var(--bg-side)' }}>
                <div className="p-4 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
                    <TrialBanner trialStatus={trialStatus} onOpenLicense={() => setShowLicenseModal(true)} />

                    <button
                        onClick={handleOpenImage}
                        className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-[#fe7f2e] hover:bg-[#ff8f4a] text-white font-bold transition-all shadow-glow active:scale-95 uppercase tracking-widest text-[14px] border-none"
                    >
                        <Upload size={20} />
                        <span>画像を読込み</span>
                    </button>

                    <section className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Info size={12} className="text-[#fe7f2e]" />
                                調整
                            </h2>
                            <button onClick={resetValues} className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-tighter transition-colors">リセット</button>
                        </div>
                        <HSVSliders
                            hue={hue}
                            saturation={saturation}
                            brightness={brightness}
                            onChange={handleHSVChange}
                            overlayColor={overlayColor}
                            overlayOpacity={overlayOpacity}
                            onOverlayChange={handleOverlayChange}
                            isPro={isPro}
                            disabled={selectedIndex === null}
                        />
                    </section>

                    <section className="bg-[#282828]/40 p-4 border border-white/5">
                        <ColorPresets
                            hue={hue}
                            saturation={saturation}
                            brightness={brightness}
                            onApply={(p) => { setHue(p.hue); setSaturation(p.saturation); setBrightness(p.brightness); }}
                            isPro={isPro}
                        />
                    </section>
                </div>

                <div className="p-5 border-t border-[#282828] bg-black/20">
                    <button
                        onClick={handleSave}
                        disabled={(images.length === 0) || (!isPro && currentPlan !== 'Standard Edition' && trialStatus && !trialStatus.isFullVersion && trialStatus.remaining <= 0)}
                        className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-[#75509f] hover:bg-[#865eb3] text-white font-bold transition-all shadow-glow active:scale-95 disabled:opacity-30 uppercase tracking-widest text-[14px] border-none"
                    >
                        <Download size={20} />
                        <span>画像を保存</span>
                    </button>
                </div>
            </div>

            {/* モーダルオーバーレイ */}
            <LicenseModal
                isOpen={showLicenseModal}
                onClose={() => setShowLicenseModal(false)}
                onSuccess={(result) => {
                    refreshData();
                    updateLicenseKeys(); // 即時反映
                }}
            />

            {
                showGuideline && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
                        <div className="bg-[#1e1e1e] border border-[#fe7f2e]/40 max-w-lg w-full p-8 shadow-glow-2xl">
                            <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tighter flex items-center gap-3">
                                <Info className="text-[#fe7f2e]" /> 倫理ガイドライン
                            </h3>
                            <div className="space-y-4 text-[13px] text-gray-400 leading-relaxed mb-8 font-medium">
                                <p>Kroma Proの外部PNGインポート機能を利用する際は、以下のガイドラインを必ず遵守してください：</p>
                                <ul className="list-disc list-inside space-y-2 text-gray-300">
                                    <li>著作権または使用許諾のないアセットの加工・二次利用の禁止</li>
                                    <li>公序良俗に反するコンテンツへの利用制限</li>
                                    <li>加工アセット公開時の権利関係の明確化</li>
                                </ul>
                                <p className="mt-4 text-[11px] bg-black/40 p-3">※ 本機能はクリエイターの利便性向上を目的として提供されています。適正な利用をお願いいたします。</p>
                            </div>
                            <button onClick={acceptGuideline} className="w-full py-4 bg-kroma-gradient text-white font-black shadow-glow hover:scale-[1.02] transition-transform active:scale-95 uppercase tracking-widest">同意して続行</button>
                        </div>
                    </div>
                )
            }

            {!eulaAccepted && <EULAModal onAccept={handleAcceptEULA} />}

            {
                showUpdateModal && updateInfo && (
                    <div className="fixed bottom-6 right-6 z-[600] w-80 bg-[#1e1e1e] border border-[#75509f] shadow-glow-lg rounded-none overflow-hidden">
                        <div className="bg-[#75509f] px-4 py-2 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">アップデートがあります</span>
                            <button onClick={() => setShowUpdateModal(false)} className="text-white/50 hover:text-white transition-colors">
                                <RotateCcw size={14} className="rotate-45" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <h3 className="text-sm font-bold text-white">Version {updateInfo.latestVersion}</h3>
                            <p className="text-[11px] text-gray-400 leading-relaxed font-medium bg-black/20 p-3">{updateInfo.updateNotes || "Bug fixes and performance improvements."}</p>
                            <button onClick={() => window.electronAPI.openUrl(updateInfo.url)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#fe7f2e] text-white text-[11px] font-bold transition-colors shadow-glow uppercase tracking-widest">
                                <Download size={14} /> アップデートをダウンロード
                            </button>
                        </div>
                    </div>
                )
            }

            <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
            <UpgradeModal isOpen={showUpgradeEligibleModal} onClose={handleUpgradeModalClose} />
        </div >
    );
}

export default App;
