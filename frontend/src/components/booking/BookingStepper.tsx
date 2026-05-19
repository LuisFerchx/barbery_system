interface Props {
  currentStep: number
  totalSteps: number
  labels: string[]
}

export default function BookingStepper({ currentStep, totalSteps, labels }: Props) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        <div
          className="absolute top-4 left-0 right-0 h-px"
          style={{ background: 'var(--surface-border)' }}
        />
        <div
          className="absolute top-4 left-0 h-px transition-all duration-500"
          style={{
            background: 'var(--gold-400)',
            width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
          }}
        />
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1
          const done = step < currentStep
          const active = step === currentStep
          return (
            <div key={step} className="relative flex flex-col items-center gap-2 z-10">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300"
                style={{
                  background: done || active ? 'var(--gold-400)' : 'var(--surface-2)',
                  color: done || active ? '#000' : 'var(--text-muted)',
                  border: done || active ? 'none' : '1px solid var(--surface-border)',
                }}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className="text-xs font-medium hidden sm:block"
                style={{ color: active ? 'var(--gold-400)' : done ? 'var(--text-secondary)' : 'var(--text-muted)' }}
              >
                {labels[i]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
