import { motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

export default function Maintenance() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050B14] text-white p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center bg-[#131B2F] p-8 rounded-2xl border border-gray-800 shadow-2xl max-w-sm"
      >
        <AlertTriangle className="mx-auto text-yellow-500 mb-4" size={48} />
        <h1 className="text-2xl font-bold mb-2">Maintenance Mode</h1>
        <p className="text-gray-400">We are currently performing scheduled maintenance. Please check back later.</p>
      </motion.div>
    </div>
  );
}
