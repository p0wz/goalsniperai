import { useState } from 'react';
import { Link } from 'react-router-dom';
import NeuInput from '../../components/ui/NeuInput';
import NeuButton from '../../components/ui/NeuButton';
import NeuCard from '../../components/ui/NeuCard';

export default function RegisterView({ onRegister, error }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onRegister(name, email, password);
    };

    return (
        <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] rounded-full bg-base shadow-neu-extruded opacity-40 blur-2xl animate-float pointer-events-none" />
            <div className="absolute bottom-[20%] right-[10%] w-[250px] h-[250px] rounded-full bg-base shadow-neu-inset opacity-30 blur-3xl pointer-events-none" />

            <NeuCard className="w-full max-w-md bg-base z-10" padding="p-10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-text-main mb-2">Join the Elite</h1>
                    <p className="text-text-muted">Create your account to start sniping.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-500 text-sm font-bold text-center border border-red-100">
                        {error}
                    </div>
                )}

                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/google`}
                        className="flex-1 py-3 px-4 rounded-xl bg-base shadow-neu-flat hover:shadow-neu-pressed transition-all flex items-center justify-center gap-2 font-bold text-text-main"
                        type="button"
                    >
                        <span className="text-red-500">G</span> Google
                    </button>
                    <button
                        onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/twitter`}
                        className="flex-1 py-3 px-4 rounded-xl bg-base shadow-neu-flat hover:shadow-neu-pressed transition-all flex items-center justify-center gap-2 font-bold text-text-main"
                        type="button"
                    >
                        <span className="text-black dark:text-white">𝕏</span> Twitter
                    </button>
                </div>

                <div className="relative flex items-center mb-6">
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                    <span className="flex-shrink-0 mx-4 text-sm text-text-muted">Or join with email</span>
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <NeuInput
                        label="Full Name"
                        placeholder="Maverick"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        type="text"
                    />

                    <NeuInput
                        label="Email Address"
                        placeholder="maverick@topgun.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                    />

                    <NeuInput
                        label="Password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                    />

                    <div className="pt-4">
                        <NeuButton type="submit" variant="primary" className="w-full py-4 text-lg">
                            Request Access
                        </NeuButton>
                    </div>
                </form>

                <div className="mt-8 text-center text-text-muted text-sm font-medium">
                    Already an agent? <Link to="/login" className="text-accent font-bold cursor-pointer hover:underline">Sign In</Link>
                </div>
            </NeuCard>
        </div>
    );
}
