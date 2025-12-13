const Card = ({ children, className = '', hover = true, glow = false, ...props }) => {
    return (
        <div
            className={`
        bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-6
        ${hover ? 'transition-all duration-300 hover:border-[var(--accent-green)] hover:shadow-[0_0_20px_rgba(0,255,136,0.1)]' : ''}
        ${glow ? 'shadow-[0_0_20px_rgba(0,255,136,0.2)]' : ''}
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
