
import React, { useState, useEffect } from 'react';
import { WithdrawalRequest, WithdrawalStatus } from '../../types';
import { getWithdrawals, updateWithdrawalStatus, getUserById, saveUser, subscribeToChanges } from '../../services/mockDb';
import { Check, X, Clock } from 'lucide-react';

export const AdminWithdrawals: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  const loadData = async () => {
      try {
          const data = await getWithdrawals();
          setWithdrawals(data.reverse());
      } catch (e) {
          console.error("Failed to load withdrawals", e);
      }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToChanges(() => loadData());
    return unsubscribe;
  }, []);

  const handleAction = async (request: WithdrawalRequest, approve: boolean) => {
      if (request.status !== WithdrawalStatus.PENDING) return;
      
      try {
          if (approve) {
              await updateWithdrawalStatus(request.id, WithdrawalStatus.APPROVED);
              // Balance was already deducted pending, so just mark approved
          } else {
              await updateWithdrawalStatus(request.id, WithdrawalStatus.REJECTED);
              // Refund balance
              const user = await getUserById(request.userId);
              if (user) {
                  user.balance += request.amount;
                  await saveUser(user);
              }
          }
      } catch (e) {
          console.error("Action failed", e);
          alert("Failed to update status. Please try again.");
      }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Withdrawal Requests</h1>
      
      <div className="space-y-4">
          {withdrawals.length === 0 ? (
            <p className="text-gray-500">No withdrawal requests found.</p>
          ) : (
            withdrawals.map(req => (
              <div key={req.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                      <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-white">{req.userName}</h3>
                          <span className="text-xs text-gray-500 bg-gray-900 px-2 py-0.5 rounded">{req.method}</span>
                      </div>
                      <p className="text-gray-400 text-sm">Amount: <span className="text-white font-bold">{req.amount}</span></p>
                      <p className="text-gray-500 text-xs">Details: {req.details}</p>
                      <p className="text-gray-600 text-xs mt-1">{new Date(req.date).toLocaleString()}</p>
                  </div>

                  <div className="flex items-center gap-4">
                      {req.status === WithdrawalStatus.PENDING ? (
                          <>
                            <button 
                                onClick={() => handleAction(req, true)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                            >
                                <Check size={16} /> Approve
                            </button>
                            <button 
                                onClick={() => handleAction(req, false)}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                            >
                                <X size={16} /> Reject
                            </button>
                          </>
                      ) : (
                          <span className={`flex items-center gap-1 font-bold ${
                              req.status === WithdrawalStatus.APPROVED ? 'text-green-500' : 'text-red-500'
                          }`}>
                              {req.status === WithdrawalStatus.APPROVED ? <Check size={16} /> : <X size={16} />} 
                              {req.status}
                          </span>
                      )}
                  </div>
              </div>
            ))
          )}
      </div>
    </div>
  );
};
