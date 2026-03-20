import { useState, useEffect } from 'react';
import { X, Upload, AlertTriangle, CheckCircle2, Shield, Wallet, AlertCircle } from 'lucide-react';

interface BuyCoinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: string;
  onSubmit?: (amount: number, paymentMethod: string, file: File) => void;
  minDeposit?: number;
  paymentMethods?: { name: string; enabled: boolean; details: string; imageUrl?: string }[];
}

export default function BuyCoinsModal({ isOpen, onClose, initialAmount = '', onSubmit, minDeposit = 50, paymentMethods = [] }: BuyCoinsModalProps) {
  const [amount, setAmount] = useState(initialAmount);
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods.filter(m => m.enabled)[0]?.name || '');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(initialAmount);
      setFile(null);
      setError('');
      setIsSubmitting(false);
      if (paymentMethods.length > 0 && !paymentMethod) {
        setPaymentMethod(paymentMethods.filter(m => m.enabled)[0]?.name || paymentMethods[0].name);
      }
    }
  }, [isOpen, initialAmount]); // Only reset when modal opens or initialAmount changes

  if (!isOpen) return null;

  const coins = amount ? parseInt(amount) : 0;
  const isAmountLocked = !!initialAmount;
  const isValid = !!amount && parseInt(amount) >= minDeposit && !!file && !isSubmitting;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseInt(amount) < minDeposit) {
      setError(`Minimum deposit is Rs. ${minDeposit}`);
      return;
    }
    if (!file) {
      setError('PAYMENT PROOF IS REQUIRED - Please select an image file');
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (onSubmit && file) {
        await onSubmit(parseInt(amount), paymentMethod, file);
      }
      onClose();
    } catch (err) {
      setError('Failed to submit purchase. Please try again.');
      setIsSubmitting(false);
    }
  };

  const getPaymentNumber = (method: string) => {
    return paymentMethods.find(m => m.name === method)?.details || '03367392390';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="bg-[#0D0D0D] border border-gray-800 rounded-[2rem] w-full max-w-md max-h-[90vh] overflow-y-auto text-white font-sans animate-in fade-in zoom-in duration-300 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tight">Buy Coins</h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Secure Payment Portal</p>
            </div>
            <button onClick={onClose} disabled={isSubmitting} className={`bg-gray-900 p-2 rounded-full text-gray-400 transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:text-white hover:rotate-90'}`}>
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-gray-500">PKR Amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => !isAmountLocked && setAmount(e.target.value)}
                  readOnly={isAmountLocked}
                  disabled={isSubmitting}
                  className={`w-full bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 text-xl font-black text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all placeholder-gray-700 ${isAmountLocked || isSubmitting ? 'opacity-50 cursor-not-allowed border-yellow-500/30' : ''}`}
                  placeholder="Enter amount"
                />
              </div>
              <p className="text-gray-600 text-[10px] font-bold uppercase tracking-wider mt-2">Minimum deposit: Rs. {minDeposit}</p>
            </div>

            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">You will receive</p>
                <p className="text-2xl font-black text-white">{coins} <span className="text-sm font-bold uppercase tracking-tight text-yellow-500">Coins</span></p>
              </div>
              <div className="bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20">
                <CheckCircle2 size={24} className="text-yellow-500" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-gray-500">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.filter(m => m.enabled).map((method) => (
                  <button
                    key={method.name}
                    onClick={() => setPaymentMethod(method.name)}
                    disabled={isSubmitting}
                    className={`p-4 rounded-2xl border font-black uppercase tracking-tight text-xs transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === method.name 
                        ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                        : 'bg-[#1A1A1A] text-gray-500 border-gray-800 hover:border-gray-700'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {method.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">TRANSFER TO {paymentMethod.toUpperCase()}</p>
                  <p className="text-2xl font-black text-white tracking-[0.1em]">{getPaymentNumber(paymentMethod)}</p>
                </div>
                <Wallet size={32} className="text-gray-700" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-gray-500">
                Payment Proof <span className="text-red-500">*</span>
              </label>
              <div className={`border-2 border-dashed rounded-2xl p-6 transition-all group ${
                file ? 'border-green-500/50 bg-green-500/5' : 'border-gray-800 bg-[#1A1A1A]'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-700'}`}>
                <label className={`flex flex-col items-center justify-center ${isSubmitting ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <Upload size={32} className={`mb-3 transition-transform ${!isSubmitting && 'group-hover:-translate-y-1'} ${file ? 'text-green-400' : 'text-gray-600'}`} />
                  <span className={`text-xs font-black uppercase tracking-tight ${file ? 'text-green-400' : 'text-gray-500'}`}>
                    {file ? file.name : 'Upload Screenshot'}
                  </span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isSubmitting} />
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start">
                <AlertTriangle size={18} className="text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-red-500 text-xs font-bold uppercase tracking-tight leading-relaxed">{error}</p>
              </div>
            )}

            <div className="pt-4 space-y-4">
              <button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
                className={`w-full font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all duration-300 text-sm flex items-center justify-center gap-3 ${
                  isValid && !isSubmitting
                    ? 'bg-green-500 text-black shadow-[0_10px_30px_rgba(34,197,94,0.3)] hover:scale-[1.02] active:scale-[0.98]' 
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  'Submit Purchase'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
