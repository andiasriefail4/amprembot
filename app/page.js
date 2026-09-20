'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [step, setStep] = useState('input_email'); // 'input_email' | 'input_magic_link' | 'done'
  const [email, setEmail] = useState('');
  const [magicLink, setMagicLink] = useState('');
  const [cookies, setCookies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState([]);
  const [botUsername, setBotUsername] = useState('AzVkmBot');

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('am_history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));

      const botToken = localStorage.getItem('tg_bot_token');
      if (botToken) {
        fetch('/api/set-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getMe', botToken })
        })
          .then(r => r.json())
          .then(res => {
            if (res.ok && res.result?.username) {
              setBotUsername(res.result.username);
            }
          })
          .catch(() => {});
      }
    } catch {}
  }, []);

  const parseSafeJson = async (res) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      if (res.status === 504 || text.includes('FUNCTION_INVOCATION_TIMEOUT') || text.includes('An error occurred')) {
        throw new Error('Server sedang sibuk (Timeout). Silakan coba klik Verifikasi & Aktifkan lagi.');
      }
      throw new Error(`Server Error (${res.status}): ${text.slice(0, 100)}`);
    }
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    const em = email.trim();
    if (!em) {
      alert('Email wajib diisi!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setProgress(30);
    setLoadingMsg('Mengirim magic link ke email Anda...');

    try {
      const res = await fetch('/api/generator-v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em })
      });
      const data = await parseSafeJson(res);
      if (!data.success) throw new Error(data.error || 'Gagal mengirim magic link');

      setCookies(data.cookies || []);
      setStep('input_magic_link');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleVerifyAndApply = async (e) => {
    e.preventDefault();
    const link = magicLink.trim();
    if (!link) {
      alert('Magic Link wajib diisi!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setProgress(15);
    setLoadingMsg('Memverifikasi link...');

    try {
      // 1. Verifikasi Link
      const resVerify = await fetch('/api/generator-v1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), magicLink: link, cookies })
      });
      const verifyData = await parseSafeJson(resVerify);
      if (!verifyData.success) throw new Error(verifyData.error || 'Verifikasi magic link gagal');

      let currentCookies = verifyData.cookies || cookies;
      setCookies(currentCookies);

      // 2. Loop 5 Iklan secara bertahap tanpa timeout Vercel
      let adsCompleted = 0;
      let attempts = 0;

      while (adsCompleted < 5 && attempts < 25) {
        attempts++;
        setLoadingMsg(`Menonton iklan (${adsCompleted}/5)...`);
        setProgress(20 + (adsCompleted * 15));

        const resAd = await fetch('/api/generator-v1/ad-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookies: currentCookies })
        });
        const adData = await parseSafeJson(resAd);

        if (adData.cookies) {
          currentCookies = adData.cookies;
          setCookies(currentCookies);
        }

        if (adData.success) {
          adsCompleted = adData.count;
          if (adData.isComplete || adsCompleted >= 5) break;
          await sleep(4000);
        } else if (adData.cooldown) {
          const waitTime = (adData.waitSeconds || 10) + 1;
          for (let s = waitTime; s > 0; s--) {
            setLoadingMsg(`Menonton iklan (${adsCompleted}/5)... Tunggu ${s}s`);
            await sleep(1000);
          }
        } else {
          await sleep(3000);
        }
      }

      // 3. Apply Premium
      setLoadingMsg('Mengaktifkan status Premium...');
      setProgress(95);

      const resApply = await fetch('/api/generator-v1/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: currentCookies, email: email.trim() })
      });
      const applyData = await parseSafeJson(resApply);
      if (!applyData.success) throw new Error(applyData.error || 'Gagal mengaktifkan premium');

      setProgress(100);
      setResult(applyData);
      setStep('done');

      const newHistory = [
        { email: email.trim(), codeOrder: applyData.codeOrder, date: new Date().toLocaleDateString() },
        ...history.filter(h => h.email !== email.trim())
      ].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem('am_history', JSON.stringify(newHistory));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('input_email');
    setEmail('');
    setMagicLink('');
    setResult(null);
    setErrorMsg('');
    setProgress(0);
  };

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
        <div style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
          AM Prem Generator
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.85rem' }}>
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#a1a1aa', textDecoration: 'none', transition: 'color 150ms' }}
          >
            Bot Telegram
          </a>
          <Link href="/admin" style={{ color: '#a1a1aa', textDecoration: 'none' }}>
            Admin
          </Link>
        </div>
      </header>

      <main
        style={{
          maxWidth: '520px',
          width: '100%',
          margin: '0 auto',
          background: '#121215',
          border: '1px solid #27272a',
          borderRadius: '12px',
          padding: '1.75rem'
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            AM Prem Generator
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>
            Aktivasi status Premium langsung ke email pribadi Alight Motion Anda.
          </p>
        </div>

        {step === 'input_email' && (
          <form onSubmit={handleSendMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.4rem' }}>
                Email Alight Motion Anda <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contoh: nama@gmail.com"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.65rem' }} disabled={loading}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="spinner" />
                  <span>Memproses...</span>
                </div>
              ) : (
                'Kirim Link Verifikasi'
              )}
            </button>
          </form>
        )}

        {step === 'input_magic_link' && (
          <form onSubmit={handleVerifyAndApply} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#09090b', padding: '0.75rem', borderRadius: '6px', border: '1px solid #27272a', fontSize: '0.8rem', color: '#a1a1aa' }}>
              📧 Magic link telah dikirim ke <b style={{ color: '#fafafa' }}>{email}</b>.<br />
              Buka email masuk dari Alight Motion, salin link-nya, lalu paste di bawah:
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.4rem' }}>
                Paste Magic Link / Link Verifikasi <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="text"
                className="input-field"
                value={magicLink}
                onChange={e => setMagicLink(e.target.value)}
                placeholder="https://alight-creative.firebaseapp.com/__/auth/links?..."
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.65rem' }} disabled={loading}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="spinner" />
                  <span>Memproses...</span>
                </div>
              ) : (
                'Verifikasi & Aktifkan Premium'
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('input_email')}
              style={{ background: 'transparent', border: 'none', color: '#71717a', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              ← Ganti Email
            </button>
          </form>
        )}

        {step === 'done' && result && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#4ade80', marginBottom: '0.4rem' }}>
              Premium Berhasil Diaktifkan!
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Akun <b>{email}</b> sekarang telah aktif sebagai Alight Motion Premium.
            </p>
            {result.codeOrder && (
              <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '6px', padding: '0.5rem', display: 'inline-block', fontSize: '0.8rem', color: '#71717a', fontFamily: 'JetBrains Mono, monospace', marginBottom: '1.25rem' }}>
                Code Order: {result.codeOrder}
              </div>
            )}
            <div>
              <button onClick={handleReset} className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>
                Aktivasi Akun Lain
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ marginTop: '1.25rem' }}>
            {progress > 0 && (
              <div style={{ background: '#18181b', borderRadius: '4px', height: '6px', overflow: 'hidden', border: '1px solid #27272a', marginBottom: '0.75rem' }}>
                <div style={{ background: '#4ade80', height: '100%', width: `${progress}%`, transition: 'width 400ms ease' }} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#a1a1aa' }}>
              <div className="spinner-white" style={{ width: '12px', height: '12px' }} />
              <span>{loadingMsg}</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div style={{ marginTop: '1rem', padding: '0.6rem 0.85rem', background: '#18181b', borderRadius: '6px', border: '1px solid #f87171', fontSize: '0.8rem', color: '#f87171' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {history.length > 0 && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #27272a', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Riwayat
              </span>
              <button
                onClick={() => {
                  setHistory([]);
                  localStorage.removeItem('am_history');
                }}
                style={{ background: 'transparent', border: 'none', color: '#52525b', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Hapus
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {history.slice(0, 3).map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.6rem', background: '#09090b', borderRadius: '6px', border: '1px solid #1f1f23', fontSize: '0.8rem' }}>
                  <span style={{ color: '#d4d4d8' }}>{item.email}</span>
                  <span style={{ color: '#4ade80', fontSize: '0.75rem' }}>✓ Premium</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <section style={{ maxWidth: '520px', width: '100%', margin: '1.5rem auto 0', background: '#121215', border: '1px solid #27272a', borderRadius: '12px', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fafafa', marginBottom: '1rem' }}>
          Panduan Penggunaan
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem', color: '#a1a1aa', lineHeight: 1.6 }}>
          <div>1. Masukkan alamat email Anda dan klik <b>Kirim Link Verifikasi</b>.</div>
          <div>2. Buka email masuk dari Alight Motion di HP/Laptop Anda.</div>
          <div>3. Salin (copy) link verifikasi, lalu paste di form dan klik <b>Verifikasi & Aktifkan</b>.</div>
          <div>4. Tunggu ~60 detik selagi bot menonton 5 iklan otomatis dan mengaktifkan status Premium ke email Anda.</div>
        </div>
      </section>

      <footer style={{ maxWidth: '520px', width: '100%', margin: '2rem auto 0', textAlign: 'center', color: '#52525b', fontSize: '0.75rem' }}>
        AM Prem Generator • Powered by S1AllSolver
      </footer>
    </div>
  );
}
