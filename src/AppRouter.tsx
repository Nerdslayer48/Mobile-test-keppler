import { useEffect, useState } from 'react'
import App from './App'
import { ModalTestPage } from './pages/ModalTestPage'
import { Project } from './components/02_Body/Project'
import { NewProject } from './components/03_PopUps/NewProject'
import { ProjectWorkspace } from './components/02_Body/ProjectWorkspace'
import { ProjectInfo } from './components/03_PopUps/ProjectInfo'
import { ToolBar } from './components/03_PopUps/ToolBar'
import { currentRoute } from './navigation'

export function AppRouter() {
  const [route, setRoute] = useState(() => currentRoute().href)
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
  }
  const pathname = new URL(route).pathname
  const Page = pages[pathname as keyof typeof pages] ?? App
  return <Page key={route} />
}
