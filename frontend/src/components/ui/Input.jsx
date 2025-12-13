import { forwardRef } from 'react';

const Input = forwardRef(({
    label,
    error,
    icon,
    className = '',
    ...props
}, ref) => {
    return (
        <div className="space-y-1">
            {label && (
                <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                        {icon}
                    </span>
                )}
                <input
                    ref={ref}
                    className={`input ${icon ? 'pl-10' : ''} ${error ? 'border-[var(--accent-red)]' : ''} ${className}`}
                    {...props}
                />
            </div>
            {error && (
                <p className="text-xs text-[var(--accent-red)]">{error}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
