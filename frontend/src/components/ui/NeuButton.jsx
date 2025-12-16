import clsx from 'clsx';

const NeuButton = ({ children, onClick, variant = 'primary', className, disabled, type = 'button' }) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                'group flex items-center justify-center font-bold text-sm tracking-wide rounded-2xl transition-all duration-300 ease-out active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed',

                // Primary (Accent)
                variant === 'primary' && [
                    'bg-accent text-white shadow-neu-extruded',
                    'hover:bg-accent-light hover:-translate-y-[1px] hover:shadow-neu-extruded-hover',
                    'active:shadow-neu-inset-sm active:translate-y-[1px]'
                ],

                // Secondary (Neumorphic)
                variant === 'secondary' && [
                    'bg-base text-text-main shadow-neu-extruded',
                    'hover:text-accent hover:-translate-y-[1px] hover:shadow-neu-extruded-hover',
                    'active:shadow-neu-inset-sm active:translate-y-[1px]'
                ],

                // Danger
                variant === 'danger' && [
                    'bg-base text-danger shadow-neu-extruded',
                    'hover:bg-red-50 hover:-translate-y-[1px] hover:shadow-neu-extruded-hover',
                    'active:shadow-neu-inset-sm active:translate-y-[1px]'
                ],

                className
            )}
        >
            {children}
        </button>
    );
};

export default NeuButton;
