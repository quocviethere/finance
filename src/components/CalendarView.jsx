import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { format, isSameDay } from 'date-fns';
import './CalendarView.css';

function CalendarView() {
  const [value, setValue] = useState(new Date());
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'transactions'), (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const dailyTransactions = transactions.filter((tx) => isSameDay(tx.date.toDate(), value));
  const incomeTotal = dailyTransactions.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expenseTotal = dailyTransactions.filter((t) => (t.type || 'expense') === 'expense').reduce((a, t) => a + t.amount, 0);

  return (
    <div className="calendar-view">
      <Calendar onChange={setValue} value={value} locale="vi-VN" />
      <div className="day-summary">
        <h3>Transactions on {format(value, 'yyyy-MM-dd')}</h3>
        <p>Income: {incomeTotal.toLocaleString('vi-VN')} VND</p>
        <p>Expense: {expenseTotal.toLocaleString('vi-VN')} VND</p>
        <ul>
          {dailyTransactions.map((tx) => (
            <li key={tx.id}>
              {tx.description} - {tx.amount.toLocaleString('vi-VN')} ({tx.category})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default CalendarView; 