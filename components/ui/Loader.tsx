interface LoaderProps {
  fullPage?: boolean
  label?: string
}

export default function Loader({ fullPage = false, label = 'Chargement' }: LoaderProps) {
  const wrapper = fullPage
    ? 'min-h-screen flex items-center justify-center'
    : 'flex items-center justify-center min-h-[44vh]'

  return (
    <div className={wrapper}>
      <div className="flex flex-col items-center gap-4">
        {/* Double ring spinner */}
        <div className="relative w-10 h-10">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/10" />
          {/* Spinning arc */}
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin"
            style={{ animationDuration: '0.8s' }}
          />
          {/* Inner counter-spin */}
          <div
            className="absolute inset-[5px] rounded-full border border-transparent border-t-blue-300/40 animate-spin"
            style={{ animationDuration: '0.5s', animationDirection: 'reverse' }}
          />
          {/* Center dot */}
          <div className="absolute inset-[14px] rounded-full bg-blue-500/40" />
        </div>

        <span className="text-[10px] font-semibold text-slate-600 tracking-[0.22em] uppercase">
          {label}
        </span>
      </div>
    </div>
  )
}
