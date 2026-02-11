import React from 'react';

function ProBadge({ className = '' }) {
    return (
        <span className={`
      inline-flex items-center px-1.5 py-0.5 rounded-none text-[10px] font-black uppercase tracking-wider
      bg-gradient-to-r from-[#75509f] to-[#fe7f2e] text-white shadow-sm shadow-accent/20
      ${className}
    `}>
            Pro
        </span>
    );
}

export default ProBadge;
