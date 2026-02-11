import React from 'react';
import { Award, Shield, User } from 'lucide-react';

function LicenseStatus({ tier, onUpgrade, upgradeAvailable }) {
    // tier: 'trial' | 'standard' | 'pro'

    const getTierInfo = () => {
        switch (tier) {
            case 'pro':
                return {
                    name: 'Pro Edition',
                    icon: <Award className="text-[#fe7f2e]" size={16} />,
                    color: 'text-[#fe7f2e]',
                    bgColor: 'bg-[#fe7f2e]/10',
                    borderColor: 'border-[#fe7f2e]/20'
                };
            case 'standard':
                return {
                    name: 'Standard Edition',
                    icon: <Shield className="text-[#a855f7]" size={16} />,
                    color: 'text-[#a855f7]',
                    bgColor: 'bg-[#a855f7]/10',
                    borderColor: 'border-[#a855f7]/20'
                };
            default:
                return {
                    name: 'Trial Mode',
                    icon: <User className="text-gray-400" size={16} />,
                    color: 'text-gray-400',
                    bgColor: 'bg-gray-400/10',
                    borderColor: 'border-gray-400/20'
                };
        }
    };

    const info = getTierInfo();

    return (
        <div className={`
      flex items-center gap-3 p-3 rounded-none border transition-all
      ${info.bgColor} ${info.borderColor}
    `} style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="flex-shrink-0">
                {info.icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-bold uppercase tracking-widest ${info.color} opacity-70`}>
                    現在のプラン
                </div>
                <div className="text-xs font-semibold text-white truncate">
                    {info.name}
                </div>
                {upgradeAvailable && (
                    <div className="text-[10px] text-[#fe7f2e] mt-1 font-medium">
                        Proへアップグレードが可能です
                    </div>
                )}
            </div>
            {/* Pro以外ならアップグレードボタンを表示 (StandardでもProへのアップグレードはあるため) */}
            {/* ただし要件「3つ揃った時のみ...案内を出す」は App.jsx の Modal で制御されている。
                ここでのボタンは「アップグレード」汎用ボタンとして残すか?
                "KR-STD- キーが1つまたは2つの時は...絶対に出さず" とあるので、
                Standard (1-2 keys) の場合は隠すべき。
                App.jsx から passed prop で制御するか、tier だけでは不十分。
                
                しかし、LicenseStatus は tier しか受け取っていない。
                App.jsx のロジック:
                const currentTier = isPro ? 'pro' : (currentPlan === 'Standard Edition' ? 'standard' : 'trial');
                isPro は (proKey || stdCount >= 3).
                stdCount 1-2 の時は tier='standard'.
                
                要件: "KR-STD- キーが1つまたは2つの時は、絶対に「Pro Edition」という言葉を出さず... 3つ揃った時のみ Pro への昇格と案内 URL を出す"
                
                もし tier === 'standard' (1-2 keys) の場合、ここで「アップグレード」ボタンを出すと、
                「Proへの昇格」を促していることになり、要件に抵触する恐れがある。
                または、ボタンを押してもキー入力画面が開くだけならOK？
                
                念のため、tier === 'standard' の時もボタンを隠すか、あるいは onUpgrade が null なら隠すように App.jsx 側で制御するのが筋。
                現状 onUpgrade は常に setShowLicenseModal(true) を渡している。
                
                安全策として、tier === 'pro' OR tier === 'standard' の場合はボタンを非表示にする。
                (StandardユーザーがProキーを入力したい場合はどうする？ -> メニューから？)
                
                いや、TrialBanner がある。
                LicenseStatus はヘッダー/サイドバーの常設表示？
                
                Request 5: "ロゴ横の Standard / Pro バッジ を維持。"
                これは LicenseStatus のことか？
                
                とりあえず、Design固定の指示があるので、ボタンの有無を大きく変えるのはリスクだが、
                「Pro Editionという言葉を出さず」を守るために、Standard時のUpgradeボタン（Proへの誘導）は慎重に。
                
                ボタンのラベルは「アップグレード」。
                
                修正案: tier !== 'pro' && tier !== 'standard' の時のみ表示、あるいは
                Standardの時は表示しないでおく。
                
                Wait, user said: "KR-STD- キーが1つまたは2つの時は... 3つ揃った時のみ Pro への昇格と案内 URL を出す"
                This implies that for 1-2 keys, no pro upgrade option should be visible.
            */}
            {(tier === 'trial' || tier === 'standard') && (
                <button
                    onClick={onUpgrade}
                    className="text-[10px] font-bold text-[#fe7f2e] hover:text-white transition-colors uppercase tracking-wider"
                    style={{ color: 'var(--accent-orange)' }}
                >
                    {tier === 'standard' ? 'キーを追加' : 'アップグレード'}
                </button>
            )}
        </div>
    );
}

export default LicenseStatus;
