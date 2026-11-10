import { useState } from 'react';
import type { FormEvent, InputHTMLAttributes } from 'react';
import { Button } from '../components/00_UiComps/Button';
import { createCompany, signIn, staffSignIn, signOut, updateCompany } from '../types/companyAuth';
import type { Company } from '../types/companyAuth';
import { navigate } from '../navigation';
import { loadClients } from '../types/clientStorage';
import { loadProjects } from '../types/project';
import { FiArrowLeft, FiArrowRight, FiEye, FiEyeOff, FiUsers, FiLoader, FiBriefcase, FiLock, FiLogOut } from 'react-icons/fi';
import { SettingsLayout, SettingsCard, SettingsField, SettingsFeedback, SettingsSpinner } from '../components/00_UiComps/SettingsLayout';
import kepplerLogo from '../assets/keppler-logo.svg';

const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to complete this action.';

function AuthField({ label, type, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const [visible, setVisible] = useState(false);
  const secret = type === 'password';
  return <label className="flex flex-col gap-2 text-[13px] font-medium text-text-secondary">{label}
    <span className="relative block">
      <input {...props} type={secret && visible ? 'text' : type}
        className={`h-12 w-full rounded-lg border border-input-border bg-background px-3.5 text-sm text-input-text outline-none transition-colors placeholder:text-text-disabled focus:border-primary disabled:opacity-50 ${secret ? 'pr-12' : ''}`} />
      {secret && <button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-text-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
        onClick={() => setVisible(!visible)}>{visible ? <FiEyeOff size={17} /> : <FiEye size={17} />}</button>}
    </span>
  </label>;
}

export function AuthPage({ screen }: { screen: string }) {
  const signup = screen === '/signup';
  const staff = screen === '/staff-login';
  const welcome = screen !== '/signup' && screen !== '/login' && !staff;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? '');
    setBusy(true); setError('');
    try {
      if (signup) {
        if (value('password') !== value('confirmPassword')) throw new Error('Passwords do not match.');
        await createCompany(value('companyName'), value('companyEmail'), value('password'));
      } else if (staff) await staffSignIn(value('companyEmail'), value('accessToken'));
      else await signIn(value('companyEmail'), value('password'));
      navigate('/');
    } catch (error) { setError(message(error)); }
    finally { setBusy(false); }
  }
  return <main className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10 font-montserrat text-text-primary"
    style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--primary) 7%, transparent), transparent 65%)' }}>
    <div className="w-full max-w-[460px]">
      <div className="mb-8 flex items-center justify-center gap-2.5">
        <img src={kepplerLogo} alt="Keppler logo" className="h-10 w-10" />
        <span className="text-lg font-bold tracking-tight">Keppler<span className="text-primary">.</span></span>
      </div>
      <section className="rounded-[20px] border border-border bg-surface p-6 shadow-xl sm:p-9">
      {!welcome && <button type="button" aria-label="Back to welcome" disabled={busy} onClick={() => navigate('/welcome')}
        className="mb-6 inline-flex items-center gap-2 rounded text-xs text-text-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"><FiArrowLeft size={15} />Back</button>}
      <h1 className="text-[26px] leading-tight font-bold tracking-tight">{welcome ? 'Welcome to Keppler' : signup ? 'Create your company' : staff ? 'Staff sign in' : 'Welcome back'}</h1>
      <p className="mt-3 mb-7 text-sm leading-relaxed text-text-tertiary">{welcome ? 'Sign in as staff to access your company workspace.' : signup ? 'Set up a workspace for your company.' : staff ? 'Enter your email and the token provided by your company.' : 'Sign in to your company workspace.'}</p>
      {welcome ? <>
        <Button fullWidth className="h-12 justify-between !text-background hover:!text-text-primary font-semibold" onClick={() => navigate('/staff-login')}>
          <span className="flex items-center gap-3"><FiUsers size={18} aria-hidden="true" />Staff sign in</span><FiArrowRight size={18} aria-hidden="true" />
        </Button>
        <div className="my-6 flex items-center gap-3" aria-hidden="true"><span className="h-px flex-1 bg-border" /><span className="text-[11px] text-text-muted">COMPANY ACCESS</span><span className="h-px flex-1 bg-border" /></div>
        <div className="space-y-3">
          <Button fullWidth variant="secondary" className="h-12" onClick={() => navigate('/login')}>Company sign in</Button>
          <button type="button" className="w-full rounded py-2 text-sm text-text-muted transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary" onClick={() => navigate('/signup')}>Create company</button>
        </div>
      </> : <form onSubmit={submit} onChange={() => setError('')} aria-busy={busy} className="space-y-5">
        <fieldset disabled={busy} className="space-y-4">
          {signup && <AuthField label="Company name" name="companyName" placeholder="Your company" required autoComplete="organization" />}
          <AuthField label={staff ? 'Staff email' : 'Company email'} name="companyEmail" type="email" placeholder="you@company.com" required autoComplete="username" />
          {!staff && <AuthField label="Password" name="password" type="password" placeholder={signup ? 'At least 8 characters' : 'Enter your password'} required minLength={signup ? 8 : undefined} autoComplete={signup ? 'new-password' : 'current-password'} />}
          {signup ? <AuthField label="Confirm password" name="confirmPassword" type="password" placeholder="Re-enter your password" required autoComplete="new-password" />
            : staff && <AuthField label="Access token" name="accessToken" type="password" placeholder="Enter your staff token" required autoComplete="off" />}
          {error && <p role="alert" className="rounded-lg border border-error/20 bg-error/10 px-3 py-2.5 text-xs leading-relaxed text-error">{error}</p>}
          <Button type="submit" fullWidth className="mt-2 h-12 gap-2 !text-background hover:!text-text-primary font-semibold">{busy && <FiLoader className="animate-spin" size={18} aria-hidden="true" />}<span role={busy ? 'status' : undefined}>{busy ? (signup ? 'Creating company...' : 'Signing in...') : signup ? 'Create company' : 'Sign in'}</span>{!busy && <FiArrowRight size={17} aria-hidden="true" />}</Button>
        </fieldset>
        {!staff && <p className="text-center text-xs text-text-muted">{signup ? 'Already have a company account?' : 'New to Keppler?'}{' '}<button type="button" disabled={busy} className="rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => navigate(signup ? '/login' : '/signup')}>{signup ? 'Sign in' : 'Create company'}</button></p>}
      </form>}
      </section>
    </div>
  </main>;
}

export function CompanySettings({ company }: { company: Company }) {
  const [name, setName] = useState(company.companyName);
  const [email, setEmail] = useState(company.companyEmail);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const dirty = name !== company.companyName || email !== company.companyEmail;
  async function run(key: string, action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(key); setError(''); setNotice('');
    try { await action(); setNotice(success); }
    catch (error) { setError(message(error)); }
    finally { setBusy(''); }
  }
  return <SettingsLayout title="Company Settings" description="Manage your company details, password, and workspace sessions.">
    <SettingsFeedback error={error} notice={notice} />
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <SettingsCard icon={<FiBriefcase size={19} />} title="Company information" description="The name and email used for your company account.">
        <form aria-label="Company information" aria-busy={busy === 'info'} onSubmit={event => {
          event.preventDefault();
          void run('info', async () => { const saved = await updateCompany({ companyName: name.trim(), companyEmail: email.trim() }); setName(saved.companyName); setEmail(saved.companyEmail); }, 'Company information saved.');
        }}>
          <fieldset disabled={!!busy} className="space-y-5">
            <SettingsField label="Company name" name="name" autoComplete="organization" maxLength={200} required value={name} onChange={event => { setName(event.target.value); setNotice(''); }} />
            <SettingsField label="Company email" name="email" type="email" autoComplete="email" maxLength={320} required value={email} onChange={event => { setEmail(event.target.value); setNotice(''); }} />
            <div className="border-t border-divider pt-5"><Button type="submit" disabled={!dirty} className="gap-2 !py-2">{busy === 'info' && <SettingsSpinner />}{busy === 'info' ? 'Saving...' : 'Save information'}</Button></div>
          </fieldset>
        </form>
      </SettingsCard>
      <SettingsCard icon={<FiLock size={19} />} title="Company password" description="Changing your password also signs out other workspace sessions.">
        <form aria-label="Change company password" aria-busy={busy === 'password'} onSubmit={event => {
          event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
          void run('password', async () => {
            if (data.get('password') !== data.get('confirm')) throw new Error('Passwords do not match.');
            await updateCompany({ currentPassword: String(data.get('current')), password: String(data.get('password')) }); form.reset();
          }, 'Password changed. Other sessions signed out.');
        }}>
          <fieldset disabled={!!busy} className="space-y-5">
            <AuthField label="Current password" name="current" type="password" autoComplete="current-password" required />
            <AuthField label="New password" name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required />
            <AuthField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required />
            <div className="border-t border-divider pt-5"><Button type="submit" className="gap-2 !py-2">{busy === 'password' && <SettingsSpinner />}{busy === 'password' ? 'Updating...' : 'Change password'}</Button></div>
          </fieldset>
        </form>
      </SettingsCard>
    </div>
    <SettingsCard icon={<FiLogOut size={19} />} title="Your session" description="Sign out of your company workspace on this device.">
      <Button variant="delete" className="gap-2 !py-2" disabled={!!busy} onClick={() => { void run('signout', async () => { await signOut(); navigate('/welcome'); }, 'Signed out.'); }}>{busy === 'signout' ? <SettingsSpinner /> : <FiLogOut size={16} />}{busy === 'signout' ? 'Signing out...' : 'Sign out'}</Button>
    </SettingsCard>
  </SettingsLayout>;
}

export function CompanyProjects() {
  const clients = loadClients();
  return <main className="p-6 text-text-primary"><h1 className="mb-4 text-2xl font-bold">Projects</h1>
    {clients.flatMap(client => loadProjects(client.id).map(project => <button className="mb-2 block text-left underline" key={project.id} onClick={() => navigate(`/project?clientId=${encodeURIComponent(client.id)}`)}>{project.name} · {client.name}</button>))}
    {!clients.some(client => loadProjects(client.id).length) && <p className="text-text-secondary">Create a client on Home, then add a project.</p>}
  </main>;
}

