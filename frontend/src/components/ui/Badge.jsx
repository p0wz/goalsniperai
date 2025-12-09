export function Badge({ children, pulse = false, className = '' }) {
    return (
        <div className={`section-badge ${className}`}>
            <span className={`section-badge-dot ${pulse ? 'pulse-dot' : ''}`} />
            <span className="section-badge-text">{children}</span>
        </div>
    );
}

export function StatusBadge({ children, variant = 'default', className = '' }) {
    const variants = {
        default: 'bg-muted text-muted-foreground',
        accent: 'bg-accent/10 text-accent border border-accent/30',
        success: 'bg-green-500/10 text-green-600 border border-green-500/30',
        warning: 'bg-orange-500/10 text-orange-600 border border-orange-500/30',
    };

    return (
        <span className={`
      inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
      ${variants[variant]}
      ${className}
    `}>
            {children}
        </span>
    );
}
