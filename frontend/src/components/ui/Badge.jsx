const Badge = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
        success: 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]',
        danger: 'bg-[var(--accent-red)]/20 text-[var(--accent-red)]',
        warning: 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]',
        info: 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]',
        premium: 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]'
    };

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};

export default Badge;
