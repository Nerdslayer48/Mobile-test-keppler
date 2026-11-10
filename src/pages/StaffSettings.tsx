import { useEffect, useState } from 'react';
import { FiLogOut, FiUser } from 'react-icons/fi';
import { Button } from '../components/00_UiComps/Button';
import { ClientPicturePicker } from '../components/00_UiComps/ClientPicturePicker';
import { SettingsLayout, SettingsCard, SettingsField, SettingsFeedback, SettingsSpinner } from '../components/00_UiComps/SettingsLayout';
import { getStaffProfile, saveStaffProfile, signOut } from '../types/companyAuth';
import { ApiError } from '../types/api';
import type { StaffMember } from '../types/companyAuth';
import { navigate } from '../navigation';

export function StaffSettings() {
  const [profile, setProfile] = useState<StaffMember | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [picture, setPicture] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadRetry, setLoadRetry] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const acceptProfile = (member: StaffMember) => { setProfile(member); setName(member.name); setEmail(member.email); setPicture(member.profilePicture ?? ''); };
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    getStaffProfile().then(member => { if (!cancelled) acceptProfile(member); })
      .catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : 'Unable to load your profile. Try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadRetry]);
  const dirty = !!profile && (name !== profile.name || email !== profile.email || picture !== (profile.profilePicture ?? ''));
  const changed = () => { setNotice(''); setError(''); };
  return <SettingsLayout title="Staff Settings" description="Manage your profile and how you appear in your company workspace.">
    <SettingsFeedback error={error} notice={notice} />
    {loading ? <div role="status" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-8 text-sm text-text-secondary"><SettingsSpinner />Loading your profile...</div>
      : profile ? <SettingsCard icon={<FiUser size={19} />} title="Your profile" description="Keep your photo, name, and sign-in email up to date.">
        <form aria-label="Staff profile" aria-busy={busy === 'save'} onSubmit={async event => {
          event.preventDefault(); if (busy || !dirty) return;
          setBusy('save'); setError(''); setNotice('');
          try { acceptProfile(await saveStaffProfile({ name: name.trim(), email: email.trim(), profilePicture: picture })); setNotice('Profile updated.'); }
          catch (error) { setError(error instanceof ApiError && error.status === 409 ? 'This email is already in use. Choose another email.' : error instanceof Error ? error.message : 'Unable to save your profile. Please try again.'); }
          finally { setBusy(''); }
        }}>
          <fieldset disabled={!!busy}>
            <div className="flex flex-col items-start gap-8 sm:flex-row">
              <div><p className="mb-3 text-xs font-medium text-text-muted">PROFILE PHOTO</p><ClientPicturePicker subject="Staff" clientType="individual" value={picture} onChange={value => { setPicture(value); changed(); }} /></div>
              <div className="w-full min-w-0 flex-1 space-y-5">
                <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">Personal information</span>{profile.role && <span className="rounded-full border border-button-border bg-button-bg px-3 py-1 text-[11px] text-text-secondary">{profile.role}</span>}</div>
                <SettingsField label="Full name" name="staffName" autoComplete="name" required maxLength={200} value={name} onChange={event => { setName(event.target.value); changed(); }} />
                <SettingsField label="Email address" name="staffEmail" type="email" autoComplete="email" required maxLength={320} value={email} onChange={event => { setEmail(event.target.value); changed(); }} hint="Use this email with your existing staff token the next time you sign in." />
              </div>
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-divider pt-5">
              <p className="text-xs text-text-muted">{dirty ? 'You have unsaved changes.' : 'Your profile is up to date.'}</p>
              <div className="flex gap-3">{dirty && <Button variant="secondary" onClick={() => { acceptProfile(profile); changed(); }}>Discard changes</Button>}
                <Button type="submit" disabled={!dirty} className="gap-2 !py-2">{busy === 'save' && <SettingsSpinner />}{busy === 'save' ? 'Saving...' : 'Save changes'}</Button></div>
            </div>
          </fieldset>
        </form>
      </SettingsCard> : <Button variant="secondary" onClick={() => setLoadRetry(value => value + 1)}>Try again</Button>}
    <SettingsCard icon={<FiLogOut size={19} />} title="Your session" description="Sign out of your company workspace on this device.">
      <Button variant="delete" className="gap-2 !py-2" disabled={!!busy} onClick={async () => {
        setBusy('signout'); setError(''); setNotice('');
        try { await signOut(); navigate('/welcome'); }
        catch (error) { setError(error instanceof Error ? error.message : 'Unable to sign out. Please try again.'); setBusy(''); }
      }}>{busy === 'signout' ? <SettingsSpinner /> : <FiLogOut size={16} />}{busy === 'signout' ? 'Signing out...' : 'Sign out'}</Button>
    </SettingsCard>
  </SettingsLayout>;
}
