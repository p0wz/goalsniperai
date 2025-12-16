import clsx from 'clsx';

const NeuCard = ({ children, className, padding = 'p-8', depth = 'extruded' }) => {
    return (
        <div
            className={clsx(
                'bg-base rounded-[32px] transition-all duration-300 ease-out',
                padding,
                depth === 'extruded' && 'shadow-neu-extruded hover:shadow-neu-extruded-hover hover:-translate-y-[2px]',
                depth === 'inset' && 'shadow-neu-inset',
                depth === 'static' && 'shadow-neu-extruded', // No hover effect
                className
            )}
        >
            {children}
        </div>
    );
};

export default NeuCard;
