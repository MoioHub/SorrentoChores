import ChoreForm from '../components/ChoreForm.jsx'
import ChoreHistory from '../components/ChoreHistory.jsx'

export default function HomePage() {
  return (
    <div>
      <div className="pt-3">
        <ChoreForm />
      </div>
      <ChoreHistory />
    </div>
  )
}
