import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InstallBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (PWA installed)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone || 
                           document.referrer.includes('android-app://');
    
    setIsStandalone(isStandaloneMode);

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    
    // Check if previously dismissed
    const dismissed = localStorage.getItem('installBannerDismissed');
    if (dismissed || isStandaloneMode) {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('installBannerDismissed', 'true');
  };

  const handleInstall = () => {
    // Logic to show install instructions or prompt
    // For now, we'll just show an alert or modal instructions
    if (isIOS) {
        alert("To install: Tap the Share button and select 'Add to Home Screen'");
    } else {
        // Trigger PWA install prompt if available, or show instructions
        alert("To install: Tap the menu button (three dots) and select 'Install App' or 'Add to Home Screen'");
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed bottom-4 left-4 right-4 md:top-24 md:bottom-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-[100]"
        >
          <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl p-4 shadow-2xl flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-4 relative z-10">
              <div className="bg-black/20 p-3 rounded-xl">
                <Download className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-black font-black text-lg leading-tight">Install Gamer Zone</h3>
                <p className="text-black/80 text-xs font-bold mt-0.5">Add to your home screen for quick access!</p>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <button 
                onClick={handleInstall}
                className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black/80 transition-colors hidden sm:block"
              >
                Show Instructions
              </button>
              <button 
                onClick={handleDismiss}
                className="bg-black/10 hover:bg-black/20 text-black p-2 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/5 rounded-full blur-2xl pointer-events-none"></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
