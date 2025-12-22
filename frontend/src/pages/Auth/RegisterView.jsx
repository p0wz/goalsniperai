import { useState } from 'react';
import { Link } from 'react-router-dom';
import NeuInput from '../../components/ui/NeuInput';
import NeuButton from '../../components/ui/NeuButton';
import NeuCard from '../../components/ui/NeuCard';

export default function RegisterView({ onRegister, error }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [localError, setLocalError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);

        if (!name || !email || !password) {
            setLocalError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setLocalError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await onRegister(name, email, password);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] rounded-full bg-base shadow-neu-extruded opacity-40 blur-2xl animate-float pointer-events-none" />
            <div className="absolute bottom-[20%] right-[10%] w-[250px] h-[250px] rounded-full bg-base shadow-neu-inset opacity-30 blur-3xl pointer-events-none" />

            <NeuCard className="w-full max-w-md bg-base z-10" padding="p-10">
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">🚀</div>
                    <h1 className="text-3xl font-extrabold text-text-main mb-2">Sign Up</h1>
                    <p className="text-text-muted">Ready to meet SENTIO AI?</p>
                </div>

                {(error || localError) && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-400 text-sm font-bold text-center border border-red-500/30">
                        {localError || error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <NeuInput
                        label="Full Name"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        type="text"
                        required
                    />

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
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        required
                    />

                    <NeuInput
                        label="Confirm Password"
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </NeuButton>
                    </div>
                </form>

                <div className="mt-6 text-center text-xs text-text-muted">
                    By signing up you agree to our <a href="#" className="text-accent hover:underline">Terms of Service</a> and <a href="#" className="text-accent hover:underline">Privacy Policy</a>.
                </div>
            </NeuCard>

            <div className="mt-8 text-text-muted text-sm font-medium">
                Already have an account? <Link to="/login" className="text-accent font-bold cursor-pointer hover:underline">Sign In</Link>
            </div>
        </div>
    );
}
