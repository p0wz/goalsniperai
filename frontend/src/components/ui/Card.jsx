import { motion } from 'framer-motion';

export function Card({
    children,
    className = '',
    hover = true,
    featured = false,
    ...props
}) {
    if (featured) {
        return (
            <div className="rounded-xl bg-gradient-to-br from-accent via-accent-secondary to-accent p-[2px]">
                <motion.div
                    whileHover={hover ? { y: -4 } : undefined}
                    className={`
            h-full w-full rounded-[calc(12px-2px)] bg-card p-6
            transition-shadow duration-300
            ${hover ? 'hover:shadow-xl' : ''}
            ${className}
          `}
                    {...props}
                >
                    {children}
                </motion.div>
            </div>
        );
    }

    return (
        <motion.div
            whileHover={hover ? { y: -4 } : undefined}
            className={`
        bg-card border border-border rounded-xl p-6
        transition-all duration-300 card-hover-gradient
        ${hover ? 'hover:shadow-xl hover:border-muted-foreground/20' : ''}
        ${className}
      `}
            {...props}
        >
            {children}
        </motion.div>
    );
}

export function CardHeader({ children, className = '' }) {
    return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }) {
    return <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }) {
    return <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }) {
    return <div className={className}>{children}</div>;
}
