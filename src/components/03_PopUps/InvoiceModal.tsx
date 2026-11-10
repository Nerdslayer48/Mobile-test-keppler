import inter400 from '@fontsource/inter/files/inter-latin-400-normal.woff2?inline';
import inter600 from '@fontsource/inter/files/inter-latin-600-normal.woff2?inline';
import inter700 from '@fontsource/inter/files/inter-latin-700-normal.woff2?inline';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
﻿import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { FiLoader, FiX } from 'react-icons/fi';
import { Button } from '../00_UiComps/Button';
import type { Client } from '../../types/client';
import { loadProjects } from '../../types/project';
import { currentCompany } from '../../types/companyAuth';
import { invoiceTotals, money } from '../../types/invoice';

interface Line { id: string; projectId: string; project: string; description: string; amount: string }
const input = 'w-full rounded border border-input-border bg-input-bg px-3 py-2 text-sm text-input-text';
const fontEmbedCSS = [[400, inter400], [600, inter600], [700, inter700]].map(([weight, url]) => `@font-face { font-family: Inter; font-style: normal; font-weight: ${weight}; src: url("${url}") format("woff2"); }`).join('\n');
const cell: CSSProperties = { padding: 12, borderBottom: '1px solid #e5e5e5', verticalAlign: 'top', overflowWrap: 'anywhere' };

export function InvoiceModal({ client, projectIds, chooseProjects = false, onClose }: {
  client: Client; projectIds?: string[]; chooseProjects?: boolean; onClose: () => void;
}) {
  const [projects] = useState(() => loadProjects(client.id));
  const [picking, setPicking] = useState(chooseProjects);
  const [selected, setSelected] = useState(() => projectIds ?? projects.map(project => project.id));
  const [lines, setLines] = useState<Line[]>(() => projects.filter(project => (projectIds ?? projects.map(item => item.id)).includes(project.id))
    .map(project => ({ id: crypto.randomUUID(), projectId: project.id, project: project.name, description: '', amount: '' })));
  const [companyName, setCompanyName] = useState(() => currentCompany()?.companyName ?? '');
  const [customerName, setCustomerName] = useState(client.name);
  const [address, setAddress] = useState(client.clientType === 'company' ? client.companyAddress : client.address);
  const [contact, setContact] = useState([client.email, client.phone || client.hotline].filter(Boolean).join(' · '));
  const [date, setDate] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
  const [tax, setTax] = useState('0');
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const preview = useRef<HTMLDivElement>(null);
  const totals = invoiceTotals(lines.map(line => line.amount), tax);
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / 5)) }, (_, index) => lines.slice(index * 5, index * 5 + 5));
  const valid = date && companyName.trim() && customerName.trim() && lines.every(line => line.amount === '' || (Number.isFinite(Number(line.amount)) && Number(line.amount) >= 0)) && Number(tax) >= 0 && Number(tax) <= 100;
  const formattedDate = date ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`)) : '';
  const update = (id: string, patch: Partial<Line>) => setLines(current => current.map(line => line.id === id ? { ...line, ...patch } : line));
  function applyProjects() {
    setLines(current => projects.filter(project => selected.includes(project.id)).map(project => current.find(line => line.projectId === project.id)
      ?? { id: crypto.randomUUID(), projectId: project.id, project: project.name, description: '', amount: '' }));
    setPicking(false);
  }
  async function download(kind: 'pdf' | 'png') {
    if (!preview.current || !valid || busy) return;
    setBusy(kind); setError('');
    try {
      const { toCanvas } = await import('html-to-image');
      await document.fonts.ready;
      const nodes = Array.from(preview.current.querySelectorAll<HTMLElement>('[data-invoice-page]'));
      const canvases = [];
      for (const node of nodes) canvases.push(await toCanvas(node, { pixelRatio: 2, backgroundColor: '#fff', fontEmbedCSS }));
      const name = `Invoice-${customerName.replace(/[^\p{L}\p{N} -]/gu, '').slice(0, 60) || 'customer'}-${date}`;
      if (kind === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        canvases.forEach((canvas, index) => {
          if (index) pdf.addPage();
          const scale = Math.min(210 / canvas.width, 297 / canvas.height);
          const width = canvas.width * scale, height = canvas.height * scale;
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (210 - width) / 2, 0, width, height, undefined, 'FAST');
        });
        pdf.save(`${name}.pdf`);
      } else {
        // One image includes all pages, so multi-page invoices never drop line items.
        const canvas = document.createElement('canvas');
        canvas.width = canvases[0].width; canvas.height = canvases.reduce((sum, page) => sum + page.height, 0);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Image export is unavailable.');
        let top = 0;
        for (const page of canvases) { context.drawImage(page, 0, top); top += page.height; }
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to create image.')), 'image/png'));
        const url = URL.createObjectURL(blob); const link = document.createElement('a');
        link.href = url; link.download = `${name}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to export invoice. Please try again.'); }
    finally { setBusy(''); }
  }
  return createPortal(<div className="fixed inset-0 z-[100] overflow-auto bg-black/60 p-6 font-montserrat text-text-primary">
    <section role="dialog" aria-modal="true" aria-label={picking ? 'Select invoice projects' : 'Invoice editor'} className="mx-auto max-w-[1320px] rounded-xl border border-border bg-background p-6"
      onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose(); } }}>
      <header className="mb-6 flex items-center justify-between gap-4"><h1 className="text-xl font-semibold">{picking ? 'Select projects for invoice' : 'New invoice'}</h1>
        <button autoFocus type="button" disabled={!!busy} aria-label="Close invoice" className="p-2 hover:bg-button-bg" onClick={onClose}><FiX size={24} /></button></header>
      {picking ? <><p className="mb-4 text-sm text-text-secondary">Choose the projects to include for {client.name}.</p>
        <div className="mb-6 space-y-2">{projects.map(project => <label key={project.id} className="flex cursor-pointer items-center gap-3 rounded border border-border bg-surface p-4">
          <input type="checkbox" checked={selected.includes(project.id)} onChange={event => setSelected(current => event.target.checked ? [...current, project.id] : current.filter(id => id !== project.id))} />{project.name}</label>)}
          {!projects.length && <p className="text-text-muted">No projects yet. You can add blank rows in the invoice.</p>}</div>
        <Button onClick={applyProjects}>Create invoice{selected.length ? ` (${selected.length})` : ''}</Button></> : <>
      <div className="mb-5 flex flex-wrap items-center gap-3"><Button variant="secondary" disabled={!!busy} onClick={() => { setSelected(lines.map(line => line.projectId)); setPicking(true); }}>Choose projects</Button>
        <Button disabled={!!busy || !valid} onClick={() => void download('pdf')}>{busy === 'pdf' && <FiLoader className="animate-spin" />} {busy === 'pdf' ? 'Creating PDF...' : 'Download PDF'}</Button>
        <Button variant="secondary" disabled={!!busy || !valid} onClick={() => void download('png')}>{busy === 'png' && <FiLoader className="animate-spin" />} {busy === 'png' ? 'Creating image...' : 'Download image'}</Button>
        <span className="text-xs text-text-muted">NGN · A4 portrait</span></div>
      {error && <p role="alert" className="mb-4 text-sm text-error">{error}</p>}
      <div className="flex flex-wrap items-start gap-6">
        <fieldset disabled={!!busy} className="min-w-0 flex-1 space-y-4" style={{ minWidth: 260 }}>
          <label className="block text-sm">Company name<input aria-label="Invoice company name" value={companyName} onChange={event => setCompanyName(event.target.value)} className={input} /></label>
          <label className="block text-sm">Company logo<input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-xs" onChange={async event => {
            const file = event.target.files?.[0]; if (!file) return;
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a PNG, JPG, or WebP image under 5 MB.'); return; }
            const reader = new FileReader(); reader.onload = () => { setLogo(String(reader.result)); setError(''); }; reader.onerror = () => setError('Unable to read logo.'); reader.readAsDataURL(file);
          }} /></label>
          {logo && <button type="button" className="text-xs underline" onClick={() => setLogo('')}>Remove logo</button>}
          <label className="block text-sm">Customer name<input aria-label="Invoice customer name" value={customerName} onChange={event => setCustomerName(event.target.value)} className={input} /></label>
          <label className="block text-sm">Address<textarea aria-label="Invoice address" rows={3} value={address} onChange={event => setAddress(event.target.value)} className={input} /></label>
          <label className="block text-sm">Contact<input aria-label="Invoice contact" value={contact} onChange={event => setContact(event.target.value)} className={input} /></label>
          <label className="block text-sm">Date<input aria-label="Invoice date" type="date" value={date} onChange={event => setDate(event.target.value)} className={input} /></label>
          {lines.map((line, index) => <div key={line.id} className="space-y-2 rounded border border-border bg-surface p-3">
            <div className="flex items-center justify-between text-sm"><strong>Item {index + 1}</strong><button type="button" aria-label={`Remove invoice item ${index + 1}`} onClick={() => setLines(current => current.filter(item => item.id !== line.id))}><FiX /></button></div>
            <input aria-label={`Project ${index + 1}`} placeholder="Project" maxLength={100} value={line.project} onChange={event => update(line.id, { project: event.target.value })} className={input} />
            <textarea aria-label={`Description ${index + 1}`} placeholder="Description" maxLength={300} value={line.description} onChange={event => update(line.id, { description: event.target.value })} className={input} />
            <input aria-label={`Amount ${index + 1}`} placeholder="Amount (NGN)" type="number" min="0" step="0.01" value={line.amount} onChange={event => update(line.id, { amount: event.target.value })} className={input} />
          </div>)}
          <Button variant="secondary" onClick={() => setLines(current => [...current, { id: crypto.randomUUID(), projectId: '', project: '', description: '', amount: '' }])}>+ Add row</Button>
          <label className="block text-sm">Tax (%)<input aria-label="Invoice tax rate" type="number" min="0" max="100" step="0.01" value={tax} onChange={event => setTax(event.target.value)} className={input} /></label>
          {!valid && <p className="text-sm text-error">Enter company/customer names, a date, non-negative amounts, and a tax rate from 0 to 100.</p>}
        </fieldset>
        <div className="max-w-full overflow-auto"><div ref={preview} className="space-y-6">
          {pages.map((page, pageIndex) => <article key={pageIndex} data-invoice-page aria-label={`Invoice page ${pageIndex + 1}`} style={{ boxSizing: 'border-box', width: 794, minHeight: 1123, padding: 40, background: '#fff', color: '#222', fontFamily: 'Inter, Arial, sans-serif', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 32 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}><div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
              {logo && <img src={logo} alt="Company logo" style={{ width: 64, height: 64, objectFit: 'contain' }} />}<strong style={{ fontSize: 24, overflowWrap: 'anywhere' }}>{companyName}</strong></div>
              <strong style={{ fontSize: 36, color: '#333', flexShrink: 0 }}>INVOICE</strong></header>
            <section style={{ display: 'flex', justifyContent: 'space-between', gap: 32 }}><div style={{ maxWidth: '65%', overflowWrap: 'anywhere' }}><p style={{ fontWeight: 600, marginBottom: 10 }}>Invoice to</p><strong>{customerName}</strong><p style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{address}</p><p style={{ marginTop: 8 }}>{contact}</p></div><div style={{ textAlign: 'right' }}><strong>Date</strong><p style={{ marginTop: 8 }}>{formattedDate}</p></div></section>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}><colgroup><col style={{ width: '8%' }} /><col style={{ width: '42%' }} /><col style={{ width: '25%' }} /><col style={{ width: '25%' }} /></colgroup>
              <thead><tr style={{ background: '#333', color: '#fff' }}>{['S/N', 'Description', 'Project', 'Amount'].map((label, index) => <th key={label} style={{ padding: 12, fontWeight: 600, textAlign: index === 0 ? 'center' : index === 3 ? 'right' : 'left' }}>{label}</th>)}</tr></thead>
              <tbody>{page.map((line, index) => <tr key={line.id} style={{ background: index % 2 ? '#f8f8f8' : '#fff' }}><td style={{ ...cell, textAlign: 'center' }}>{pageIndex * 5 + index + 1}</td><td style={{ ...cell, whiteSpace: 'pre-wrap' }}>{line.description || '\u00a0'}</td><td style={cell}>{line.project}</td><td style={{ ...cell, textAlign: 'right' }}>{line.amount === '' ? '' : money(Number(line.amount))}</td></tr>)}</tbody></table>
            {pageIndex === pages.length - 1 && <div style={{ width: 320, marginLeft: 'auto', display: 'grid', gap: 12 }}>
              {[['Subtotal', money(totals.subtotal)], [`Tax (${tax || 0}%)`, money(totals.tax)]].map(([label, value]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span>{label}</span><span>{value}</span></div>)}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #333', paddingTop: 12, fontWeight: 700, fontSize: 20 }}><span>Total</span><span>{money(totals.total)}</span></div></div>}
            <footer style={{ marginTop: 'auto', paddingTop: 32, textAlign: 'center', color: '#777', fontSize: 12 }}>Thank you for your business.{pages.length > 1 && <div style={{ marginTop: 8 }}>{pageIndex + 1} / {pages.length}</div>}</footer>
          </article>)}
        </div></div>
      </div></>}
    </section>
  </div>, document.body);
}
