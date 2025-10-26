import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { format, isSameMonth } from 'date-fns';
import './TransactionsList.css';
import { FiEdit, FiTrash2, FiCheck, FiDollarSign, FiTrendingDown, FiCoffee, FiTruck, FiHome, FiZap, FiFilm, FiShoppingBag, FiCreditCard, FiTag, FiDownload, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, PointElement, LinearScale, CategoryScale } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, LineElement, PointElement, LinearScale, CategoryScale);

function TransactionsList() {
  const [transactions, setTransactions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState({ description: '', amount: '', category: '' });

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTransactions(data);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id) => {
    if (confirm('Delete transaction?')) {
      await deleteDoc(doc(db, 'transactions', id));
    }
  };

  const startEdit = (tx) => {
    setEditingId(tx.id);
    setFormState({
      description: tx.description,
      amount: tx.amount,
      category: tx.category,
    });
  };

const handleEditSave = async (id) => {
  await updateDoc(doc(db, 'transactions', id), {
    description: formState.description,
    amount: parseFloat(formState.amount),
    category: formState.category,
  });
  setEditingId(null);
  setFormState({ description: '', amount: '', category: '' });
};

  const handleExportExcel = () => {
    // Prepare data for export
    const data = transactions.map((tx) => ({
      Date: format(tx.date.toDate(), 'yyyy-MM-dd'),
      Description: tx.description,
      Category: tx.category,
      'Amount (VND)': tx.amount,
      Type: tx.type || 'expense',
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    XLSX.writeFile(workbook, 'transactions.xlsx');
  };

  // Calculate total balance
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const totalExpense = transactions.filter(t => (t.type || 'expense') === 'expense').reduce((a, t) => a + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  // Format number to M (million) or K (thousand) abbreviation
  const formatMillion = (num) => {
    if (Math.abs(num) >= 1_000_000) {
      return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + 'M';
    }
    if (Math.abs(num) >= 1_000) {
      return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + 'K';
    }
    return num.toLocaleString('vi-VN');
  };

  // Calculate this month's expense
  const now = new Date();
  const monthExpense = transactions.filter(t => (t.type || 'expense') === 'expense' && isSameMonth(t.date.toDate(), now)).reduce((a, t) => a + t.amount, 0);

  // Icon mapping for categories
  const categoryIcons = {
    'Food & Drink': <FiCoffee style={{ marginRight: 6 }} />,
    'Transportation': <FiTruck style={{ marginRight: 6 }} />,
    'Housing': <FiHome style={{ marginRight: 6 }} />,
    'Utilities': <FiZap style={{ marginRight: 6 }} />,
    'Entertainment': <FiFilm style={{ marginRight: 6 }} />,
    'Shopping': <FiShoppingBag style={{ marginRight: 6 }} />,
    'Salary': <FiCreditCard style={{ marginRight: 6 }} />,
    'Other': <FiTag style={{ marginRight: 6 }} />,
  };

  // Aggregate expenses by category for pie chart
  const expenseTx = transactions.filter((t) => (t.type || 'expense') === 'expense');
  const byCategory = {};
  expenseTx.forEach((tx) => {
    byCategory[tx.category] = (byCategory[tx.category] || 0) + tx.amount;
  });
  const pieData = {
    labels: Object.keys(byCategory),
    datasets: [
      {
        label: 'VND',
        data: Object.values(byCategory),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
      },
    ],
  };

  // Line chart data: expense by date in current month
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthExpenseTx = expenseTx.filter(t => {
    const d = t.date.toDate();
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const byDate = {};
  monthExpenseTx.forEach((tx) => {
    const key = format(tx.date.toDate(), 'yyyy-MM-dd');
    byDate[key] = (byDate[key] || 0) + tx.amount;
  });
  // Fill missing days with 0
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dateLabels = Array.from({ length: daysInMonth }, (_, i) => format(new Date(currentYear, currentMonth, i + 1), 'yyyy-MM-dd'));
  const lineData = {
    labels: dateLabels,
    datasets: [
      {
        label: 'Expense',
        data: dateLabels.map(date => byDate[date] || 0),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
    ],
  };

  // Quotes for the quote tile
  const quotes = [
    'Do not save what is left after spending, but spend what is left after saving.\n- Warren Buffett',
    'It\'s not your salary that makes you rich, it\'s your spending habits.\n- Charles A. Jaffe',
    'Beware of little expenses; a small leak will sink a great ship.\n- Benjamin Franklin',
    'The art is not in making money, but in keeping it.\n- Proverb',
    'A budget is telling your money where to go instead of wondering where it went.\n- Dave Ramsey',
  ];
  const [quoteIdx, setQuoteIdx] = useState(0);
  const handlePrevQuote = () => setQuoteIdx((prev) => (prev === 0 ? quotes.length - 1 : prev - 1));
  const handleNextQuote = () => setQuoteIdx((prev) => (prev === quotes.length - 1 ? 0 : prev + 1));

  return (
    <>
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', alignItems: 'flex-start', width: '100%' }}>
        <div style={{ display: 'flex', gap: '0.25rem', flex: 2, flexDirection: 'column', height: 420 }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {/* Tiles */}
            <div style={{ flex: 1, border: '2px solid #e5e7eb', background: 'none', padding: '1.5rem', borderRadius: '10px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Total Balance</h4>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: totalBalance >= 0 ? '#16a34a' : '#dc2626' }}>
                <FiDollarSign style={{ marginRight: 8, color: totalBalance >= 0 ? '#16a34a' : '#dc2626' }} />
                {formatMillion(totalBalance)}
              </div>
            </div>
            <div style={{ flex: 1, border: '2px solid #e5e7eb', background: 'none', padding: '1.5rem', borderRadius: '10px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Monthly Expense</h4>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: '#dc2626' }}>
                <FiTrendingDown style={{ marginRight: 8, color: '#dc2626' }} />
                {formatMillion(monthExpense)}
              </div>
            </div>
          </div>
          {/* Line chart below tiles */}
          <div style={{ width: '100%', flex: 1, background: 'none', borderRadius: '10px', border: '2px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', marginTop: '1rem', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Expense by Date (This Month)</h4>
            <Line data={lineData} options={{ plugins: { legend: { display: false }, }, scales: { x: { ticks: { maxTicksLimit: 10, font: { family: 'Quicksand, sans-serif' } } }, y: { ticks: { font: { family: 'Quicksand, sans-serif' } } } }, maintainAspectRatio: false, font: { family: 'Quicksand, sans-serif' } }} height={160} />
          </div>
        </div>
        {/* Pie chart */}
        <div style={{ flex: 1, minWidth: 220, maxWidth: 350, height: 420, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ background: 'none', borderRadius: '10px', padding: '2rem 1.5rem', border: '2px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 270, minHeight: 0 }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Expense by Category</h4>
            <Pie data={pieData} options={{ plugins: { legend: { position: 'bottom', labels: { font: { family: 'Quicksand, sans-serif' } } } }, maintainAspectRatio: false, 
              layout: { padding: 0 },
              font: { family: 'Quicksand, sans-serif' },
              elements: { arc: { borderWidth: 2 } },
              animation: false }} height={170} />
          </div>
          <div style={{ background: 'none', borderRadius: '10px', padding: '1.5rem 1rem', border: '2px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 150, minHeight: 0, textAlign: 'center', fontStyle: 'italic', color: '#64748b', fontSize: '0.8rem', gap: 12 }}>
            <button onClick={handlePrevQuote} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', padding: 0, marginRight: 8 }} aria-label="Previous Quote"><FiChevronLeft /></button>
            <span style={{ whiteSpace: 'pre-line', flex: 1 }}>{quotes[quoteIdx]}</span>
            <button onClick={handleNextQuote} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', padding: 0, marginLeft: 8 }} aria-label="Next Quote"><FiChevronRight /></button>
          </div>
        </div>
      </div>
      <div style={{ maxHeight: 350, overflow: 'hidden', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '1rem', position: 'relative' }}>
        <table className="transactions-table" style={{ fontSize: '0.92rem', minWidth: 700, margin: 0 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount (VND)</th>
              <th></th>
              <th style={{ textAlign: 'right' }}>
                <button
                  onClick={handleExportExcel}
                  title="Export as Excel"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    color: '#2563eb',
                    cursor: 'pointer',
                  }}
                >
                  <FiDownload size={16} />
                </button>
              </th>
            </tr>
          </thead>
        </table>
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          <table className="transactions-table" style={{ fontSize: '0.92rem', minWidth: 700, borderTop: 'none', margin: 0 }}>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{format(tx.date.toDate(), 'yyyy-MM-dd')}</td>
                  <td>
                    {editingId === tx.id ? (
                      <input
                        value={formState.description}
                        onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                      />
                    ) : (
                      tx.description
                    )}
                  </td>
                  <td>
                    {editingId === tx.id ? (
                      <input
                        value={formState.category}
                        onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                      />
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        {categoryIcons[tx.category] || null}
                        {tx.category}
                      </span>
                    )}
                  </td>
                  <td style={{ color: tx.type === 'income' ? '#16a34a' : '#dc2626' }}>
                    {editingId === tx.id ? (
                      <input
                        type="number"
                        value={formState.amount}
                        onChange={(e) => setFormState({ ...formState, amount: e.target.value })}
                      />
                    ) : (
                      `${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('vi-VN')}`
                    )}
                  </td>
                  <td>
                    {editingId === tx.id ? (
                      <button onClick={() => handleEditSave(tx.id)}><FiCheck /></button>
                    ) : (
                      <>
                        <button onClick={() => startEdit(tx)}><FiEdit /></button>
                        <button onClick={() => handleDelete(tx.id)}><FiTrash2 /></button>
                      </>
                    )}
                  </td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default TransactionsList; 