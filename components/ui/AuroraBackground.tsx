'use client'

export default function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628] via-[#0F1F38] to-[#0A1628]" />

      {/* Animated blobs */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-[0.07]"
        style={{
          background: 'radial-gradient(circle, #1E40AF, transparent 70%)',
          animation: 'aurora1 12s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute top-[30%] right-[-15%] w-[45vw] h-[45vw] rounded-full opacity-[0.05]"
        style={{
          background: 'radial-gradient(circle, #2563EB, transparent 70%)',
          animation: 'aurora2 15s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute bottom-[-5%] left-[20%] w-[40vw] h-[40vw] rounded-full opacity-[0.06]"
        style={{
          background: 'radial-gradient(circle, #3B82F6, transparent 70%)',
          animation: 'aurora3 10s ease-in-out infinite alternate',
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  )
}
