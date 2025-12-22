import { useState } from 'react';
import { Link } from 'react-router-dom';
import NeuInput from '../../components/ui/NeuInput';
import NeuButton from '../../components/ui/NeuButton';
import NeuCard from '../../components/ui/NeuCard';

export default function LoginView({ onLogin, error }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) return;
        setLoading(true);
        try {
            await onLogin(email, password);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] rounded-full bg-base shadow-neu-extruded opacity-40 blur-2xl animate-float pointer-events-none" />

            <NeuCard className="w-full max-w-md bg-base z-10" padding="p-10">
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">🤖</div>
                    <h1 className="text-3xl font-extrabold text-text-main mb-2">Sign In</h1>
                    <p className="text-text-muted">Login to access SENTIO AI.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-400 text-sm font-bold text-center border border-red-500/30">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <NeuInput
                        label="Email Address"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        required
                    />

                    <NeuInput
                        label="Password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        required
                    />

                    <div className="pt-4">
                        <NeuButton
                            type="submit"
                            variant="primary"
                            className="w-full py-4 text-lg"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </NeuButton>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <a href="#" className="text-sm font-bold text-text-muted hover:text-accent transition-colors">Forgot Password?</a>
                </div>
            </NeuCard>

            <div className="mt-8 text-text-muted text-sm font-medium">
                Don't have an account? <Link to="/register" className="text-accent font-bold cursor-pointer hover:underline">Sign Up</Link>
            </div>
        </div>
    );
}
