import './App.css'

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Poker Copilot</h1>
        <p className="app-subtitle">Учебный калькулятор Texas Hold&apos;em</p>
      </header>

      <main className="app-grid">
        <section className="panel panel-table" aria-labelledby="panel-table-title">
          <h2 id="panel-table-title">Стол</h2>
          <p className="panel-placeholder">Область стола появится в следующих версиях.</p>
        </section>

        <section className="panel panel-actions" aria-labelledby="panel-actions-title">
          <h2 id="panel-actions-title">Действия</h2>
          <p className="panel-placeholder">Область действий пока пуста.</p>
        </section>

        <section className="panel panel-metrics" aria-labelledby="panel-metrics-title">
          <h2 id="panel-metrics-title">Расчёты</h2>
          <p className="panel-placeholder">Метрики появятся после подключения математики.</p>
        </section>

        <section
          className="panel panel-recommendation"
          aria-labelledby="panel-recommendation-title"
        >
          <h2 id="panel-recommendation-title">Рекомендация</h2>
          <p className="panel-placeholder">Недостаточно данных</p>
        </section>
      </main>
    </div>
  )
}
