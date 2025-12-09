export function Input({ className = '', ...props }) {
    return (
        <input
            className={`
        w-full h-12 px-4 bg-transparent border border-border rounded-lg
        text-foreground placeholder:text-muted-foreground/50
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background
        ${className}
      `}
            {...props}
        />
    );
}

export function FormGroup({ children, className = '' }) {
    return <div className={`mb-5 ${className}`}>{children}</div>;
}

export function Label({ children, htmlFor, className = '' }) {
    return (
        <label
            htmlFor={htmlFor}
            className={`block text-sm font-medium text-muted-foreground mb-2 ${className}`}
        >
            {children}
        </label>
    );
}
