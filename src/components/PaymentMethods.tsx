import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Trash2, Plus, Edit2 } from 'lucide-react';

export default function PaymentMethods() {
  const [methods, setMethods] = useState<any[]>([]);
  const [newMethod, setNewMethod] = useState({ name: '', details: '', enabled: true });
  const [editingMethod, setEditingMethod] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'payment_methods'), (snapshot) => {
      setMethods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    if (!newMethod.name || !newMethod.details) return;
    await addDoc(collection(db, 'payment_methods'), newMethod);
    setNewMethod({ name: '', details: '', enabled: true });
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await updateDoc(doc(db, 'payment_methods', id), { enabled: !enabled });
  };

  const handleEdit = async () => {
    if (!editingMethod) return;
    await updateDoc(doc(db, 'payment_methods', editingMethod.id), {
      name: editingMethod.name,
      details: editingMethod.details
    });
    setEditingMethod(null);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'payment_methods', id));
    setDeleteConfirm(null);
  };

  return (
    <div className="p-8 bg-[#0D0D0D] rounded-3xl border border-gray-800 shadow-2xl">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black text-white uppercase tracking-tight">Payment Methods</h2>
        <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">Admin Control</div>
      </div>
      
      <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-gray-800 mb-8">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Add New Method</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input 
            placeholder="Method Name (e.g., JazzCash)" 
            className="bg-[#0D0D0D] p-4 rounded-xl text-white border border-gray-700 focus:ring-2 focus:ring-yellow-500 transition-all"
            value={newMethod.name}
            onChange={e => setNewMethod({...newMethod, name: e.target.value})}
          />
          <input 
            placeholder="Details (e.g., Account Number)" 
            className="bg-[#0D0D0D] p-4 rounded-xl text-white border border-gray-700 focus:ring-2 focus:ring-yellow-500 transition-all"
            value={newMethod.details}
            onChange={e => setNewMethod({...newMethod, details: e.target.value})}
          />
          <button onClick={handleAdd} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest p-4 rounded-xl flex items-center justify-center gap-2 transition-all">
            <Plus size={20} /> Add Method
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {methods.map(method => (
          <div key={method.id} className="bg-[#1A1A1A] p-6 rounded-3xl border border-gray-800 hover:border-gray-700 transition-all flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex justify-between items-start mb-4">
                <p className="text-white font-black text-xl">{method.name}</p>
                <button 
                  onClick={() => handleToggle(method.id, method.enabled)}
                  className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center ${
                    method.enabled ? 'bg-yellow-500 justify-end' : 'bg-gray-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
              </div>
              <p className="text-gray-400 text-sm font-mono bg-[#0D0D0D] p-3 rounded-xl mb-6">{method.details}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingMethod(method)} className="text-gray-600 hover:text-yellow-500 transition-all p-2 rounded-full hover:bg-yellow-500/10">
                <Edit2 size={20} />
              </button>
              <button onClick={() => setDeleteConfirm(method.id)} className="text-gray-600 hover:text-red-500 transition-all p-2 rounded-full hover:bg-red-500/10">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingMethod && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] p-8 rounded-3xl border border-gray-800 w-full max-w-md">
            <h3 className="text-white font-black text-xl mb-6">Edit Method</h3>
            <input 
              className="bg-[#0D0D0D] p-4 rounded-xl text-white border border-gray-700 w-full mb-4"
              value={editingMethod.name}
              onChange={e => setEditingMethod({...editingMethod, name: e.target.value})}
            />
            <input 
              className="bg-[#0D0D0D] p-4 rounded-xl text-white border border-gray-700 w-full mb-6"
              value={editingMethod.details}
              onChange={e => setEditingMethod({...editingMethod, details: e.target.value})}
            />
            <div className="flex gap-4">
              <button onClick={() => setEditingMethod(null)} className="flex-1 bg-gray-700 text-white font-black p-4 rounded-xl uppercase tracking-widest">Cancel</button>
              <button onClick={handleEdit} className="flex-1 bg-yellow-500 text-black font-black p-4 rounded-xl uppercase tracking-widest">Save</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] p-8 rounded-3xl border border-gray-800 w-full max-w-md">
            <h3 className="text-white font-black text-xl mb-4">Delete Method?</h3>
            <p className="text-gray-400 mb-8">Are you sure you want to delete this payment method? This action cannot be undone.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-gray-700 text-white font-black p-4 rounded-xl uppercase tracking-widest">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-500 text-white font-black p-4 rounded-xl uppercase tracking-widest">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
