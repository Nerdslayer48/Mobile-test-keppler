import { useEffect, useState } from 'react'
import App from './App'
import { ModalTestPage } from './pages/ModalTestPage'
import { Project } from './components/02_Body/Project'
import { NewProject } from './components/03_PopUps/NewProject'
import { ProjectWorkspace } from './components/02_Body/ProjectWorkspace'
import { ProjectInfo } from './components/03_PopUps/ProjectInfo'
import { ToolBar } from './components/03_PopUps/ToolBar'
import { Card } from './components/02_Body/Card'
import { currentRoute } from './navigation'
import { AuthPage, CompanySettings, CompanyProjects } from './pages/CompanyPages'
import { CompanyStaff } from './pages/CompanyStaff'
import { StaffSettings } from './pages/StaffSettings'
import { Header } from './components/01_Heads/Header'
import { startupCompany, sessionExpiresAt, endLocalSession, isCompanyAdmin } from './types/companyAuth'
import type { Company } from './types/companyAuth'

export function AppRouter() {
  const [route, setRoute] = useState(() => currentRoute().href)
  const [company, setCompany] = useState<Company | null>(startupCompany)
  const [storageError, setStorageError] = useState(false)
  useEffect(() => {
    const syncSession = () => setCompany(startupCompany())
    const authChanged = () => { syncSession(); setStorageError(false) }
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'keppler.onlineSession' || event.key === 'keppler.authChanged' || event.key === null) syncSession()
    }
    const failedSave = () => setStorageError(true)
    const saved = () => setStorageError(false)
    window.addEventListener('company-auth-changed', authChanged)
    window.addEventListener('company-session-expired', endLocalSession)
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', syncSession)
    window.addEventListener('company-storage-saved', saved)
    window.addEventListener('company-storage-error', failedSave)
    return () => {
      window.removeEventListener('company-auth-changed', authChanged)
      window.removeEventListener('company-session-expired', endLocalSession)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', syncSession)
      window.removeEventListener('company-storage-saved', saved)
      window.removeEventListener('company-storage-error', failedSave)
    }
  }, [])
  useEffect(() => {
    const expiresAt = sessionExpiresAt()
    if (!company || !expiresAt) return
    const timer = window.setTimeout(endLocalSession, Math.max(0, Math.min(expiresAt - Date.now(), 2147483647)))
    return () => window.clearTimeout(timer)
  }, [company])
  useEffect(() => {
    const update = () => setRoute(currentRoute().href)
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  const pages = {
    '/modal-test': ModalTestPage,
    '/project': Project,
    '/NewProject.tsx': NewProject,
    '/workspace': ProjectWorkspace,
    '/ProjectInfo.tsx': ProjectInfo,
    '/ToolBar.tsx': ToolBar,
    '/Card.tsx': Card,
  }
  const pathname = new URL(route).pathname
  if (!company) return <AuthPage key={pathname} screen={pathname} />
  const Page = pages[pathname as keyof typeof pages]
  const companyPage = ['/settings', '/projects'].includes(pathname)
  return <div key={company.id}>
    {companyPage && <Header companyName={company.companyName} showClientActions={false} />}
    {storageError && <p role="alert" className="p-3 text-error">Unable to save workspace data. Check your connection. If this workspace changed on another device, reload before editing.</p>}
    {pathname === '/settings' ? (isCompanyAdmin() ? <CompanySettings company={company} /> : <StaffSettings />)
      : pathname === '/projects' ? <CompanyProjects />
      : pathname === '/staff' ? <CompanyStaff companyName={company.companyName} />
      : Page ? <Page key={`${company.id}:${route}`} /> : <App key={`${company.id}:${route}`} companyName={company.companyName} />}
  </div>
}
