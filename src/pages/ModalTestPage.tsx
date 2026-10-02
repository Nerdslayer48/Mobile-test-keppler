import { navigate } from "../navigation";
import { NewClient } from "../components/03_PopUps/NewClient"
import { Button } from "../components/00_UiComps/Button"

export function ModalTestPage() {
  return (
    <main className="min-h-screen bg-background text-text-primary">
      <NewClient />
      <Button onClick={() => navigate('/project')}>Open Project</Button>
    </main>
  )
}
