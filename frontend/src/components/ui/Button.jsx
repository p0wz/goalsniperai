import { motion } from 'framer-motion';

const variants = {
    primary: 'gradient-bg text-white font-semibold shadow-sm hover:shadow-accent hover:-translate-y-0.5 hover:brightness-110',
    secondary: 'bg-transparent border border-border text-foreground hover:bg-muted hover:border-accent/30',
    ghost: 'bg-transparent text-muted-foreground hover:text-foreground',
};

const sizes = {
    default: 'h-12 px-6 text-sm',
    lg: 'h-14 px-8 text-base',
    sm: 'h-10 px-4 text-sm',
};

export function Button({
    children,
    variant = 'primary',
    size = 'default',
    className = '',
    asChild = false,
    ...props
}) {
    const Component = asChild ? 'span' : motion.button;

    return (
        <Component
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-medium
        transition-all duration-200 cursor-pointer btn-ripple
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
            {...props}
        >
            {children}
        </Component>
    );
}
