import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { format } from 'date-fns';
import './StatsView.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

function aggregateByCategory(transactions) {
  const map = {};
  transactions.forEach((tx) => {
    map[tx.category] = (map[tx.category] || 0) + tx.amount;
  });
  return map;
}

function aggregateByMonth(transactions) {
  const map = {};
  transactions.forEach((tx) => {
    const key = format(tx.date.toDate(), 'yyyy-MM');
    map[key] = (map[key] || 0) + tx.amount;
  });
  return map;
}

function StatsView() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'transactions'), (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Split by type
  const expenseTx = transactions.filter((t) => (t.type || 'expense') === 'expense');
  const incomeTx = transactions.filter((t) => t.type === 'income');

  // Split by wallet (cash/bank)
  const cashIncome = incomeTx.filter(t => (t.wallet || 'cash') === 'cash').reduce((a, t) => a + t.amount, 0);
  const bankIncome = incomeTx.filter(t => (t.wallet || 'cash') === 'bank').reduce((a, t) => a + t.amount, 0);
  const cashExpense = expenseTx.filter(t => (t.wallet || 'cash') === 'cash').reduce((a, t) => a + t.amount, 0);
  const bankExpense = expenseTx.filter(t => (t.wallet || 'cash') === 'bank').reduce((a, t) => a + t.amount, 0);

  const cashBalance = cashIncome - cashExpense;
  const bankBalance = bankIncome - bankExpense;

  // By category (expenses)
  const byCategory = aggregateByCategory(expenseTx);
  // By month (expenses)
  const byMonth = aggregateByMonth(expenseTx);
  // By month (income)
  const byMonthIncome = aggregateByMonth(incomeTx);

  const totalExpense = expenseTx.reduce((a, t) => a + t.amount, 0);
  const totalIncome = incomeTx.reduce((a, t) => a + t.amount, 0);

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

  const barData = {
    labels: Object.keys(byMonth),
    datasets: [
      {
        label: 'VND per month (Expense)',
        data: Object.values(byMonth),
        backgroundColor: '#36A2EB',
      },
    ],
  };

  const barIncomeData = {
    labels: Object.keys(byMonthIncome),
    datasets: [
      {
        label: 'VND per month (Income)',
        data: Object.values(byMonthIncome),
        backgroundColor: '#16a34a',
      },
    ],
  };

  return (
    <div className="stats-view">
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ background: '#f3f4f6', padding: '1.5rem', borderRadius: '10px', minWidth: 180, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h4>Cash Balance</h4>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>{cashBalance.toLocaleString('vi-VN')} VND</div>
        </div>
        <div style={{ background: '#f3f4f6', padding: '1.5rem', borderRadius: '10px', minWidth: 180, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h4>Bank Balance</h4>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>{bankBalance.toLocaleString('vi-VN')} VND</div>
        </div>
      </div>
      <h3>Total Income: {totalIncome.toLocaleString('vi-VN')} VND</h3>
      <h3>Total Expense: {totalExpense.toLocaleString('vi-VN')} VND</h3>
      <h2>Expenses by Category</h2>
      <Pie data={pieData} />
      <h2>Expenses by Month</h2>
      <Bar data={barData} />
      <h2>Income by Month</h2>
      <Bar data={barIncomeData} />
    </div>
  );
}

export default StatsView; 