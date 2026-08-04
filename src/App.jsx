import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Power, Settings, TrendingUp, ShieldCheck, Activity, Key,
  Wallet, PlayCircle, PauseCircle, Terminal, XCircle,
  ChevronDown, ChevronUp, BarChart2, Target
} from 'lucide-react';

const BOT_API_URL = 'https://neighborhood-hydrogen-beverages-bottom.trycloudflare.com';

function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('sinperApiKey') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('sinperApiKey'));

  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWallets, setShowWallets] = useState(false);
  const terminalRef = useRef(null);

  const [config, setConfig] = useState({
    TRADE_SIZE_SOL: '0.1',
    MAX_OPEN_POSITIONS: '5',
    TAKE_PROFIT_MULTIPLIER: '2.0',
    STOP_LOSS_PERCENT: '30',
    TRAILING_STOP_PERCENT: '15',
    AI_SCORE_THRESHOLD: '70',
    PAPER_TRADING: 'true',
    PAPER_BALANCE_SOL: '10',
    SIGNAL_SCORE_THRESHOLD: '30',
    VOLUME_SPIKE_MULTIPLIER: '1.5',
    MIN_LP_BURNED_PERCENT: '80',
    REJECT_HONEYPOT: 'true',
    REJECT_MINTABLE: 'true'
  });

  const apiClient = axios.create({
    baseURL: BOT_API_URL,
    headers: { 'x-api-key': apiKey }
  });

  const fetchStatus = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiClient.get('/status');
      setStatus(res.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      } else {
        setError('Cannot connect to bot. Is it running?');
      }
    }
  };

  // Fix 20: Use SSE for real-time updates instead of polling
  useEffect(() => {
    if (!isAuthenticated) return;

    let es = null;
    let pollInterval = null;

    const connectSSE = () => {
      const url = `${BOT_API_URL}/events?` + new URLSearchParams({ 'x-api-key': apiKey });
      // EventSource doesn't support custom headers; pass key as query param (api.ts accepts both)
      es = new EventSource(url);

      es.onopen = () => {
        setError(null);
        // Clear polling fallback if SSE connects
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setStatus(data);
          setError(null);
        } catch { }
      };

      es.onerror = () => {
        es?.close();
        // Fall back to polling if SSE fails (e.g. proxy doesn't support streaming)
        if (!pollInterval) {
          fetchStatus();
          pollInterval = setInterval(fetchStatus, 3000);
        }
      };
    };

    // Initial status fetch (fast first render)
    fetchStatus().then(() => connectSSE());

    return () => {
      es?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isAuthenticated, apiKey]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [status?.recentLogs]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await axios.get(`${BOT_API_URL}/status`, { headers: { 'x-api-key': apiKey } });
      localStorage.setItem('sinperApiKey', apiKey);
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      alert('Invalid API Key or server offline');
    }
  };

  const logout = () => {
    localStorage.removeItem('sinperApiKey');
    setIsAuthenticated(false);
    setStatus(null);
  };

  // Fix 1: use apiClient.post (not fetchWithAuth)
  const toggleBot = async (action) => {
    try {
      await apiClient.post('/control', { action });
      fetchStatus();
    } catch (err) {
      console.error('toggleBot failed:', err);
    }
  };

  const toggleMode = async (currentIsTestMode) => {
    try {
      await apiClient.post('/settings', { PAPER_TRADING: (!currentIsTestMode).toString() });
      fetchStatus();
    } catch (err) {
      console.error('toggleMode failed:', err);
    }
  };

  const openConfigModal = async () => {
    try {
      const res = await apiClient.get('/settings');
      setConfig(res.data);
    } catch (err) {
      console.error('Failed to load settings', err);
    }
    setIsConfigOpen(true);
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/settings', config);
      alert('Config saved! Restart the bot on the server to apply all changes.');
      setIsConfigOpen(false);
    } catch (err) {
      alert('Failed to save config');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white">
        <div className="bg-[#111827] border border-white/10 p-8 rounded-2xl w-full max-w-sm shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-blue-500/10 border border-blue-500/20">
              <Key className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Login</h2>
          <p className="text-center text-gray-500 text-sm mb-6">Enter your Master API Key to connect</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="API_SECRET_KEY"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition mb-4"
            />
            <button type="submit" className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-lg shadow-blue-500/20 transition">
              Connect to Engine
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white">
        <div className="text-center p-8 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-md w-full relative">
          <button onClick={logout} className="absolute top-4 right-4 text-gray-500 hover:text-white"><XCircle size={20} /></button>
          <ShieldCheck className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-red-400 mb-2">Connection Lost</h2>
          <p className="text-gray-400 text-sm">{error}</p>
          <p className="text-xs text-gray-500 mt-6">Ensure the bot is running on {BOT_API_URL}</p>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const isRunning = status.isRunning;
  const isTestMode = status.isTestMode;
  const stats = status.stats || {};
  const activePositions = status.activePositions || [];
  const tradeHistory = status.tradeHistory || [];
  const walletStats = status.walletStats || { totalWallets: 0, availableWallets: 0, wallets: [] };
  const recentLogs = status.recentLogs || [];

  // Fix 15: computed stats
  const totalSnipes = (stats.totalBondingCurveSnipes || 0) + (stats.totalAmmSnipes || 0);
  const winRate = totalSnipes > 0
    ? ((stats.successfulExits || 0) / totalSnipes * 100).toFixed(1)
    : '0.0';
  const totalPnl = parseFloat(stats.totalPnl || 0);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 font-sans p-6 md:p-10 selection:bg-blue-500/30">

      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="text-blue-500" />
            Sinper-Bot <span className="text-blue-500 font-light">Dashboard</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`}></span>
            {isRunning ? `Live · ${BOT_API_URL}` : `Paused · ${BOT_API_URL}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-end">
          <button
            onClick={() => toggleMode(isTestMode)}
            className={`px-4 py-2.5 rounded-xl border transition flex items-center gap-2 text-sm font-semibold shadow-lg ${isTestMode
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20'
              }`}
          >
            <div className={`w-2 h-2 rounded-full ${isTestMode ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`}></div>
            {isTestMode ? 'Test Mode' : 'Live Mode'}
          </button>
          <button onClick={logout} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm">
            Logout
          </button>
          <button
            onClick={openConfigModal}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center gap-2 text-sm font-medium"
          >
            <Settings size={18} /> Settings
          </button>
          <button
            onClick={() => toggleBot(isRunning ? 'stop' : 'start')}
            className={`px-6 py-2.5 rounded-xl transition flex items-center gap-2 text-sm font-bold shadow-lg ${isRunning
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
          >
            {isRunning ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
            {isRunning ? 'Pause Sniping' : 'Resume Sniping'}
          </button>
        </div>
      </div>

      {/* Stats Grid — Fix 15: added Win Rate + Total Snipes */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          title="Total PnL"
          value={`${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(4)} SOL`}
          icon={<TrendingUp className={totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} />}
          accent={totalPnl >= 0 ? 'emerald' : 'red'}
        />
        <StatCard
          title="Active Positions"
          value={activePositions.length}
          icon={<Activity className="text-blue-400" />}
          accent="blue"
        />
        <StatCard
          title="Rugs Dodged"
          value={stats.rugSkips || 0}
          icon={<ShieldCheck className="text-purple-400" />}
          accent="purple"
        />
        <StatCard
          title={`Wallets · ${parseFloat(walletStats.totalBalance || 0).toFixed(2)} SOL`}
          value={`${walletStats.availableWallets ?? 0} / ${walletStats.totalWallets}`}
          icon={<Wallet className="text-orange-400" />}
          accent="orange"
        />
        <StatCard
          title="Win Rate"
          value={`${winRate}%`}
          icon={<Target className="text-cyan-400" />}
          accent="cyan"
        />
        <StatCard
          title="Total Sniped"
          value={totalSnipes}
          icon={<BarChart2 className="text-indigo-400" />}
          accent="indigo"
        />
      </div>

      {/* Main Grid: Terminal + Positions */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Terminal */}
        <div className="lg:col-span-1 bg-[#111827] border border-white/5 rounded-2xl p-6 flex flex-col h-[500px]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-gray-400" /> Live Terminal
          </h3>
          <div
            ref={terminalRef}
            className="flex-1 bg-black/40 rounded-xl p-4 overflow-y-auto font-mono text-xs text-gray-400 border border-white/5 space-y-1.5"
          >
            {recentLogs.length === 0 ? (
              <p className="text-gray-600 text-center mt-10">Awaiting data...</p>
            ) : (
              recentLogs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${log.level >= 40 ? 'text-rose-400' : log.level === 30 ? 'text-emerald-400' : 'text-gray-400'}`}>
                  <span className="opacity-40 shrink-0">[{new Date(log.time).toLocaleTimeString()}]</span>
                  <span className="break-all">{log.msg}</span>
                  {log.mint && <span className="opacity-40 truncate w-20">({log.mint})</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Positions / Trade History */}
        <div className="lg:col-span-2 bg-[#111827] border border-white/5 rounded-2xl p-6 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              {showHistory ? 'Trade History' : 'Active Positions'}
            </h3>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              {showHistory ? 'View Active' : 'View History'}
            </button>
          </div>

          <div className="flex-1 overflow-auto rounded-xl border border-white/5 bg-black/20">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#111827] z-10 text-gray-400 uppercase text-xs font-semibold sticky top-0 shadow-md">
                <tr>
                  <th className="px-5 py-4">Token</th>
                  <th className="px-5 py-4 text-right">Entry</th>
                  {/* Fix 14: show unrealised P&L column */}
                  <th className="px-5 py-4 text-right">{showHistory ? 'Sold At' : 'Size'}</th>
                  <th className="px-5 py-4 text-center">{showHistory ? 'PnL' : 'Track'}</th>
                  <th className="px-5 py-4 text-center">{showHistory ? 'Reason' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {!showHistory ? (
                  activePositions.length === 0 ? (
                    <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-600">No active positions.</td></tr>
                  ) : (
                    activePositions.map((pos, i) => {
                      const unrealisedPct = pos.currentPriceEstimate && pos.entryPrice
                        ? (((pos.currentPriceEstimate - pos.entryPrice) / pos.entryPrice) * 100).toFixed(1)
                        : null;
                      return (
                        <tr key={i} className="hover:bg-white/5 transition">
                          <td className="px-5 py-4 font-mono text-blue-400 text-xs">
                            {pos.mint.slice(0, 6)}...{pos.mint.slice(-6)}
                          </td>
                          <td className="px-5 py-4 text-right text-gray-300 text-xs">
                            {(pos.entryPrice / 1_000_000_000).toFixed(8)} SOL
                          </td>
                          <td className="px-5 py-4 text-right text-gray-300 text-xs">
                            {(pos.amountInLamports / 1_000_000_000).toFixed(3)} SOL
                          </td>
                          {/* Track badge */}
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex py-0.5 px-2 rounded text-xs font-medium ${pos.source === 'amm'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                              {pos.source === 'amm' ? 'AMM' : 'Curve'}
                            </span>
                          </td>
                          {/* Fix 14: live unrealised P&L */}
                          <td className="px-5 py-4 text-center">
                            {unrealisedPct !== null ? (
                              <span className={`inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-bold border ${parseFloat(unrealisedPct) >= 0
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                {parseFloat(unrealisedPct) >= 0 ? '+' : ''}{unrealisedPct}%
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Holding
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )
                ) : (
                  tradeHistory.length === 0 ? (
                    <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-600">No completed trades yet.</td></tr>
                  ) : (
                    tradeHistory.map((trade, i) => {
                      const isProfit = trade.pnlSol >= 0;
                      return (
                        <tr key={i} className="hover:bg-white/5 transition">
                          <td className="px-5 py-4 font-mono text-gray-400 text-xs">
                            <div>{trade.mint.slice(0, 6)}...{trade.mint.slice(-6)}</div>
                            <div className="text-gray-600 mt-0.5">{new Date(trade.timestamp).toLocaleTimeString()}</div>
                          </td>
                          <td className="px-5 py-4 text-right text-gray-400 text-xs">{trade.boughtAt.toFixed(6)}</td>
                          <td className="px-5 py-4 text-right text-gray-300 text-xs">{trade.soldAt.toFixed(6)}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-bold border ${isProfit
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                              {isProfit ? '+' : ''}{trade.pnlSol.toFixed(4)} SOL
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <ReasonBadge reason={trade.reason} />
                          </td>
                        </tr>
                      );
                    })
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fix 16: Wallet Breakdown Panel */}
      <div className="max-w-7xl mx-auto mb-6">
        <button
          onClick={() => setShowWallets(!showWallets)}
          className="w-full flex items-center justify-between px-6 py-4 bg-[#111827] border border-white/5 rounded-2xl hover:border-white/10 transition group"
        >
          <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Wallet size={16} className="text-orange-400" />
            Wallet Breakdown
            <span className="text-xs text-gray-500 font-normal ml-1">
              {walletStats.availableWallets ?? 0}/{walletStats.totalWallets} available · {parseFloat(walletStats.totalBalance || 0).toFixed(3)} SOL total
            </span>
          </span>
          {showWallets ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </button>

        {showWallets && (walletStats.wallets || []).length > 0 && (
          <div className="mt-2 bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500 uppercase text-xs font-semibold border-b border-white/5">
                <tr>
                  <th className="px-6 py-3">Wallet</th>
                  <th className="px-6 py-3 text-right">Balance</th>
                  <th className="px-6 py-3 text-right">Snipes</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {/* Master Wallet Row */}
                {walletStats.masterBalance && (
                  <tr className="hover:bg-white/5 transition bg-[#1A2333]/50">
                    <td className="px-6 py-3 font-mono text-xs text-emerald-400 font-semibold flex items-center gap-2">
                      <ShieldCheck size={14} />
                      Master Vault
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-emerald-400 font-semibold">
                      {walletStats.masterBalance}
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-gray-500">—</td>
                    <td className="px-6 py-3 text-center">
                      <span className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-400/10 rounded">
                        Vault
                      </span>
                    </td>
                  </tr>
                )}
                {/* Sub-wallets */}
                {(walletStats.wallets || []).map((w, i) => (
                  <tr key={i} className="hover:bg-white/5 transition">
                    <td className="px-6 py-3 font-mono text-xs text-gray-400">
                      {w.address ? `${w.address.slice(0, 8)}...${w.address.slice(-6)}` : `Wallet ${i + 1}`}
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-gray-300">
                      {parseFloat(w.balance || 0).toFixed(4)} SOL
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-gray-400">{w.totalSnipes || 0}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 py-0.5 px-2 rounded text-xs font-medium border ${w.inUse
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : (w.balance || 0) < 0.05
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                        {w.inUse ? 'In Use' : (w.balance || 0) < 0.05 ? 'Low Bal' : 'Ready'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showWallets && (walletStats.wallets || []).length === 0 && (
          <div className="mt-2 bg-[#111827] border border-white/5 rounded-2xl px-6 py-8 text-center text-gray-600 text-sm">
            No wallet data available yet. The bot exposes wallet details in <code className="text-gray-500">walletStats.wallets</code>.
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-white/10 p-8 rounded-2xl w-full max-w-xl shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Settings className="text-blue-500" /> Bot Configuration
            </h2>

            <form onSubmit={saveConfig} className="space-y-4">
              {/* Trading Mode & Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Paper Trading (Simulated)</label>
                  <select value={config.PAPER_TRADING}
                    onChange={e => setConfig({ ...config, PAPER_TRADING: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition">
                    <option value="true">Enabled (Paper)</option>
                    <option value="false">Disabled (Live Mainnet)</option>
                  </select>
                </div>
                <FormField label="Trade Size (SOL)" value={config.TRADE_SIZE_SOL}
                  onChange={v => setConfig({ ...config, TRADE_SIZE_SOL: v })} />
              </div>

              {/* Exit Logic */}
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Take Profit (x)" value={config.TAKE_PROFIT_MULTIPLIER}
                  onChange={v => setConfig({ ...config, TAKE_PROFIT_MULTIPLIER: v })} type="number" accent="emerald" />
                <FormField label="Stop Loss (%)" value={config.STOP_LOSS_PERCENT}
                  onChange={v => setConfig({ ...config, STOP_LOSS_PERCENT: v })} type="number" accent="rose" />
                <FormField label="Trail Stop (%)" value={config.TRAILING_STOP_PERCENT}
                  onChange={v => setConfig({ ...config, TRAILING_STOP_PERCENT: v })} type="number" />
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t border-white/10">
                <button type="button" onClick={() => setIsConfigOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium transition">Cancel</button>
                <button type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium text-white shadow-lg shadow-blue-500/20 transition">Save Config</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, accent = 'blue' }) {
  return (
    <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition relative overflow-hidden group">
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 mb-2 truncate">{title}</p>
          <h3 className="text-2xl font-bold text-white tracking-tight truncate">{value}</h3>
        </div>
        <div className="p-2.5 rounded-xl bg-white/5 group-hover:scale-110 transition-transform duration-300 shrink-0 ml-2">
          {icon}
        </div>
      </div>
      <div className={`absolute -bottom-6 -right-6 w-24 h-24 bg-${accent}-500/5 blur-3xl rounded-full`}></div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', accent = 'blue' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-${accent}-500 transition`}
      />
    </div>
  );
}

function ReasonBadge({ reason }) {
  const map = {
    take_profit: ['bg-emerald-500/10 text-emerald-400 border-emerald-500/20', '✅ Take Profit'],
    trailing_stop: ['bg-cyan-500/10 text-cyan-400 border-cyan-500/20', '📉 Trail Stop'],
    stop_loss: ['bg-red-500/10 text-red-400 border-red-500/20', '🛑 Stop Loss'],
    rug_detected: ['bg-rose-500/10 text-rose-400 border-rose-500/20', '🚨 Rug'],
    manual: ['bg-gray-500/10 text-gray-400 border-gray-500/20', '✋ Manual'],
  };
  const [cls, label] = map[reason] || ['bg-gray-500/10 text-gray-400 border-gray-500/20', reason];
  return (
    <span className={`inline-flex py-0.5 px-2 rounded text-xs font-medium border ${cls}`}>{label}</span>
  );
}

export default App;
