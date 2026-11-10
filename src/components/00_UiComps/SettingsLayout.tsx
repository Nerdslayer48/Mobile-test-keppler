import type { InputHTMLAttributes, ReactNode } from 'react';
import { FiAlertCircle, FiCheckCircle, FiLoader } from 'react-icons/fi';

export function SettingsLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="mx-auto w-full max-w-[1180px] px-6 pt-10 pb-16 font-montserrat text-text-primary sm:px-10">
    <header className="mb-8"><p className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-text-muted">SETTINGS</p>
      <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1><p className="mt-2 text-sm leading-relaxed text-text-muted">{description}</p></header>
    <div className="space-y-6">{children}</div>
  </main>;
}
export function SettingsCard({ title, description, icon, children }: { title: string; description: string; icon: ReactNode; children: ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-border bg-surface p-6 sm:p-7">
    <div className="mb-6 flex items-start gap-3.5"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-secondary">{icon}</span>
      <div><h2 className="text-base font-semibold">{title}</h2><p className="mt-1 text-xs leading-relaxed text-text-muted">{description}</p></div></div>{children}
  </section>;
}
export function SettingsField({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <label className="flex min-w-0 flex-col gap-2 text-[13px] font-medium text-text-secondary">{label}
    <input {...props} className="h-11 w-full min-w-0 rounded-lg border border-input-border bg-background px-3.5 text-sm font-normal text-input-text transition-colors placeholder:text-text-disabled focus:border-primary disabled:opacity-50" />
    {hint && <span className="text-xs leading-relaxed font-normal text-text-muted">{hint}</span>}
  </label>;
}
export function SettingsFeedback({ error, notice }: { error: string; notice: string }) {
  return <>{error && <p role="alert" className="flex items-start gap-2.5 rounded-xl border border-error/25 bg-error/10 p-4 text-sm leading-relaxed text-error"><FiAlertCircle className="mt-0.5 shrink-0" size={17} />{error}</p>}
    {notice && <p role="status" className="flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm leading-relaxed text-primary"><FiCheckCircle className="mt-0.5 shrink-0" size={17} />{notice}</p>}</>;
}
export function SettingsSpinner() { return <FiLoader size={16} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />; }
