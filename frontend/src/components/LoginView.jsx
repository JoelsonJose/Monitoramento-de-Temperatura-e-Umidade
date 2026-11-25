import { useState } from 'react';
import Brand from './Brand.jsx';
import { Field } from './FieldSelect.jsx';
import { api } from '../lib/api.js';

export default function LoginView({ onAuthenticated }) {
  const [step, setStep] = useState('credentials');
  const [mode, setMode] = useState('login');
  const [status, setStatus] = useState('Entre com sua conta ou crie um usuário para começar.');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [setupUsername, setSetupUsername] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);

  function reset(message = 'Entre com sua conta ou crie um usuário para começar.', isError = false) {
    setStep('credentials');
    setMode('login');
    setStatus(message);
    setError(isError);
    setUseRecovery(false);
    setChallengeToken('');
    setSetupToken('');
    setSetupUsername('');
    setQrCode('');
    setSecret('');
    setRecoveryCodes([]);
  }

  async function beginOtpSetup(token, username = '') {
    setSetupToken(token);
    setSetupUsername(username);
    setStep('setup');
    setStatus('Carregando configuração do autenticador…');
    const setup = await api('/api/v1/auth/otp/setup', { method: 'POST', token });
    setQrCode(setup.qr_code);
    setSecret(setup.secret);
    setStatus('Escaneie o QR Code no seu aplicativo autenticador.');
  }

  async function submitCredentials(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setStatus('Validando acesso…');
    setError(false);
    try {
      const body = await api('/api/v1/auth/token', {
        method: 'POST',
        body: { username: form.get('username'), password: form.get('password') },
      });
      if (body.access_token) {
        onAuthenticated(body.access_token);
        return;
      }
      if (body.setup_required) {
        await beginOtpSetup(body.setup_token, String(form.get('username') || '').trim());
        return;
      }
      if (body.otp_required) {
        setChallengeToken(body.challenge_token);
        setStep('challenge');
        setStatus('Informe o código de 6 dígitos gerado no aplicativo.');
      }
    } catch (err) {
      setStatus(err.message);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function submitRegistration(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    const confirmation = String(form.get('password_confirmation') || '');
    if (password !== confirmation) {
      setStatus('As senhas não coincidem.');
      setError(true);
      return;
    }

    setBusy(true);
    setStatus('Criando sua conta…');
    setError(false);
    try {
      const body = await api('/api/v1/auth/register', {
        method: 'POST',
        body: { username: form.get('username'), password },
      });
      if (!body.setup_required || !body.setup_token) throw new Error('Não foi possível iniciar a configuração do autenticador.');
      await beginOtpSetup(body.setup_token, String(form.get('username') || '').trim());
    } catch (err) {
      setStatus(err.message);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function submitChallenge(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const recovery = String(form.get('recovery_code') || '').trim();
    const code = String(form.get('code') || '').trim();
    setBusy(true);
    setStatus('Verificando código de segurança…');
    setError(false);
    try {
      const body = await api('/api/v1/auth/otp/verify', {
        method: 'POST',
        token: challengeToken,
        body: recovery ? { recovery_code: recovery } : { code },
      });
      if (body.access_token) onAuthenticated(body.access_token);
    } catch (err) {
      setStatus(err.message || 'Código inválido, expirado ou já utilizado.');
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function submitSetup(event) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get('code') || '').trim();
    setBusy(true);
    setStatus('Confirmando código com o servidor…');
    setError(false);
    try {
      const body = await api('/api/v1/auth/otp/enable', {
        method: 'POST',
        token: setupToken,
        body: { code },
      });
      setRecoveryCodes(body.recovery_codes || []);
      setStep('recovery');
      setStatus('Segundo fator ativado. Guarde os códigos de recuperação.');
    } catch (err) {
      setStatus(err.message || 'Falha ao ativar o segundo fator. Verifique o código.');
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="login-view">
      <header className="login-top"><Brand /></header>
      <main className="login-main">
        <section className="intro">
          <span className="eyebrow">Monitoramento IoT e qualidade</span>
          <h1>Um clima melhor para cada <span>manga.</span></h1>
          <p className="intro-copy">
            Telemetria em tempo real de temperatura, umidade e luminosidade, com a certificação do Selo de Qualidade pela regra dos 70% no pomar e na câmara fria.
          </p>
          <div className="mango-art" role="img" aria-label="Ilustração de uma manga">
            <svg viewBox="0 0 560 330" fill="none">
              <ellipse cx="284" cy="292" rx="210" ry="18" fill="#DDE8D8" />
              <path d="M88 221c74-50 114-112 166-153 41-32 90-32 139-7" stroke="#5F8C58" strokeWidth="9" strokeLinecap="round" />
              <path d="M204 111C168 61 109 53 76 79c18 47 65 66 128 49Z" fill="#6FA169" />
              <path d="M338 72c32-47 84-58 123-35-11 45-50 68-113 58Z" fill="#4C8A56" />
              <path d="M287 123c22-54 89-68 122-24 27 36 12 106-25 151-28 33-79 38-111 8-33-31-16-94 14-135Z" fill="#F2A51A" />
            </svg>
          </div>
        </section>
        <section className="login-card" aria-labelledby="login-title">
          <span className="eyebrow">Acesso ao painel</span>
          <h2 id="login-title">Que bom ter você aqui.</h2>
          {step === 'credentials' ? (
            <>
              {mode === 'login' ? (
                <>
                  <p className="login-hint">Entre com sua conta para ver a telemetria e a auditoria dos lotes.</p>
                  <form onSubmit={submitCredentials}>
                    <Field id="username" label="Usuário">
                      <input id="username" name="username" autoComplete="username" minLength={3} maxLength={32} required />
                    </Field>
                    <Field id="password" label="Senha">
                      <input id="password" name="password" type="password" autoComplete="current-password" required />
                    </Field>
                    <button className="primary" type="submit" disabled={busy}>{busy ? 'Conectando…' : 'Entrar no painel'}</button>
                  </form>
                  <div className="form-links"><span>Primeiro acesso?</span><button className="linkish" type="button" onClick={() => { setMode('register'); setError(false); setStatus('Crie sua conta e configure seu próprio autenticador.'); }}>Criar conta</button></div>
                </>
              ) : (
                <>
                  <p className="login-hint">Crie seu usuário e senha. Em seguida, configure o autenticador no seu próprio celular. Não é necessário e-mail ou número de telefone.</p>
                  <form onSubmit={submitRegistration}>
                    <Field id="register-username" label="Usuário">
                      <input id="register-username" name="username" autoComplete="username" minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" title="Use de 3 a 32 letras, números, ponto, hífen ou sublinhado." required />
                    </Field>
                    <Field id="register-password" label="Senha (mínimo 12 caracteres)">
                      <input id="register-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required />
                    </Field>
                    <Field id="register-password-confirmation" label="Confirme a senha">
                      <input id="register-password-confirmation" name="password_confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={256} required />
                    </Field>
                    <button className="primary" type="submit" disabled={busy}>{busy ? 'Criando conta…' : 'Criar conta e configurar 2FA'}</button>
                  </form>
                  <div className="form-links"><span>Já tem uma conta?</span><button className="linkish" type="button" onClick={() => { setMode('login'); setError(false); setStatus('Entre com seu usuário e senha.'); }}>Voltar ao login</button></div>
                </>
              )}
            </>
          ) : null}

          {step === 'challenge' ? (
            <form onSubmit={submitChallenge}>
              <p className="callout secure">Digite o código de 6 dígitos do autenticador ou um código de recuperação.</p>
              {useRecovery ? (
                <Field id="recovery-code" label="Código de recuperação">
                  <input id="recovery-code" name="recovery_code" autoComplete="off" placeholder="XXXX-XXXX-XXXX" required />
                </Field>
              ) : (
                <Field id="otp-code" label="Código de 6 dígitos">
                  <input id="otp-code" name="code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="000000" required />
                </Field>
              )}
              <button className="primary" type="submit" disabled={busy}>{busy ? 'Validando…' : 'Validar código'}</button>
              <div className="form-links">
                <button className="linkish" type="button" onClick={() => setUseRecovery((current) => !current)}>
                  {useRecovery ? 'Usar código do autenticador' : 'Usar código de recuperação'}
                </button>
                <button className="linkish muted" type="button" onClick={() => reset()}>Voltar</button>
              </div>
            </form>
          ) : null}

          {step === 'setup' ? (
            <form onSubmit={submitSetup}>
              <p className="callout setup">
                {setupUsername ? <>Este autenticador será vinculado somente à conta <strong>{setupUsername}</strong>. </> : null}
                No Microsoft Authenticator, toque em +, escolha “Outra conta” e escaneie o QR Code. O app gera um código de 6 dígitos no celular; não enviamos código por push, e-mail ou SMS.
              </p>
              <div className="qr-wrap">
                {qrCode ? <img src={qrCode} alt="QR Code para configurar a autenticação em dois fatores" /> : <p>Gerando QR Code…</p>}
              </div>
              <p className="secret-line">Chave manual: <code>{secret || '—'}</code></p>
              <Field id="setup-code" label="Código de 6 dígitos gerado no aplicativo">
                <input id="setup-code" name="code" inputMode="numeric" maxLength={6} placeholder="000000" required />
              </Field>
              <button className="primary" type="submit" disabled={busy}>{busy ? 'Ativando…' : 'Ativar e gerar códigos'}</button>
              <div className="form-links">
                <button className="linkish muted" type="button" onClick={() => reset()}>Cancelar</button>
              </div>
            </form>
          ) : null}

          {step === 'recovery' ? (
            <div className="recovery-box">
              <p>Guarde estes códigos de recuperação de uso único.</p>
              <ul className="recovery-list">
                {recoveryCodes.map((code) => <li key={code}>{code}</li>)}
              </ul>
              <button className="primary" type="button" onClick={() => reset('Segundo fator configurado. Entre com o autenticador.')}>
                Ir para o login
              </button>
            </div>
          ) : null}

          <p className={error ? 'login-status error' : 'login-status'} role="status">{status}</p>
          <p className="login-foot">Manga Trace · Monitoramento IoT de ponta a ponta.</p>
        </section>
      </main>
    </section>
  );
}
