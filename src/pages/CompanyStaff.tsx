import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { FiUser, FiShield, FiTrash2, FiLoader } from 'react-icons/fi';
import { Button } from '../components/00_UiComps/Button';
import { Input } from '../components/00_UiComps/Input';
import { Header } from '../components/01_Heads/Header';
import { addStaff, loadStaff, isCompanyAdmin, deleteStaff, setStaffAccess } from '../types/companyAuth';
import type { StaffMember } from '../types/companyAuth';
import { navigate } from '../navigation';

export function CompanyStaff({ companyName }: { companyName: string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const admin = isCompanyAdmin();
  const [visibleToken, setVisibleToken] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let cancelled = false;
    loadStaff().then(members => { if (!cancelled) setStaff(members); }).catch(() => { if (!cancelled) setError('Unable to load staff.'); });
    return () => { cancelled = true; };
  }, []);
  const query = search.trim().toLowerCase();
  const visible = staff.filter(member => `${member.name} ${member.email} ${member.role ?? ''}`.toLowerCase().includes(query));
  return <>
    <Header companyName={companyName} showClientActions={false}>
      <Input type="search" placeholder="Search staff" aria-label="Search staff" value={search} onChange={event => setSearch(event.target.value)} />
      {admin ? <Button variant="primary" onClick={() => { setError(''); setAdding(true); }}>+ New Staff</Button>
        : <Button variant="secondary" onClick={() => navigate('/settings')}>Settings</Button>}
    </Header>
    <main className="mt-[32px] text-text-primary">
    {!adding && error && <p role="alert" className="mx-[50px] mb-3 text-error">{error}</p>}
    {notice && <p role="status" className="mx-[50px] mb-3 text-sm text-primary">{notice}</p>}
    {admin && visibleToken && <StaffTokenModal member={staff.find(member => member.id === visibleToken)!} onDismiss={() => setVisibleToken(null)}
      onUpdate={member => setStaff(current => current.map(item => item.id === member.id ? member : item))}
      onRemove={member => { setVisibleToken(null); setStaff(current => current.filter(item => item.id !== member.id)); setNotice(`${member.name} deleted. Their access has been revoked.`); }} /> }
    <div aria-label="Staff members" className="bg-surface h-screen mx-[50px] rounded-tl-[16px] rounded-tr-[16px] pt-[20px] border-border border-1 border-b-0 flex flex-col min-w-[1340px]">
      <div className="flex pl-[40px] pr-[350px] pb-5 font-montserrat text-[13px] font-semibold"><span className="min-w-[300px] flex-1">Staff</span><span className="w-[300px] shrink-0">Email</span><span className="w-[250px] shrink-0">Role</span><span className="w-[200px] shrink-0 text-right">Date Added</span></div>
      {visible.map(member => <div key={member.id} role={admin ? 'button' : undefined} tabIndex={admin ? 0 : undefined} aria-label={admin ? `Show login token for ${member.name}` : undefined} className={`flex w-full pl-[40px] pr-[350px] py-5 ${admin ? 'cursor-pointer hover:bg-border focus-visible:outline-2 focus-visible:outline-primary' : ''}`} onClick={() => { if (admin) setVisibleToken(member.id); }} onKeyDown={event => { if (admin && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setVisibleToken(member.id); } }}><span className="flex min-w-[300px] flex-1 items-center gap-[14px] font-montserrat font-semibold"><span className="flex h-[48px] w-[48px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-button-border bg-button-bg text-button-text">{member.profilePicture ? <img src={member.profilePicture} alt={`${member.name} profile`} className="h-full w-full object-cover" /> : <FiUser size={24} aria-hidden="true" />}</span><span>{member.name}{member.accessRevoked && <span className="mt-1 block text-[11px] font-normal text-error">Access revoked</span>}</span></span><span className="w-[300px] shrink-0 text-text-secondary">{member.email}</span><span className="w-[250px] shrink-0 text-text-secondary">{member.role || '—'}</span><span className="w-[200px] shrink-0 text-right text-text-secondary">{member.createdAt && !Number.isNaN(Date.parse(member.createdAt)) ? format(new Date(member.createdAt), 'MMM d, yyyy') : '—'}</span></div>)}
      {!query && !staff.length && <p className="px-[40px] py-5 text-sm text-text-muted">No staff members yet.</p>}
      {query && !visible.length && <p className="px-[40px] py-5 text-text-muted">No matching staff.</p>}
    </div>
    {adding && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form role="dialog" aria-modal="true" aria-labelledby="new-staff-title" className="w-full max-w-sm space-y-4 rounded-[16px] border border-border-strong bg-background p-6"
        onSubmit={async event => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const name = String(data.get('name') ?? '').trim();
          const email = String(data.get('email') ?? '').trim();
          const role = String(data.get('role') ?? '').trim();
          if (!name) { setError('Enter a staff name.'); return; }
          setSaving(true); setError('');
          try { const member = await addStaff({ name, email, role }); setStaff(current => [...current, member]); setVisibleToken(member.id); setAdding(false); }
          catch (error) { setError(error instanceof Error ? error.message : 'Unable to save staff. Please try again.'); }
          finally { setSaving(false); }
        }}>
        <h2 id="new-staff-title" className="font-montserrat text-xl font-bold">New staff</h2>
        <label className="block">Name<Input name="name" placeholder="Staff name" autoFocus required className="mt-2 !w-full" /></label>
        <label className="block">Email<Input name="email" type="email" placeholder="Email address" required className="mt-2 !w-full" /></label>
        <label className="block">Role<Input name="role" placeholder="Staff role" className="mt-2 !w-full" /></label>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add staff'}</Button><Button variant="secondary" disabled={saving} onClick={() => setAdding(false)}>Cancel</Button></div>
      </form>
    </div>}
    </main>
  </>;
}

function StaffTokenModal({ member, onDismiss, onUpdate, onRemove }: { member: StaffMember; onDismiss: () => void; onUpdate: (member: StaffMember) => void; onRemove: (member: StaffMember) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const tokenInput = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<'delete' | 'revoke' | null>(null);
  const [busy, setBusy] = useState(false);
  async function copyToken() {
    setError('');
    try { await navigator.clipboard.writeText(member.accessToken ?? ''); setCopied(true); }
    catch {
      tokenInput.current?.focus(); tokenInput.current?.select();
      if (document.execCommand('copy')) setCopied(true);
      else setError('Unable to copy automatically. Select the token and copy it manually.');
    }
  }
  async function act(action: 'delete' | 'revoke' | 'restore') {
    if (busy) return;
    setBusy(true); setError(''); setNotice(''); setCopied(false);
    try {
      if (action === 'delete') { await deleteStaff(member.id); onRemove(member); }
      else { onUpdate(await setStaffAccess(member.id, action === 'revoke')); setConfirm(null); setNotice(action === 'revoke' ? 'Access revoked. All staff sessions have been signed out.' : 'Access restored. Share the new token with this staff member.'); }
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to update staff. Please try again.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    const element = dialog.current; element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} aria-labelledby="staff-token-title" onCancel={event => { if (busy) event.preventDefault(); }} onClose={() => {
    if (!dialog.current?.open) onDismiss();
  }} onClick={event => { if (!busy && event.target === event.currentTarget) dialog.current?.close(); }}
    className="fixed inset-0 m-auto w-[560px] max-w-[calc(100vw-32px)] rounded-2xl border border-border-strong bg-surface p-0 font-montserrat text-text-primary backdrop:bg-black/50">
    <div className="space-y-5 p-6">
      <header><div className="flex items-center justify-between gap-3"><h2 id="staff-token-title" className="text-lg font-semibold">{member.name}</h2><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] ${member.accessRevoked ? 'border-error/30 bg-error/10 text-error' : 'border-primary/30 bg-primary/10 text-primary'}`}>{member.accessRevoked ? 'Access revoked' : 'Active'}</span></div><p className="mt-1 break-all text-sm text-text-muted">{member.email}</p>{member.role && <p className="mt-2 text-xs text-text-secondary">{member.role}</p>}</header>
      {!member.accessRevoked ? <label className="block text-sm">Access token for {member.email}
        <input ref={tokenInput} aria-label="Staff access token" readOnly value={member.accessToken ?? ''} onFocus={event => event.currentTarget.select()} className="mt-2 block h-11 w-full rounded-lg border border-input-border bg-background px-3 text-xs text-input-text" />
      </label> : <p className="rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-text-secondary">This staff member cannot sign in or access company data. Restore access to issue a new login token.</p>}
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      {notice && <p role="status" className="text-sm leading-relaxed text-primary">{notice}</p>}
      {copied && <p role="status" className="text-sm text-primary">Token copied.</p>}
      <div className="flex flex-wrap gap-3 border-t border-divider pt-5">
        {member.accessRevoked ? <Button variant="secondary" disabled={busy} className="gap-2 !px-3 !text-sm" onClick={() => void act('restore')}><FiShield size={15} />Restore access</Button>
          : <Button variant="secondary" disabled={busy} className="gap-2 !px-3 !text-sm" onClick={() => { setConfirm('revoke'); setError(''); }}><FiShield size={15} />Revoke access</Button>}
        <Button variant="secondary" disabled={busy} className="gap-2 !px-3 !text-sm !text-error" onClick={() => { setConfirm('delete'); setError(''); }}><FiTrash2 size={15} />Delete staff</Button>
      </div>
      {confirm && <div className="space-y-3 rounded-xl border border-error/25 bg-error/10 p-4">
        <h3 className="text-sm font-semibold">{confirm === 'delete' ? 'Delete this staff member?' : 'Revoke access for this staff member?'}</h3>
        <p className="text-xs leading-relaxed text-text-secondary">{confirm === 'delete' ? 'Their profile and login token will be permanently deleted, and all their active sessions will end. Company projects and media will stay in your workspace.' : 'All their active sessions will end and their token will stop working. You can restore access later with a new token.'}</p>
        <div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={busy} className="!px-3 !text-sm" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="delete" disabled={busy} className="gap-2 !px-3 !text-sm" onClick={() => void act(confirm)}>{busy && <FiLoader className="animate-spin" />}{busy ? 'Please wait...' : confirm === 'delete' ? 'Confirm delete' : 'Confirm revoke'}</Button></div>
      </div>}
      <div className="flex justify-end gap-2 border-t border-divider pt-5"><Button variant="secondary" disabled={busy} onClick={() => dialog.current?.close()}>Close</Button>{!member.accessRevoked && <Button variant="primary" disabled={busy} onClick={() => { void copyToken(); }}>{copied ? 'Copied' : 'Copy token'}</Button>}</div>
    </div>
  </dialog>;
}
