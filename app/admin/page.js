'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [solverUrl, setSolverUrl] = useState('https://rbot.duar.eu.cc/api/turnstile');
  const [botToken, setBotToken] = useState('');
  const [botInfo, setBotInfo] = useState(null);
  const [saved, setSaved] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgStatus, setTgStatus] = useState('');

  useEffect(() => {
    const savedAuth = localStorage.getItem('am_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }

    const savedSolver = localStorage.getItem('am_solver_url');
    if (savedSolver) setSolverUrl(savedSolver);

    const savedBotToken = localStorage.getItem('tg_bot_token');
    if (savedBotToken) {
      setBotToken(savedBotToken);
      fetchBotInfo(savedBotToken);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setLoginError('Silakan masukkan password admin');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() })
      });
      const data = await res.json();

      if (data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('am_admin_auth', 'true');
        setPasswordInput('');
      } else {
        setLoginError(data.error || 'Password admin salah!');
      }
    } catch (err) {
      setLoginError(`Error: ${err.message}`);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('am_admin_auth');
  };

  const fetchBotInfo = async (token) => {
    try {
      const res = await fetch('/api/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getMe', botToken: token })
      });
      const data = await res.json();
      if (data.ok) {
        setBotInfo(data.result);
      }
    } catch {}
  };

  const handleSaveSolver = (e) => {
    e.preventDefault();
    localStorage.setItem('am_solver_url', solverUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConnectWebhook = async () => {
    if (!botToken.trim()) return alert('Masukkan Telegram Bot Token!');
    setTgLoading(true);
    setTgStatus('');
    try {
      const webhookUrl = `${window.location.origin}/api/bot?token=${encodeURIComponent(botToken.trim())}`;
      const res = await fetch('/api/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setWebhook',
          botToken: botToken.trim(),
          webhookUrl
        })
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('tg_bot_token', botToken.trim());
        setTgStatus(`✓ Webhook terhubung ke ${webhookUrl}`);
        fetchBotInfo(botToken.trim());
      } else {
        setTgStatus(`❌ Gagal: ${data.description || 'Error'}`);
      }
    } catch (err) {
      setTgStatus(`❌ Error: ${err.message}`);
    } finally {
      setTgLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem' }}>
        <header
          style={{
            maxWidth: '420px',
            width: '100%',
            margin: '0 auto 2.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>AM Prem Admin</div>
          <Link href="/" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.85rem' }}>
            ← Beranda
          </Link>
        </header>

        <main
          style={{
            maxWidth: '420px',
            width: '100%',
            margin: '0 auto',
            background: '#121215',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '2rem 1.75rem'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Autentikasi Admin
            </h1>
            <p style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>
              Masukkan password admin untuk mengakses panel konfigurasi.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.4rem' }}>
                Password Admin
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Masukkan password..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                required
              />
            </div>

            {loginError && (
              <div style={{ padding: '0.6rem 0.8rem', background: '#450a0a', border: '1px solid #991b1b', borderRadius: '6px', color: '#fca5a5', fontSize: '0.8rem' }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.65rem' }}
              disabled={loginLoading}
            >
              {loginLoading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem' }}>
      <header
        style={{
          maxWidth: '520px',
          width: '100%',
          margin: '0 auto 2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>AM Prem Admin</div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Keluar
          </button>
          <Link href="/" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.85rem' }}>
            ← Beranda
          </Link>
        </div>
      </header>

      <main
        style={{
          maxWidth: '520px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}
      >
        {/* Telegram Bot Setting */}
        <section
          style={{
            background: '#121215',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '1.75rem'
          }}
        >
          <h1 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            🤖 Konfigurasi Bot Telegram
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Hubungkan Bot Telegram Anda agar langsung support full inline button.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.4rem' }}>
                Telegram Bot Token (dari @BotFather)
              </label>
              <input
                type="text"
                className="input-field"
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
                placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
              />
            </div>

            {botInfo && (
              <div style={{ padding: '0.6rem 0.8rem', background: '#09090b', borderRadius: '6px', border: '1px solid #22c55e33', fontSize: '0.8rem' }}>
                <span style={{ color: '#4ade80' }}>✓ Bot Aktif:</span> @{botInfo.username} ({botInfo.first_name})
              </div>
            )}

            <button
              type="button"
              onClick={handleConnectWebhook}
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={tgLoading}
            >
              {tgLoading ? 'Menghubungkan...' : '🔗 Hubungkan Webhook Bot'}
            </button>

            {tgStatus && (
              <div style={{ fontSize: '0.8rem', color: tgStatus.startsWith('✓') ? '#4ade80' : '#f87171' }}>
                {tgStatus}
              </div>
            )}
          </div>
        </section>

        {/* Solver Setting */}
        <section
          style={{
            background: '#121215',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '1.75rem'
          }}
        >
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            ⚡ Konfigurasi Turnstile Solver
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Pengaturan endpoint backend Turnstile Solver (S1AllSolver).
          </p>

          <form onSubmit={handleSaveSolver} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.4rem' }}>
                Solver API URL
              </label>
              <input
                type="text"
                className="input-field"
                value={solverUrl}
                onChange={e => setSolverUrl(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
              {saved ? '✓ Solver Tersimpan' : 'Simpan Solver URL'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
