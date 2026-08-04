import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Power, Settings, TrendingUp, ShieldCheck, Activity, Key,
  Wallet, PlayCircle, PauseCircle, Terminal, XCircle,
  ChevronDown, ChevronUp, BarChart2, Target, ExternalLink,
  Share2, Zap, Copy, Check
} from 'lucide-react';

const BOT_API_URL = typeof window !== 'undefined' && window.location.origin.includes('http') ? window.location.origin : 'https://sniper.cybroxlabs.com';

function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('sinperApiKey') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('sinperApiKey'));

  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [shareModalTrade, setShareModalTrade] = useState(null);
  const terminalRef = useRef(null);

  const [config, setConfig] = useState({
    TRADE_SIZE_SOL: '0.05',
    MAX_OPEN_POSITIONS: '5',
    TAKE_PROFIT_MULTIPLIER: '3.0',
    STOP_LOSS_PERCENT: '30',
    TRAILING_STOP_PERCENT: '15',
    PAPER_TRADING: 'true',
  });

  const apiClient = axios.create({
    baseURL: BOT_API_URL,
    headers: {
      'x-api-key': apiKey,
      'bypass-tunnel-reminder': 'true',
    }
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
        setError('Cannot connect to bot engine.');
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    let es = null;
    let pollInterval = null;

    const connectSSE = () => {
      const url = `${BOT_API_URL}/events?` + new URLSearchParams({
        'x-api-key': apiKey,
        'bypass-tunnel-reminder': 'true',
      });
      es = new EventSource(url);

      es.onopen = () => {
        setError(null);
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
        if (!pollInterval) {
          fetchStatus();
          pollInterval = setInterval(fetchStatus, 3000);
        }
      };
    };

    fetchStatus().then(() => connectSSE());

    return () => {
      es?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isAuthenticated, apiKey]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [status?.recentLogs]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!apiKey) return;
    localStorage.setItem('sinperApiKey', apiKey);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('sinperApiKey');
    setIsAuthenticated(false);
    setStatus(null);
  };

  const toggleBot = async (action) => {
    try {
      await apiClient.post('/control', { action });
      fetchStatus();
    } catch (err) {
      console.error('toggleBot failed:', err);
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
      alert('Config saved and applied live!');
      setIsConfigOpen(false);
    } catch (err) {
      alert('Failed to save config');
    }
  };

  const handleEmergencySell = async (mint) => {
    if (!window.confirm(`Are you sure you want to emergency sell ${mint.slice(0, 6)}... now?`)) return;
    try {
      const res = await apiClient.post('/exit-position', { mint });
      if (res.data.success) {
        alert('Emergency sell order submitted!');
      } else {
        alert('Sell failed: ' + (res.data.message || 'Position not found'));
      }
    } catch (err) {
      alert('Failed to execute emergency sell');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white p-4">
        <div className="bg-[#111827] border border-white/10 p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
              <Key size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Login</h2>
          <p className="text-gray-400 text-sm text-center mb-6">Enter your Master API Key to connect</p>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="API_SECRET_KEY"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition mb-4 font-mono text-sm"
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
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white p-4">
        <div className="text-center p-8 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-md w-full relative">
          <button onClick={logout} className="absolute top-4 right-4 text-gray-500 hover:text-white"><XCircle size={20} /></button>
          <ShieldCheck className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-red-400 mb-2">Connection Lost</h2>
          <p className="text-gray-400 text-sm">{error}</p>
          <p className="text-xs text-gray-500 mt-6">Connecting to {BOT_API_URL}</p>
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

  const totalPnLSol = tradeHistory.reduce((acc, t) => acc + (t.pnlSol || 0), 0);
  const totalSnipes = stats.totalSnipes ?? tradeHistory.length;
  const winningTrades = tradeHistory.filter(t => t.pnlSol > 0).length;
  const winRate = tradeHistory.length > 0 ? ((winningTrades / tradeHistory.length) * 100).toFixed(1) : '100.0';

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-3 sm:p-6 lg:p-8 font-sans antialiased">
      {/* Top Navigation Bar */}
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-500 shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              Sinper-Bot <span className="text-xs font-normal text-gray-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">Dashboard</span>
            </h1>
            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              {isRunning ? 'Live Engine Running' : 'Engine Paused'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 ${isTestMode
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
            {isTestMode ? '• Test Mode' : '⚡ LIVE MAINNET'}
          </span>

          <button onClick={logout} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition">
            <Power size={18} />
          </button>

          <button onClick={openConfigModal} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold">
            <Settings size={18} /> Settings
          </button>

          <button
            onClick={() => toggleBot(isRunning ? 'stop' : 'start')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg ${isRunning
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
              }`}
          >
            {isRunning ? <><PauseCircle size={16} /> Pause Sniping</> : <><PlayCircle size={16} /> Resume Sniping</>}
          </button>
        </div>
      </header>

      {/* Overview Stats Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Total PnL"
          value={`${totalPnLSol >= 0 ? '+' : ''}${totalPnLSol.toFixed(3)} SOL`}
          icon={<TrendingUp className={totalPnLSol >= 0 ? 'text-emerald-400' : 'text-rose-400'} />}
          accent={totalPnLSol >= 0 ? 'emerald' : 'rose'}
        />
        <StatCard
          title="Active Positions"
          value={activePositions.length}
          icon={<Activity className="text-blue-400" />}
          accent="blue"
        />
        <StatCard
          title="Rugs Dodged"
          value={stats.rugsDodged ?? stats.rugSkips ?? 0}
          icon={<ShieldCheck className="text-purple-400" />}
          accent="purple"
        />
        <StatCard
          title={`Vault Balance`}
          value={`${parseFloat(walletStats.totalBalance || 0).toFixed(2)} SOL`}
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

      {/* Prominent Top-Level Wallet Breakdown Section */}
      <div className="max-w-7xl mx-auto bg-[#111827] border border-white/5 rounded-2xl p-4 sm:p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 uppercase tracking-wider">
            <Wallet size={16} className="text-orange-400" /> Wallet Overview
          </h3>
          <span className="text-xs font-mono text-gray-400">
            {walletStats.availableWallets ?? 0}/{walletStats.totalWallets || 3} Active Sub-Wallets
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Master Vault Card */}
          {walletStats.masterBalance && (
            <div className="bg-[#1A2333]/80 border border-emerald-500/30 p-4 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                  <ShieldCheck size={12} /> Master Vault
                </p>
                <p className="text-lg font-black text-white tracking-tight mt-0.5">
                  {walletStats.masterBalance}
                </p>
              </div>
              <span className="px-2 py-1 text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded">
                Vault
              </span>
            </div>
          )}

          {/* Sub-Wallets Cards */}
          {(walletStats.wallets || []).map((w, i) => (
            <div key={i} className="bg-black/30 border border-white/5 p-4 rounded-xl flex justify-between items-center hover:border-white/10 transition">
              <div>
                <p className="text-[10px] font-mono text-gray-500 uppercase">
                  {w.address ? `${w.address.slice(0, 6)}...${w.address.slice(-4)}` : `Sub-Wallet ${i + 1}`}
                </p>
                <p className="text-base font-bold text-gray-200 mt-0.5">
                  {parseFloat(w.balance || 0).toFixed(4)} SOL
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">{w.totalSnipes || 0} snipes</p>
              </div>
              <span className={`inline-flex items-center gap-1 py-1 px-2.5 rounded text-[10px] font-bold border ${w.inUse
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : (w.balance || 0) < 0.05
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                {w.inUse ? 'In Use' : (w.balance || 0) < 0.05 ? 'Low Bal' : 'Ready'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive PnL Growth Chart */}
      {tradeHistory.length > 0 && (
        <div className="max-w-7xl mx-auto bg-[#111827] border border-white/5 rounded-2xl p-4 sm:p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 uppercase tracking-wider">
              <TrendingUp size={16} className="text-emerald-400" /> PnL Growth Curve
            </h3>
            <span className="text-xs text-emerald-400 font-semibold font-mono">
              Net Gain: {totalPnLSol >= 0 ? '+' : ''}{totalPnLSol.toFixed(4)} SOL
            </span>
          </div>
          <PnLChart tradeHistory={tradeHistory} />
        </div>
      )}

      {/* Main Content Grid: Live Terminal + Active Positions */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Live Terminal */}
        <div className="lg:col-span-1 bg-[#111827] border border-white/5 rounded-2xl p-4 sm:p-6 flex flex-col h-[400px] sm:h-[480px]">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-gray-400" /> Live Terminal
          </h3>
          <div
            ref={terminalRef}
            className="flex-1 bg-black/40 rounded-xl p-3 sm:p-4 overflow-y-auto font-mono text-[11px] sm:text-xs text-gray-400 border border-white/5 space-y-1.5"
          >
            {recentLogs.length === 0 ? (
              <p className="text-gray-600 text-center mt-10">Awaiting stream data...</p>
            ) : (
              recentLogs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${log.level >= 40 ? 'text-rose-400' : log.level === 30 ? 'text-emerald-400' : 'text-gray-400'}`}>
                  <span className="opacity-40 shrink-0">[{new Date(log.time).toLocaleTimeString()}]</span>
                  <span className="break-all">{log.msg}</span>
                  {log.mint && <span className="opacity-40 truncate w-16">({log.mint})</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Positions & Trade History Table */}
        <div className="lg:col-span-2 bg-[#111827] border border-white/5 rounded-2xl p-4 sm:p-6 flex flex-col h-[400px] sm:h-[480px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
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

          <div className="flex-1 overflow-x-auto rounded-xl border border-white/5 bg-black/20">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[550px]">
              <thead className="bg-[#111827] text-gray-400 uppercase text-xs font-semibold sticky top-0 shadow-md">
                <tr>
                  <th className="px-4 py-3 sm:px-5 sm:py-4">Token</th>
                  <th className="px-4 py-3 sm:px-5 sm:py-4 text-right">Entry</th>
                  <th className="px-4 py-3 sm:px-5 sm:py-4 text-right">{showHistory ? 'Sold At' : 'Size'}</th>
                  <th className="px-4 py-3 sm:px-5 sm:py-4 text-center">{showHistory ? 'PnL' : 'Status'}</th>
                  <th className="px-4 py-3 sm:px-5 sm:py-4 text-center">{showHistory ? 'Reason' : 'Action'}</th>
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
                          <td className="px-4 py-3 sm:px-5 sm:py-4 font-mono text-xs">
                            <div className="flex items-center gap-2 text-blue-400">
                              <span>{pos.mint.slice(0, 6)}...{pos.mint.slice(-6)}</span>
                              <a href={`https://dexscreener.com/solana/${pos.mint}`} target="_blank" rel="noreferrer" title="DexScreener" className="text-gray-500 hover:text-blue-400 transition">
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          </td>
                          <td className="px-4 py-3 sm:px-5 sm:py-4 text-right text-gray-300 text-xs">
                            {(pos.entryPrice / 1_000_000_000).toFixed(8)} SOL
                          </td>
                          <td className="px-4 py-3 sm:px-5 sm:py-4 text-right text-gray-300 text-xs">
                            {(pos.amountInLamports / 1_000_000_000).toFixed(3)} SOL
                          </td>
                          <td className="px-4 py-3 sm:px-5 sm:py-4 text-center">
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
                          <td className="px-4 py-3 sm:px-5 sm:py-4 text-center">
                            <button
                              onClick={() => handleEmergencySell(pos.mint)}
                              className="px-2.5 py-1 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition inline-flex items-center gap-1"
                            >
                              <Zap size={12} /> Sell Now
                            </button>
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
                          <td className="px-4 py-3 sm:px-5 sm:py-4 font-mono text-gray-400 text-xs">
                            <div className="flex items-center gap-2">
                              <span>{trade.mint.slice(0, 6)}...{trade.mint.slice(-6)}</span>
                              <a href={`https://dexscreener.com/solana/${trade.mint}`} target="_blank" rel="noreferrer" title="DexScreener" className="text-gray-500 hover:text-blue-400 transition">
                                <ExternalLink size={12} />
                              </a>
                            </div>
                            <div className="text-gray-600 mt-0.5">{new Date(trade.timestamp).toLocaleTimeString()}</div>
                          </td>
                          <td className="px-4 py-3 sm:px-5 sm:py-4 text-right text-gray-400 text-xs">{trade.boughtAt.toFixed(6)}</td>
                          <td className="px-4 py-3 sm:px-5 sm:py-4 text-right text-gray-300 text-xs">{trade.soldAt.toFixed(6)}</td>
                          <td className="px-4 py-3 sm:px-5 sm:py-4 text-center">
                            <div className="inline-flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-bold border ${isProfit
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                {isProfit ? '+' : ''}{trade.pnlSol.toFixed(4)} SOL
                              </span>
                              {isProfit && (
                                <button
                                  onClick={() => setShareModalTrade(trade)}
                                  className="p-1 text-gray-500 hover:text-emerald-400 transition"
                                  title="Share Win Card"
                                >
                                  <Share2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 sm:px-5 sm:py-4 text-center">
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

      {/* Settings Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-white/10 p-6 sm:p-8 rounded-2xl w-full max-w-xl shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Settings className="text-blue-500" /> Bot Configuration
            </h2>

            <form onSubmit={saveConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Share Win Modal */}
      {shareModalTrade && (
        <ShareModal trade={shareModalTrade} onClose={() => setShareModalTrade(null)} />
      )}
    </div>
  );
}

function PnLChart({ tradeHistory }) {
  let cumulative = 0;
  const points = tradeHistory.slice().reverse().map((t, idx) => {
    cumulative += (t.pnlSol || 0);
    return { x: idx, y: cumulative };
  });

  if (points.length === 0) return null;

  const minY = Math.min(0, ...points.map(p => p.y));
  const maxY = Math.max(0.1, ...points.map(p => p.y));
  const rangeY = (maxY - minY) || 1;

  const width = 600;
  const height = 120;

  const pathD = points.map((p, i) => {
    const px = (i / Math.max(1, points.length - 1)) * width;
    const py = height - (((p.y - minY) / rangeY) * (height - 20) + 10);
    return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
  }).join(' ');

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className="w-full h-32 relative">
      <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#pnlGrad)" />
        <path d={pathD} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function ShareModal({ trade, onClose }) {
  const [copied, setCopied] = useState(false);
  const pnlPct = trade.boughtAt > 0 ? (((trade.soldAt - trade.boughtAt) / trade.boughtAt) * 100).toFixed(1) : '0.0';
  const shareText = `🚀 Just bagged +${trade.pnlSol.toFixed(4)} SOL (+${pnlPct}%) on $${trade.mint.slice(0, 6)} using SinperBot! 🎯⚡`;

  const copyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-white/10 p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><XCircle size={20} /></button>
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl w-14 h-14 mx-auto mb-4 flex items-center justify-center text-emerald-400">
          <TrendingUp size={28} />
        </div>
        <h3 className="text-xl font-bold text-white mb-1">Share Your Win!</h3>
        <p className="text-xs text-gray-400 mb-6">Brag about your trade on Twitter/X or Telegram</p>

        {/* Styled Card */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-[#111827] to-black border border-emerald-500/30 p-6 rounded-2xl mb-6 relative overflow-hidden text-left">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Token Mint</p>
              <p className="font-mono text-sm text-gray-200 font-bold">{trade.mint.slice(0, 8)}...{trade.mint.slice(-6)}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              +{pnlPct}%
            </span>
          </div>
          <p className="text-3xl font-black text-emerald-400 tracking-tight mb-1">
            +{trade.pnlSol.toFixed(4)} SOL
          </p>
          <p className="text-[11px] text-gray-500 flex items-center gap-1 font-medium">
            <span>Entry: {trade.boughtAt.toFixed(4)}</span> · <span>Exit: {trade.soldAt.toFixed(4)}</span>
          </p>
          <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-[10px] text-gray-400">
            <span>Powered by <strong className="text-white">SinperBot 🚀</strong></span>
            <span>{new Date(trade.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={copyText}
            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-white transition flex items-center justify-center gap-2 text-xs"
          >
            {copied ? <><Check size={14} className="text-emerald-400" /> Copied!</> : <><Copy size={14} /> Copy Text</>}
          </button>
          <a
            href={tweetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 text-xs"
          >
            <Share2 size={14} /> Post to X
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, accent = 'blue' }) {
  return (
    <div className="bg-[#111827] border border-white/5 rounded-2xl p-4 sm:p-5 hover:border-white/10 transition relative overflow-hidden group">
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-gray-500 mb-1.5 truncate">{title}</p>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">{value}</h3>
        </div>
        <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 group-hover:scale-110 transition-transform duration-300 shrink-0 ml-2">
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
