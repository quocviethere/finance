import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingDown, Trash2, Edit3, Search, Plus, Download, MessageCircle, Send, X, PiggyBank, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db as exportedDb } from './firebase';

// Currency formatter
const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const DEFAULT_INCOME_CATS = ['Salary', 'Bonus', 'Investments', 'Savings', 'Sales', 'Other (income)'];
const DEFAULT_EXPENSE_CATS = [
  'Food & Dining',
  'Transportation',
  'Housing',
  'Bills',
  'Entertainment',
  'Health',
  'Education',
  'Shopping',
  'Other (expense)',
];

const COLORS = ['#112D4E', '#3F72AF', '#DBE2EF', '#F9F7F7'];

const DEFAULT_SETTINGS = Object.freeze({ savingAmount: null, monthlyBudget: null });
const SETTINGS_STORAGE_KEY = 'vnd-settings';
const LEGACY_SETTINGS_KEYS = Object.freeze({
  savingAmount: 'vnd-saving-amount',
  monthlyBudget: 'vnd-monthly-budget',
});
const SETTINGS_COLLECTION = 'settings';
const SETTINGS_DOC_ID = 'global';

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

function toISO(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISO(d);
}

function classNames(...xs) {
  return xs.filter(Boolean).join(' ');
}

function useTransactions() {
  const [transactionsLS, setTransactionsLS] = useLocalStorage('vnd-finance-tracker', []);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const db = exportedDb || getFirestore();
  const source = db ? 'firestore' : 'local';

  useEffect(() => {
    if (!db) {
      setTransactions(transactionsLS);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({ id: d.id, ...data });
      });
      setTransactions(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const add = async (tx) => {
    if (!db) {
      const item = { ...tx, id: (crypto?.randomUUID?.() || String(Math.random())), createdAt: new Date().toISOString() };
      setTransactionsLS([item, ...transactionsLS]);
      setTransactions([item, ...transactions]);
      return;
    }
    await addDoc(collection(db, 'transactions'), { ...tx, createdAt: serverTimestamp() });
  };

  const remove = async (id) => {
    if (!db) {
      const next = transactions.filter((t) => t.id !== id);
      setTransactionsLS(next);
      setTransactions(next);
      return;
    }
    await deleteDoc(doc(db, 'transactions', id));
  };

  const update = async (id, patch) => {
    if (!db) {
      const next = transactions.map((t) => (t.id === id ? { ...t, ...patch } : t));
      setTransactionsLS(next);
      setTransactions(next);
      return;
    }
    await updateDoc(doc(db, 'transactions', id), patch);
  };

  return { transactions, add, remove, update, loading, source };
}

function useFinanceSettings() {
  const [localSettings, setLocalSettings] = useLocalStorage(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const db = exportedDb || getFirestore();
  const usingFirestore = Boolean(db);
  const [settings, setSettings] = useState(localSettings);
  const [loading, setLoading] = useState(usingFirestore);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const legacySavingsRaw = window.localStorage.getItem(LEGACY_SETTINGS_KEYS.savingAmount);
      const legacyBudgetRaw = window.localStorage.getItem(LEGACY_SETTINGS_KEYS.monthlyBudget);
      if (legacySavingsRaw !== null || legacyBudgetRaw !== null) {
        const migrated = {
          savingAmount: legacySavingsRaw !== null ? JSON.parse(legacySavingsRaw) : null,
          monthlyBudget: legacyBudgetRaw !== null ? JSON.parse(legacyBudgetRaw) : null,
        };
        setLocalSettings(migrated);
        window.localStorage.removeItem(LEGACY_SETTINGS_KEYS.savingAmount);
        window.localStorage.removeItem(LEGACY_SETTINGS_KEYS.monthlyBudget);
      }
    } catch (err) {
      console.warn('Settings migration failed', err);
    }
  }, [setLocalSettings]);

  useEffect(() => {
    if (!usingFirestore) {
      return;
    }

    const ref = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    setLoading(true);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const next = {
            savingAmount: data?.savingAmount ?? null,
            monthlyBudget: data?.monthlyBudget ?? null,
          };
          setSettings(next);
          setLocalSettings(next);
        } else {
          setSettings(DEFAULT_SETTINGS);
          setDoc(ref, { ...DEFAULT_SETTINGS, updatedAt: serverTimestamp() }, { merge: true }).catch((err) =>
            console.error('Failed to initialize settings document', err)
          );
        }
        setLoading(false);
      },
      (error) => {
        console.error('Settings snapshot error', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [usingFirestore, db, setLocalSettings]);

  useEffect(() => {
    if (!usingFirestore) {
      setSettings(localSettings);
      setLoading(false);
    }
  }, [usingFirestore, localSettings]);

  const updateSettings = useCallback(
    async (patch) => {
      let previousSettings = DEFAULT_SETTINGS;
      setSettings((prev) => {
        previousSettings = prev;
        return { ...prev, ...patch };
      });
      setLocalSettings((prev) => ({ ...prev, ...patch }));

      if (!usingFirestore) {
        return;
      }

      const ref = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
      try {
        await setDoc(ref, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
      } catch (err) {
        console.error('Failed to update settings', err);
        setSettings(previousSettings);
        setLocalSettings(previousSettings);
        throw err;
      }
    },
    [db, setLocalSettings, usingFirestore]
  );

  return { settings, updateSettings, loading, source: usingFirestore ? 'firestore' : 'local' };
}

export default function FinanceTrackerApp() {
  const { transactions, add, remove, update, loading, source } = useTransactions();
  const { settings, updateSettings: persistSettings } = useFinanceSettings();

  const [queryText, setQueryText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(toISO(new Date()));
  const [addOpen, setAddOpen] = useState(false);
  const [hoverExport, setHoverExport] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tempSearch, setTempSearch] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [editSavingsOpen, setEditSavingsOpen] = useState(false);
  const [editBudgetOpen, setEditBudgetOpen] = useState(false);

  const savingAmount = settings.savingAmount;
  const monthlyBudget = settings.monthlyBudget;

  const saveSavingAmount = useCallback(
    (value) => persistSettings({ savingAmount: value }),
    [persistSettings]
  );

  const saveMonthlyBudget = useCallback(
    (value) => persistSettings({ monthlyBudget: value }),
    [persistSettings]
  );

  const openSearchPrompt = () => {
    setTempSearch(queryText || '');
    setSearchOpen(true);
  };

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const inType = typeFilter === 'all' || t.type === typeFilter;
      const inCategory = categoryFilter === 'all' || t.category === categoryFilter;
      const inText = !queryText || (t.note || '').toLowerCase().includes(queryText.toLowerCase());
      const inDate = (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate);
      return inType && inCategory && inText && inDate;
    });
  }, [transactions, typeFilter, categoryFilter, queryText, startDate, endDate]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if (isInput) return;
      const key = (e.key || '').toLowerCase();
      // Use Cmd+Shift+N (Mac) or Ctrl+Shift+N (Win/Linux) to avoid reserved Cmd+N/Ctrl+N
      if ((e.metaKey && e.shiftKey && key === 'n') || (e.ctrlKey && e.shiftKey && key === 'n')) {
    e.preventDefault();
        setAddOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const sums = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  }, [filtered]);
  const computedSavings = sums.balance;
  const savings = savingAmount == null ? computedSavings : savingAmount;
  const manualSavings = savingAmount != null;

  const currentMonth = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, []);

  const monthlyExpenses = useMemo(() => {
    const { year, month } = currentMonth;
    return transactions.reduce((total, t) => {
      if (t.type !== 'expense' || !t.date) return total;
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) return total;
      if (d.getFullYear() === year && d.getMonth() === month) {
        return total + Number(t.amount || 0);
      }
      return total;
    }, 0);
  }, [transactions, currentMonth]);

  const budgetIsSet = monthlyBudget != null && monthlyBudget > 0;
  const budgetRemaining = budgetIsSet ? monthlyBudget - monthlyExpenses : null;
  const budgetSpentRatio = budgetIsSet && monthlyBudget > 0 ? Math.min(1, monthlyExpenses / monthlyBudget) : 0;
  const budgetProgressPercent = Math.min(100, Math.max(0, Math.round(budgetSpentRatio * 100)));
  const budgetStatusLabel = budgetIsSet
    ? budgetRemaining >= 0
      ? `${VND.format(Math.max(0, budgetRemaining))} remaining`
      : `${VND.format(Math.abs(budgetRemaining))} over budget`
    : 'Set a budget to start tracking';
  const monthlyExpenseBalance = budgetIsSet ? budgetRemaining : null;
  const monthlyBalanceHighlight = monthlyExpenseBalance != null && monthlyExpenseBalance < 0 ? 'rose' : 'emerald';
  const monthlyBalanceFootnote = budgetIsSet
    ? `${VND.format(monthlyExpenses)} spent of ${VND.format(monthlyBudget)}`
    : 'Set a budget to see remaining amount';

  const chartDaily = useMemo(() => {
    const map = {};
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const d = daysAgo(i);
      dates.push(d);
      map[d] = { date: d, income: 0, expense: 0, net: 0 };
    }
    for (const t of filtered) {
      if (map[t.date]) {
        if (t.type === 'income') map[t.date].income += t.amount;
        else map[t.date].expense += t.amount;
        map[t.date].net = map[t.date].income - map[t.date].expense;
      }
    }
    return dates.map((d) => map[d]);
  }, [filtered]);

  const byCategory = useMemo(() => {
    const agg = {};
    for (const t of filtered) {
      if (t.type !== 'expense') continue;
      const slot = (agg[t.category] ||= { category: t.category, expense: 0 });
      slot.expense += t.amount;
    }
    return Object.values(agg)
      .sort((a, b) => b.expense - a.expense)
      .slice(0, 10);
  }, [filtered]);

  const pieData = useMemo(() => {
    const agg = {};
    for (const t of filtered) {
      if (t.type === 'expense') agg[t.category] = (agg[t.category] || 0) + t.amount;
    }
    return Object.entries(agg).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const exportCSV = () => {
    const header = ['type', 'amount', 'category', 'note', 'date'].join(',');
    const rows = filtered
      .map((t) => [t.type, t.amount, t.category, (t.note || '').replace(/\n/g, ' '), t.date].join(','))
      .join('\n');
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  async function askGemini(question) {
    try {
      setChatLoading(true);
      // Build a concise context from recent filtered transactions
      const recent = filtered
        .slice(0, 50)
        .map((t) => `${t.date} | ${t.type} | ${t.category} | ${VND.format(t.amount)} | ${(t.note || '').slice(0, 60)}`)
        .join('\n');
      const prompt = `${question}\n\nRecent transactions (most recent first):\n${recent}\n\nAnswer briefly.`;
      const endpoint =
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' +
        encodeURIComponent('AIzaSyCKRdC8c0d_99SG3BvyJfhiI7lLsHZY-Lg');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, topK: 40, topP: 0.95, maxOutputTokens: 512 },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data?.error?.message || `HTTP ${res.status}`;
        throw new Error(message);
      }
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p) => p.text).filter(Boolean).join('\n').trim();
      return text || 'Sorry, the model returned an empty result.';
    } catch (e) {
      console.error('Gemini error:', e);
      return `Error: ${e.message || 'request failed'}`;
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #F9F7F7, rgba(219,226,239,0.25))' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'blur(6px)', borderBottom: '1px solid #DBE2EF', background: 'rgba(249,247,247,0.85)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <motion.div initial={{ scale: 0.9, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220 }} style={{ padding: 6, borderRadius: 12, background: '#DBE2EF' }}>
                <Wallet size={20} color="#3F72AF" />
              </motion.div>
              <h1 style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.25, whiteSpace: 'nowrap' }}>VND Finance Tracker</h1>
              <span style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 999, background: '#DBE2EF', color: '#112D4E', fontSize: 11, whiteSpace: 'nowrap' }}>
                {source === 'firestore' ? 'Synced' : 'Local'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <AddTransactionModal onAdd={add} open={addOpen} onOpenChange={setAddOpen} compact />
              <AddExpenseModal onAdd={add} compact />
              <AddSavingModal onAdd={add} compact />
              <AddSalaryModal onAdd={add} compact />
              <button
                title="Edit monthly budget"
                onClick={() => setEditBudgetOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: '#DBE2EF', color: '#112D4E', border: 'none' }}
              >
                <TrendingUp size={16} />
                <span>{budgetIsSet ? 'Edit budget' : 'Set budget'}</span>
              </button>
              <button
                title="Edit savings"
                onClick={() => setEditSavingsOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: '#DBE2EF', color: '#112D4E', border: 'none' }}
              >
                <Edit3 size={16} />
                <span>Edit savings</span>
              </button>
              <button
                onClick={exportCSV}
                onMouseEnter={() => setHoverExport(true)}
                onMouseLeave={() => setHoverExport(false)}
                title="Export CSV"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 8, border: '1px solid #DBE2EF', borderRadius: 12, background: '#F9F7F7', color: '#112D4E' }}
              >
                <Download size={16} />
                <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: hoverExport ? 120 : 0, opacity: hoverExport ? 1 : 0, marginLeft: hoverExport ? 6 : 0, transition: 'max-width 180ms ease, opacity 180ms ease, margin-left 180ms ease' }}>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Filters - single row, full width */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', flexWrap: 'nowrap' }}
              >
                <button
                  onClick={openSearchPrompt}
                  title={queryText ? `Search: ${queryText}` : 'Search transactions'}
                  style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 9999, border: '1px solid #DBE2EF', background: '#F9F7F7', color: '#112D4E', flexShrink: 0 }}
                >
                  <Search size={16} color="#71717a" />
                </button>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{ width: 360, borderRadius: 12, padding: 10, border: '1px solid #DBE2EF', background: '#F9F7F7', flexShrink: 0 }}
                >
                  <option value="all">All</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <CategorySelect value={categoryFilter} onChange={setCategoryFilter} style={{ width: 320, flexShrink: 0 }} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: 160, borderRadius: 12, padding: 10, border: '1px solid #DBE2EF', background: '#F9F7F7', flexShrink: 0 }}
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: 160, borderRadius: 12, padding: 10, border: '1px solid #DBE2EF', background: '#F9F7F7', flexShrink: 0 }}
                />
              </motion.div>

              {/* Search popup */}
              <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Search transactions">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setQueryText(tempSearch);
                    setSearchOpen(false);
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <input
                    autoFocus
                    value={tempSearch}
                    onChange={(e) => setTempSearch(e.target.value)}
                    placeholder="Type to search transactions..."
                    style={{ padding: 10, borderRadius: 8, border: '1px solid #DBE2EF', background: '#F9F7F7' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setTempSearch('');
                        setQueryText('');
                        setSearchOpen(false);
                      }}
                      style={{ padding: '8px 12px', borderRadius: 12, background: '#DBE2EF', color: '#112D4E', border: 'none' }}
                    >
                      Clear
                    </button>
                    <button type="submit" style={{ padding: '8px 12px', borderRadius: 12, background: '#3F72AF', color: '#F9F7F7', border: 'none' }}>
                      Apply
                    </button>
                  </div>
                </form>
              </Modal>

              {/* Stats */}
              <motion.div layout style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <StatCard
                  title="Monthly Expense Budget"
                  value={budgetIsSet ? VND.format(monthlyBudget) : 'Not set'}
                  icon={<TrendingUp size={16} />}
                  highlight="emerald"
                  action={
                    <button
                      type="button"
                      onClick={() => setEditBudgetOpen(true)}
                      style={{ border: 'none', background: 'transparent', color: '#3F72AF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {budgetIsSet ? 'Adjust' : 'Set budget'}
                    </button>
                  }
                  footnote={budgetStatusLabel}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ position: 'relative', height: 8, borderRadius: 999, background: 'rgba(17,45,78,0.08)', overflow: 'hidden' }}>
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: `${budgetIsSet ? budgetProgressPercent : 0}%`,
                          background: budgetRemaining != null && budgetRemaining < 0 ? '#ef4444' : '#3F72AF',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
                      <span>Spent {VND.format(monthlyExpenses)}</span>
                      <span>{budgetIsSet ? `${budgetProgressPercent}%` : '0%'}</span>
                    </div>
                  </div>
                </StatCard>
                <StatCard
                  title="Savings"
                  value={VND.format(savings)}
                  icon={<PiggyBank size={16} />}
                  highlight="indigo"
                  action={
                    <button
                      type="button"
                      onClick={() => setEditSavingsOpen(true)}
                      style={{ border: 'none', background: 'transparent', color: '#3F72AF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                  }
                  footnote={manualSavings ? 'Manual value' : 'Auto from income - expenses'}
                />
                <StatCard title="Expenses" value={VND.format(sums.expense)} icon={<TrendingDown size={16} />} highlight="rose" />
                <StatCard
                  title="Monthly Expense Balance"
                  value={monthlyExpenseBalance != null ? VND.format(monthlyExpenseBalance) : 'Set budget'}
                  icon={<TrendingUp size={16} />}
                  highlight={monthlyBalanceHighlight}
                  footnote={monthlyBalanceFootnote}
                />
              </motion.div>

              {/* Charts */}
              <motion.div layout style={{ display: 'grid', gap: 16, gridTemplateColumns: '2fr 1fr' }}>
                <Card>
                  <div style={{ padding: 16, borderBottom: '1px solid #DBE2EF' }}>
                    <div style={{ fontWeight: 600 }}>30-day cash flow</div>
                  </div>
                  <div style={{ height: 320, padding: 8 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartDaily} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3F72AF" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="#3F72AF" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#112D4E" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="#112D4E" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => VND.format(v).replace('₫', '')} width={80} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => VND.format(Number(v))} />
                        <Legend />
                        <Area type="monotone" dataKey="income" stroke="#3F72AF" fill="url(#gIncome)" name="Income" />
                        <Area type="monotone" dataKey="expense" stroke="#112D4E" fill="url(#gExpense)" name="Expense" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card>
                  <div style={{ padding: 16, borderBottom: '1px solid #DBE2EF' }}>
                    <div style={{ fontWeight: 600 }}>Expense share by category</div>
                  </div>
                  <div style={{ height: 320, padding: 8 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100}>
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => VND.format(Number(v))} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </motion.div>

              <motion.div layout style={{ display: 'grid', gap: 16, gridTemplateColumns: '2fr 1fr' }}>
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #DBE2EF' }}>
                    <div style={{ fontWeight: 600 }}>Transactions</div>
                    <span style={{ padding: '4px 8px', background: '#DBE2EF', color: '#112D4E', borderRadius: 999, fontSize: 12 }}>{filtered.length} records</span>
                  </div>
                  <div style={{ padding: 8 }}>
                    <TransactionTable items={filtered} onDelete={remove} onEdit={update} />
                  </div>
                </Card>

                <Card>
                  <div style={{ padding: 16, borderBottom: '1px solid #DBE2EF' }}>
                    <div style={{ fontWeight: 600 }}>Top categories</div>
                  </div>
                  <div style={{ height: 320, padding: 8 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byCategory} margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => VND.format(v).replace('₫', '')} width={80} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => VND.format(Number(v))} />
                        <Legend />
                        <Bar dataKey="expense" name="Expense" fill="#112D4E" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </motion.div>

              <ChatBubble
                open={chatOpen}
                onToggle={() => setChatOpen((v) => !v)}
                messages={chatMessages}
                input={chatInput}
                setInput={setChatInput}
                loading={chatLoading}
                onSend={async (q) => {
                  setChatMessages((m) => [...m, { role: 'user', text: q }]);
                  setChatInput('');
                  const a = await askGemini(q);
                  setChatMessages((m) => [...m, { role: 'model', text: a }]);
                }}
              />
        </div>
      </main>
      <EditMonthlyBudgetModal
        open={editBudgetOpen}
        onOpenChange={setEditBudgetOpen}
        value={monthlyBudget}
        onSave={saveMonthlyBudget}
        spent={monthlyExpenses}
      />
      <EditSavingModal
        open={editSavingsOpen}
        onOpenChange={setEditSavingsOpen}
        value={savingAmount}
        onSave={saveSavingAmount}
        computedSavings={computedSavings}
      />
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div
      style={{
        border: '1px solid #DBE2EF',
        borderRadius: 16,
        background: '#F9F7F7',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(17,45,78,0.06)',
        ...(style || {}),
      }}
    >
      {children}
    </div>
  );
}

function StatCard({ title, value, icon, highlight, action, footnote, children }) {
  const chipColors =
    highlight === 'indigo'
      ? { bg: 'rgba(63,114,175,0.15)', fg: '#112D4E', accent: '#3F72AF' }
      : highlight === 'emerald'
      ? { bg: 'rgba(16,185,129,0.15)', fg: '#064E3B', accent: '#059669' }
      : highlight === 'rose'
      ? { bg: 'rgba(239,68,68,0.16)', fg: '#7F1D1D', accent: '#ef4444' }
      : { bg: 'rgba(17,45,78,0.15)', fg: '#112D4E', accent: '#112D4E' };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ height: '100%' }}>
      <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ borderRadius: 10, display: 'inline-flex', padding: 6, background: chipColors.bg, color: chipColors.fg }}>{icon}</div>
            {action ? <div style={{ marginLeft: 'auto' }}>{action}</div> : null}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{title}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: chipColors.accent }}>{value}</div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {footnote ? <div style={{ fontSize: 11, color: '#9ca3af' }}>{footnote}</div> : null}
            {children}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      <span style={{ width: 4, height: 4, background: '#112D4E', borderRadius: 999, opacity: 0.6, animation: 'blink 1s infinite 0s' }} />
      <span style={{ width: 4, height: 4, background: '#112D4E', borderRadius: 999, opacity: 0.6, animation: 'blink 1s infinite 0.2s' }} />
      <span style={{ width: 4, height: 4, background: '#112D4E', borderRadius: 999, opacity: 0.6, animation: 'blink 1s infinite 0.4s' }} />
      <style>{`@keyframes blink { 0%, 80%, 100% { opacity: .2 } 40% { opacity: 1 } }`}</style>
    </span>
  );
}

function ChatBubble({ open, onToggle, messages, onSend, input, setInput, loading }) {
  const listRef = useRef(null);
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages, loading]);
  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 2000 }}>
      {open && (
        <div style={{ width: 340, height: 420, background: '#F9F7F7', border: '1px solid #DBE2EF', borderRadius: 16, boxShadow: '0 10px 30px rgba(17,45,78,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: 10, borderBottom: '1px solid #DBE2EF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={18} color="#112D4E" />
              <strong style={{ fontSize: 12 }}>Chat Assistant</strong>
            </div>
            <button onClick={onToggle} style={{ border: 'none', background: 'transparent' }}><X size={16} /></button>
          </div>
          <div ref={listRef} style={{ flex: 1, padding: 10, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {messages.length === 0 && (
              <div style={{ fontSize: 11, color: '#6b7280' }}>Ask about your spending, categories, or recent transactions.</div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#DBE2EF' : '#fff', border: '1px solid #DBE2EF', color: '#112D4E', padding: '6px 8px', borderRadius: 10, maxWidth: '80%', fontSize: 12, lineHeight: 1.4 }}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: '#fff', border: '1px solid #DBE2EF', color: '#112D4E', padding: '6px 8px', borderRadius: 10, maxWidth: '80%', fontSize: 12 }}>
                <TypingDots />
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim() || loading) return;
              onSend(input.trim());
            }}
            style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid #DBE2EF' }}
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question..." style={{ flex: 1, padding: 8, borderRadius: 10, border: '1px solid #DBE2EF', background: '#fff', fontSize: 12 }} />
            <button type="submit" disabled={loading} title="Send" style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid #DBE2EF', background: '#3F72AF', color: '#F9F7F7' }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
      <button onClick={onToggle} title="Chat" style={{ width: 48, height: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9999, border: '1px solid #DBE2EF', background: '#3F72AF', color: '#F9F7F7', boxShadow: '0 6px 16px rgba(17,45,78,0.25)' }}>
        <MessageCircle size={20} />
      </button>
    </div>
  );
}

function CategorySelect({ value, onChange, style }) {
  const all = ['all', ...DEFAULT_INCOME_CATS, ...DEFAULT_EXPENSE_CATS];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ borderRadius: 12, padding: 10, border: '1px solid #DBE2EF', background: '#F9F7F7', ...(style || {}) }}>
      {all.map((c) => (
        <option key={c} value={c}>
          {c === 'all' ? 'All categories' : c}
        </option>
      ))}
    </select>
  );
}

function TransactionTable({ items, onDelete, onEdit }) {
  const [editingId, setEditingId] = useState(null);
  const [buffer, setBuffer] = useState({});

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ maxHeight: 500, overflowY: 'auto', borderRadius: 12, border: '1px solid #DBE2EF', overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead style={{ background: '#DBE2EF' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 12 }}>Date</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Type</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Category</th>
              <th style={{ textAlign: 'right', padding: 12 }}>Amount</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Note</th>
              <th style={{ textAlign: 'right', padding: 12 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {items.map((t) => (
                <motion.tr key={t.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} style={{ borderTop: '1px solid #DBE2EF' }}>
                  <td style={{ padding: 12, whiteSpace: 'nowrap' }}>{t.date}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{ padding: '4px 8px', borderRadius: 999, background: t.type === 'income' ? '#3F72AF' : '#112D4E', color: '#F9F7F7', fontSize: 12 }}>
                      {t.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>{t.category}</td>
                  <td style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>{VND.format(t.amount)}</td>
                  <td style={{ padding: 12, maxWidth: 320 }} title={t.note}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note}</div>
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button title="Edit" onClick={() => { setEditingId(t.id); setBuffer(t); }} style={{ border: 'none', background: 'transparent', padding: 6, borderRadius: 8 }}>
                        <Edit3 size={16} color="#3F72AF" />
                      </button>
                      <button title="Delete" onClick={() => t.id && onDelete(t.id)} style={{ border: 'none', background: 'transparent', padding: 6, borderRadius: 8 }}>
                        <Trash2 size={16} color="#112D4E" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <Modal open={!!editingId} onClose={() => { setEditingId(null); setBuffer({}); }} title="Edit transaction">
        <TxForm
          initial={buffer}
          submitLabel="Save changes"
          onSubmit={(patch) => {
            if (!editingId) return;
            onEdit(editingId, patch);
            setEditingId(null);
            setBuffer({});
          }}
        />
      </Modal>
    </div>
  );
}

function AddTransactionModal({ onAdd, open: controlledOpen, onOpenChange, compact }) {
  const isControlled = typeof controlledOpen === 'boolean' && typeof onOpenChange === 'function';
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;
  const [hoverAddTx, setHoverAddTx] = useState(false);
  return (
    <>
      <button
        title="Add transaction (⌘⇧N)"
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHoverAddTx(true)}
        onMouseLeave={() => setHoverAddTx(false)}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: compact ? 0 : 8, padding: compact ? 8 : '8px 12px', borderRadius: 12, background: '#3F72AF', color: '#F9F7F7', border: 'none' }}
      >
        <Plus size={16} />
        <span
          style={
            compact
              ? { overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: hoverAddTx ? 140 : 0, opacity: hoverAddTx ? 1 : 0, marginLeft: hoverAddTx ? 6 : 0, transition: 'max-width 180ms ease, opacity 180ms ease, margin-left 180ms ease' }
              : { marginLeft: 6 }
          }
        >
          Add transaction
        </span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New transaction">
        <TxForm
          onSubmit={(tx) => {
            onAdd(tx);
            setOpen(false);
          }}
        />
      </Modal>
    </>
  );
}

function AddExpenseModal({ onAdd, compact }) {
  const [open, setOpen] = useState(false);
  const [hoverAddExpense, setHoverAddExpense] = useState(false);
  return (
    <>
      <button
        title="Add expense"
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHoverAddExpense(true)}
        onMouseLeave={() => setHoverAddExpense(false)}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: compact ? 0 : 8, padding: compact ? 8 : '8px 12px', borderRadius: 12, background: '#ef4444', color: '#F9F7F7', border: 'none' }}
      >
        <TrendingDown size={16} />
        <span
          style={
            compact
              ? { overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: hoverAddExpense ? 120 : 0, opacity: hoverAddExpense ? 1 : 0, marginLeft: hoverAddExpense ? 6 : 0, transition: 'max-width 180ms ease, opacity 180ms ease, margin-left 180ms ease' }
              : { marginLeft: 6 }
          }
        >
          Add expense
        </span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add expense">
        <TxForm
          initial={{ type: 'expense', category: DEFAULT_EXPENSE_CATS[0], note: 'Expense', date: toISO(new Date()) }}
          submitLabel="Add expense"
          onSubmit={(tx) => {
            onAdd(tx);
            setOpen(false);
          }}
        />
      </Modal>
    </>
  );
}

function AddSavingModal({ onAdd, compact }) {
  const [open, setOpen] = useState(false);
  const [hoverAddSaving, setHoverAddSaving] = useState(false);
  return (
    <>
      <button
        title="Add saving"
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHoverAddSaving(true)}
        onMouseLeave={() => setHoverAddSaving(false)}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: compact ? 0 : 8, padding: compact ? 8 : '8px 12px', borderRadius: 12, background: '#10b981', color: '#F9F7F7', border: 'none' }}
      >
        <PiggyBank size={16} />
        <span
          style={
            compact
              ? { overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: hoverAddSaving ? 120 : 0, opacity: hoverAddSaving ? 1 : 0, marginLeft: hoverAddSaving ? 6 : 0, transition: 'max-width 180ms ease, opacity 180ms ease, margin-left 180ms ease' }
              : { marginLeft: 6 }
          }
        >
          Add saving
        </span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add saving">
        <TxForm
          initial={{ type: 'income', category: 'Savings', note: 'Savings', date: toISO(new Date()) }}
          submitLabel="Add saving"
          onSubmit={(tx) => {
            onAdd(tx);
            setOpen(false);
          }}
        />
      </Modal>
    </>
  );
}

function EditMonthlyBudgetModal({ open, onOpenChange, value, onSave, spent }) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setInput(value != null ? String(Math.round(value)) : '');
  }, [open, value]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = Number(input);
    if (!Number.isFinite(next) || next < 0) {
      alert('Enter a valid non-negative number');
      return;
    }
    try {
      setSubmitting(true);
      await onSave(next);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save monthly budget', err);
      alert('Could not save the monthly budget. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async () => {
    try {
      setSubmitting(true);
      await onSave(null);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to clear monthly budget', err);
      alert('Could not clear the monthly budget. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title="Edit monthly expense budget">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ fontSize: 13 }}>Monthly budget (VND)</label>
        <input
          inputMode="numeric"
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="e.g., 8000000"
          style={{ padding: 10, borderRadius: 8, border: '1px solid #DBE2EF', background: '#F9F7F7' }}
        />
        <div style={{ fontSize: 12, color: '#6b7280' }}>{input ? VND.format(Number(input)) : ''}</div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>Expenses recorded this month: {VND.format(spent)}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={handleClear} disabled={submitting} style={{ padding: '8px 12px', borderRadius: 12, background: '#DBE2EF', color: '#112D4E', border: 'none', opacity: submitting ? 0.65 : 1 }}>
            Clear budget
          </button>
          <button type="submit" disabled={submitting} style={{ padding: '8px 12px', borderRadius: 12, background: '#3F72AF', color: '#F9F7F7', border: 'none', opacity: submitting ? 0.65 : 1 }}>
            Save budget
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditSavingModal({ open, onOpenChange, value, onSave, computedSavings }) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = value != null ? value : computedSavings;
    setInput(base != null ? String(Math.round(base)) : '');
  }, [open, value, computedSavings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = Number(input);
    if (!Number.isFinite(next) || next < 0) {
      alert('Enter a valid non-negative number');
      return;
    }
    try {
      setSubmitting(true);
      await onSave(next);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save savings amount', err);
      alert('Could not save the savings amount. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    try {
      setSubmitting(true);
      await onSave(null);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to reset savings amount', err);
      alert('Could not reset the savings amount. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title="Edit savings amount">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ fontSize: 13 }}>Savings total (VND)</label>
        <input
          inputMode="numeric"
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="e.g., 15000000"
          style={{ padding: 10, borderRadius: 8, border: '1px solid #DBE2EF', background: '#F9F7F7' }}
        />
        <div style={{ fontSize: 12, color: '#6b7280' }}>{input ? VND.format(Number(input)) : ''}</div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>Automatic value from income - expenses: {VND.format(computedSavings)}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={handleReset} disabled={submitting} style={{ padding: '8px 12px', borderRadius: 12, background: '#DBE2EF', color: '#112D4E', border: 'none', opacity: submitting ? 0.65 : 1 }}>
            Use automatic
          </button>
          <button type="submit" disabled={submitting} style={{ padding: '8px 12px', borderRadius: 12, background: '#3F72AF', color: '#F9F7F7', border: 'none', opacity: submitting ? 0.65 : 1 }}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddSalaryModal({ onAdd, compact }) {
  const [open, setOpen] = useState(false);
  const [hoverAddSalary, setHoverAddSalary] = useState(false);
  return (
    <>
      <button
        title="Add salary"
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHoverAddSalary(true)}
        onMouseLeave={() => setHoverAddSalary(false)}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: compact ? 0 : 8, padding: compact ? 8 : '8px 12px', borderRadius: 12, background: '#112D4E', color: '#F9F7F7', border: 'none' }}
      >
        <Plus size={16} />
        <span
          style={
            compact
              ? { overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: hoverAddSalary ? 100 : 0, opacity: hoverAddSalary ? 1 : 0, marginLeft: hoverAddSalary ? 6 : 0, transition: 'max-width 180ms ease, opacity 180ms ease, margin-left 180ms ease' }
              : { marginLeft: 6 }
          }
        >
          Add salary
        </span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add salary">
        <TxForm
          initial={{ type: 'income', category: 'Salary', note: 'Salary', date: toISO(new Date()) }}
          submitLabel="Add"
          onSubmit={(tx) => {
            onAdd(tx);
            setOpen(false);
          }}
        />
      </Modal>
    </>
  );
}

function TxForm({ initial, onSubmit, submitLabel = 'Add' }) {
  const [type, setType] = useState((initial?.type) || 'expense');
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : '');
  const [category, setCategory] = useState(initial?.category || DEFAULT_EXPENSE_CATS[0]);
  const [note, setNote] = useState(initial?.note || '');
  const [date, setDate] = useState(initial?.date || toISO(new Date()));

  useEffect(() => {
    if (initial?.type) setType(initial.type);
    if (initial?.amount != null) setAmount(String(initial.amount));
    if (initial?.category) setCategory(initial.category);
    if (initial?.note != null) setNote(initial.note);
    if (initial?.date) setDate(initial.date);
  }, [initial]);

  useEffect(() => {
    if (!initial?.category) {
      setCategory(type === 'income' ? DEFAULT_INCOME_CATS[0] : DEFAULT_EXPENSE_CATS[0]);
    }
  }, [type]);

  const categories = type === 'income' ? DEFAULT_INCOME_CATS : DEFAULT_EXPENSE_CATS;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const amt = Number(amount);
        if (!amt || amt <= 0) {
          alert('Invalid amount');
          return;
        }
        const payload = { type, amount: amt, category, note, date };
        onSubmit(payload);
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, border: '1px solid #DBE2EF', borderRadius: 8, overflow: 'hidden' }}>
        <button type="button" onClick={() => setType('income')} style={{ padding: 8, background: type === 'income' ? '#DBE2EF' : '#F9F7F7', border: 'none' }}>
          Income
        </button>
        <button type="button" onClick={() => setType('expense')} style={{ padding: 8, background: type === 'expense' ? '#DBE2EF' : '#F9F7F7', border: 'none' }}>
          Expense
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label>Amount (VND)</label>
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} placeholder="e.g., 250000" style={{ padding: 10, borderRadius: 8, border: '1px solid #DBE2EF', background: '#F9F7F7' }} />
          <div style={{ fontSize: 12, color: '#6b7280' }}>{amount ? VND.format(Number(amount)) : ''}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #DBE2EF', background: '#F9F7F7' }}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #DBE2EF', background: '#F9F7F7' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label>Note</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., Coffee, electricity, bonus..." style={{ padding: 10, borderRadius: 8, border: '1px solid #DBE2EF', background: '#F9F7F7' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
        <button type="submit" style={{ padding: '8px 12px', borderRadius: 12, background: '#3F72AF', color: '#F9F7F7', border: 'none' }}>{submitLabel}</button>
      </div>
    </form>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(92vw, 560px)',
          maxHeight: '90vh',
          background: '#F9F7F7',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(17,45,78,0.15)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #DBE2EF',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 16, borderBottom: '1px solid #DBE2EF', fontWeight: 600, color: '#112D4E' }}>{title}</div>
        <div style={{ padding: 16, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}
