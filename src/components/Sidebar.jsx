import React, { useState, useEffect } from 'react';
import { FiHome, FiList, FiPieChart, FiCalendar, FiPlus, FiUser, FiSettings, FiLogOut, FiEdit2, FiTrash2, FiCheck, FiX, FiCreditCard } from 'react-icons/fi';
import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';

export default function Sidebar({ onNav, currentView, onQuickAdd }) {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [balance, setBalance] = useState({ total: 0, cash: 0, bank: 0 });
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState({ total: 0, cash: 0, bank: 0 });

  // Fetch items from Firestore on mount and listen for changes
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'wishlist'), (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // Fetch balance summary from Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'sidebarBalance', 'summary'), (snap) => {
      if (snap.exists()) {
        setBalance(snap.data());
        if (!editingBalance) setBalanceDraft(snap.data());
      }
    });
    return () => unsub();
  }, [editingBalance]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (newItem.trim()) {
      await addDoc(collection(db, 'wishlist'), { text: newItem.trim(), checked: false });
      setNewItem('');
    }
  };
  const handleCheck = async (idx) => {
    const item = items[idx];
    await updateDoc(doc(db, 'wishlist', item.id), { checked: !item.checked });
  };
  const handleRemove = async (idx) => {
    const item = items[idx];
    await deleteDoc(doc(db, 'wishlist', item.id));
  };
  const handleEdit = (idx) => {
    setEditingIdx(idx);
    setEditingText(items[idx].text);
  };
  const handleEditSave = async (idx) => {
    const item = items[idx];
    await updateDoc(doc(db, 'wishlist', item.id), { text: editingText });
    setEditingIdx(null);
    setEditingText('');
  };
  const handleEditCancel = () => {
    setEditingIdx(null);
    setEditingText('');
  };

  const handleBalanceEdit = () => {
    setEditingBalance(true);
    setBalanceDraft(balance);
  };
  const handleBalanceChange = (field, value) => {
    setBalanceDraft({ ...balanceDraft, [field]: value });
  };
  const handleBalanceSave = async () => {
    await setDoc(doc(db, 'sidebarBalance', 'summary'), {
      total: Number(balanceDraft.total) || 0,
      cash: Number(balanceDraft.cash) || 0,
      bank: Number(balanceDraft.bank) || 0,
    });
    setEditingBalance(false);
  };
  const handleBalanceCancel = () => {
    setEditingBalance(false);
    setBalanceDraft(balance);
  };

  const lastUpdated = new Date().toLocaleString();

  // Format number to M (million) abbreviation
  const formatMillion = (num) => {
    if (Math.abs(num) >= 1_000_000) {
      return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + 'M';
    }
    if (Math.abs(num) >= 1_000) {
      return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + 'K';
    }
    return num.toLocaleString('vi-VN');
  };

  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: 'rgba(243, 244, 246, 0.6)',
      borderRight: '2px solid rgba(229, 231, 235, 0.5)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Quicksand, sans-serif',
      padding: '1.5rem 1rem',
      boxSizing: 'border-box',
      gap: '2rem',
      overflowY: 'auto',
      maxWidth: '100%',
    }}>
      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={() => onNav('list')} style={{ background: 'none', border: 'none', color: currentView === 'list' ? '#2563eb' : '#334155', fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, padding: 6, borderRadius: 6, cursor: 'pointer' }}><FiList /> Transactions</button>
        <button onClick={() => onNav('stats')} style={{ background: 'none', border: 'none', color: currentView === 'stats' ? '#2563eb' : '#334155', fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, padding: 6, borderRadius: 6, cursor: 'pointer' }}><FiPieChart /> Statistics</button>
        <button onClick={() => onNav('calendar')} style={{ background: 'none', border: 'none', color: currentView === 'calendar' ? '#2563eb' : '#334155', fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, padding: 6, borderRadius: 6, cursor: 'pointer' }}><FiCalendar /> Calendar</button>
      </nav>
      {/* Balance Summary (editable) */}
      <div style={{ background: 'rgba(255,255,255,0.35)', borderRadius: 14, boxShadow: '0 4px 24px 0 rgba(31, 38, 135, 0.10)', border: '1.5px solid rgba(255,255,255,0.25)', padding: '1rem', marginBottom: 8, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
        <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Balance Summary
          {!editingBalance ? (
            <button onClick={handleBalanceEdit} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', marginLeft: 8 }}>Edit</button>
          ) : null}
        </div>
        {!editingBalance ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 18, fontWeight: 700, color: '#16a34a', gap: 6 }}>
              <FiPieChart style={{ fontSize: 18, marginRight: 2 }} /> Total: {formatMillion(balance.total)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: '#2563eb', gap: 6 }}>
              <FiCreditCard style={{ fontSize: 15, marginRight: 2 }} /> Cash: {formatMillion(balance.cash)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: '#334155', gap: 6 }}>
              <FiHome style={{ fontSize: 15, marginRight: 2 }} /> Bank: {formatMillion(balance.bank)}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input type="number" value={balanceDraft.total} onChange={e => handleBalanceChange('total', e.target.value)} placeholder="Total" style={{ fontSize: 14, borderRadius: 6, border: '1px solid #e5e7eb', padding: '0.2rem 0.5rem', marginBottom: 2 }} />
              <input type="number" value={balanceDraft.cash} onChange={e => handleBalanceChange('cash', e.target.value)} placeholder="Cash" style={{ fontSize: 13, borderRadius: 6, border: '1px solid #e5e7eb', padding: '0.2rem 0.5rem', marginBottom: 2 }} />
              <input type="number" value={balanceDraft.bank} onChange={e => handleBalanceChange('bank', e.target.value)} placeholder="Bank" style={{ fontSize: 13, borderRadius: 6, border: '1px solid #e5e7eb', padding: '0.2rem 0.5rem', marginBottom: 2 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={handleBalanceSave} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '0.2rem 0.8rem', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
              <button onClick={handleBalanceCancel} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '0.2rem 0.8rem', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </>
        )}
      </div>
      {/* Quick Add Transaction */}
      <button onClick={onQuickAdd} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 1rem', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 8, cursor: 'pointer' }}><FiPlus /> Add Transaction</button>
      {/* Things I Want to Buy Checklist */}
      <div style={{ background: 'rgba(255,255,255,0.35)', borderRadius: 14, boxShadow: '0 4px 24px 0 rgba(31, 38, 135, 0.10)', border: '1.5px solid rgba(255,255,255,0.25)', padding: '1rem', marginBottom: 8, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
        <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Things I Want to Buy</div>
        <form onSubmit={handleAddItem} style={{ display: 'flex', gap: 6, marginBottom: 10, maxWidth: '100%' }}>
          <input
            type="text"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            placeholder="Add new item..."
            style={{ flex: 1, borderRadius: 6, border: '1px solid #e5e7eb', padding: '0.3rem 0.6rem', fontFamily: 'Quicksand, sans-serif', fontSize: 12, maxWidth: '80%' }}
          />
          <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '0.2rem 0.7rem', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>+</button>
        </form>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', fontSize: 12 }}>
          {items.map((item, idx) => (
            <li key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%', wordBreak: 'break-word' }}>
              <input type="checkbox" checked={item.checked} onChange={() => handleCheck(idx)} style={{ accentColor: '#2563eb' }} />
              {editingIdx === idx ? (
                <>
                  <input
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    style={{ flex: 1, borderRadius: 4, border: '1px solid #e5e7eb', padding: '0.2rem 0.4rem', fontFamily: 'Quicksand, sans-serif', fontSize: 12, maxWidth: '100%' }}
                  />
                  <button onClick={() => handleEditSave(idx)} style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: 16, cursor: 'pointer' }}><FiCheck /></button>
                  <button onClick={handleEditCancel} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 16, cursor: 'pointer' }}><FiX /></button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? '#94a3b8' : '#334155', fontSize: 12, wordBreak: 'break-word', maxWidth: '100%' }}>{item.text}</span>
                  <button onClick={() => handleEdit(idx)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer' }}><FiEdit2 /></button>
                  <button onClick={() => handleRemove(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}><FiTrash2 /></button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
      {/* Profile/Settings/Logout (placeholders) */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button style={{ background: 'none', border: 'none', color: '#334155', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><FiUser /> Profile</button>
        <button style={{ background: 'none', border: 'none', color: '#334155', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><FiSettings /> Settings</button>
        <button style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><FiLogOut /> Logout</button>
      </div>
      {/* Footer: Last updated */}
      <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 18, marginBottom: 2, wordBreak: 'break-word' }}>
        Last updated: {lastUpdated}
      </div>
    </aside>
  );
} 