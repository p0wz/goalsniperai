import clsx from 'clsx';

const NeuInput = ({ label, type = 'text', value, onChange, placeholder, className, icon }) => {
    return (
        <div className={clsx('flex flex-col gap-2', className)}>
            {label && <label className="text-sm font-bold text-text-muted ml-1">{label}</label>}
            <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center text-text-muted group-focus-within:text-accent transition-colors">
                    {icon}
                </div>
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={clsx(
                        'w-full bg-base text-text-main font-medium rounded-2xl p-4 transition-all duration-300 outline-none',
                        'shadow-neu-inset focus:shadow-neu-inset-deep focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-base',
                        'placeholder:text-text-muted/60',
                        icon && 'pl-12'
                    )}
                />
            </div>
        </div>
    );
};

export default NeuInput;
