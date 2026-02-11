import React from 'react';
import { ShieldAlert, CheckCircle } from 'lucide-react';

function EULAModal({ onAccept }) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6">
            <div className="bg-[#1e1e1e] border border-white/5 rounded-none max-w-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in duration-300" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="bg-kroma-gradient h-2" />

                <div className="p-10">
                    <div className="flex items-center gap-4 mb-8">
                        <img src="/kroma.png" alt="Icon" className="h-10 object-contain" />
                        <div>
                            <h1 className="text-3xl font-semibold bg-kroma-gradient bg-clip-text text-transparent tracking-tighter leading-none">
                                Kroma
                            </h1>
                            <h2 className="text-sm font-bold text-white uppercase tracking-widest mt-1">License Agreement</h2>
                        </div>
                    </div>

                    <div className="space-y-6 text-sm text-gray-400 leading-relaxed max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                        <section>
                            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                                1. 禁止事項 (Prohibited Actions)
                            </h3>
                            <p>本アプリケーション（Kroma）自体の転売、再配布、リバースエンジニアリング、および不適切な改変を一切禁止します。</p>
                        </section>

                        <section>
                            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                                2. 出力画像の取扱い (Handling of Output Assets)
                            </h3>
                            <p>本アプリから加工・出力された画像について、権利者の許可なく「自作発言」をすること、および素材そのものを二次配布・販売を行うことを禁止します。利用にあたっては各素材パックごとの規約に必ず従ってください。</p>
                        </section>

                        <section>
                            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                                3. 免責事項 (Disclaimer)
                            </h3>
                            <p>本アプリケーションの使用により生じたいかなる不利益、損害、トラブルについて、開発者は一切の責任を負いません。すべてユーザーの自己責任において利用するものとします。</p>
                        </section>

                        <div className="p-4 bg-white/5 border border-white/10 rounded-none text-xs text-gray-400">
                            同意ボタンを押すことで、上記のすべての内容に同意したものとみなされます。
                        </div>
                    </div>

                    <div className="mt-10">
                        <button
                            onClick={onAccept}
                            className="w-full flex items-center justify-center gap-3 py-4 bg-kroma-gradient text-white font-black rounded-none hover:scale-[1.02] active:scale-95 transition-all shadow-glow hover:shadow-glow-lg text-lg uppercase tracking-widest"
                        >
                            <CheckCircle size={22} />
                            規約に同意して開始する
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EULAModal;
