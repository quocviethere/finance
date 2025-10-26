import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { formatISO } from 'date-fns';
import './TransactionForm.css';

const categories = [
  'Food & Drink',
  'Transportation',
  'Housing',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Salary',
  'Other',
];

function TransactionForm() {
  const [amount, setAmount] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [description, setDescription] = useState('');
  const [means, setMeans] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(formatISO(new Date(), { representation: 'date' }));

  const formatNumber = (value) => {
    if (!value) return '';
    const num = value.replace(/,/g, '');
    if (isNaN(num)) return '';
    return parseFloat(num).toLocaleString('en-US');
  };

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(raw)) {
      setRawAmount(raw);
      setAmount(formatNumber(raw));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rawAmount) return;
    try {
      await addDoc(collection(db, 'transactions'), {
        amount: parseFloat(rawAmount),
        description,
        means,
        type,
        category,
        date: Timestamp.fromDate(new Date(date)),
        createdAt: Timestamp.now(),
      });
      setAmount('');
      setRawAmount('');
      setDescription('');
      setMeans('');
    } catch (err) {
      console.error('Error adding transaction', err);
    }
  };

  return (
    <form className="transaction-form" onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9,]*"
        placeholder="Amount (VND)"
        value={amount}
        onChange={handleAmountChange}
        required
        style={{ flex: '1 1 90px', minWidth: 70, maxWidth: 120, background: '#f3f4f6' }}
      />
      <input
        type="text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ flex: '2 1 160px', minWidth: 80, maxWidth: 200, background: '#f3f4f6' }}
      />
      <select
        placeholder="Means"
        value={means}
        onChange={(e) => setMeans(e.target.value)}
        style={{ flex: '0 1 80px', minWidth: 70, maxWidth: 100, background: '#f3f4f6' }}
        required
      >
        <option value="" disabled>Means</option>
        <option value="cash">Cash</option>
        <option value="bank">Bank</option>
      </select>
      <select value={type} onChange={(e) => setType(e.target.value)} style={{ flex: '0 1 80px', minWidth: 70, maxWidth: 100, background: '#f3f4f6' }} required>
        <option value="" disabled>Type</option>
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ flex: '1 1 120px', minWidth: 80, maxWidth: 140, background: '#f3f4f6' }} required>
        <option value="" disabled>Category</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{ flex: '0 1 140px', minWidth: 120, maxWidth: 200, background: '#f3f4f6' }}
      />
      <button type="submit">Add</button>
    </form>
  );
}

export default TransactionForm; 