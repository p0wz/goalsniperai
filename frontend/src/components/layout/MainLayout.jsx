import Navbar from './Navbar';
import Footer from './Footer';

/**
 * Main Layout Wrapper
 * Handles the unified Navbar and Footer structure for the public/app views.
 */
export default function MainLayout({ children, user, onViewChange, currentView }) {
    return (
        <div className="min-h-screen flex flex-col bg-base text-text-main font-body selection:bg-accent selection:text-white">
            <Navbar user={user} onViewChange={onViewChange} currentView={currentView} />

            <main className="flex-grow pt-24 pb-12">
                {children}
            </main>

            <Footer onNavigate={onViewChange} />
        </div>
    );
}
