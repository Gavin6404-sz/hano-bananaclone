"use client"

export function BananaDecoration({
  className = "",
  position = "left",
}: { className?: string; position?: "left" | "right" }) {
  return (
    <div className={`pointer-events-none select-none ${className}`}>
      <svg
        width="80"
        height="80"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: position === "right" ? "scaleX(-1) rotate(15deg)" : "rotate(-15deg)" }}
      >
        <path
          d="M75 20C75 20 85 35 80 55C75 75 55 85 35 80C15 75 10 55 20 40C30 25 50 20 75 20Z"
          fill="url(#bananaGradient)"
          stroke="#8B7500"
          strokeWidth="2"
        />
        <path d="M75 20C70 22 60 25 50 30" stroke="#8B7500" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="30" cy="65" rx="3" ry="2" fill="#8B7500" opacity="0.3" />
        <defs>
          <linearGradient id="bananaGradient" x1="20" y1="20" x2="80" y2="80">
            <stop offset="0%" stopColor="#FFE135" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#F4C430" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

export function BananaIcon({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-block ${className}`} role="img" aria-label="banana">
      <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M75 20C75 20 85 35 80 55C75 75 55 85 35 80C15 75 10 55 20 40C30 25 50 20 75 20Z"
          fill="url(#bananaIconGrad)"
          stroke="#8B7500"
          strokeWidth="3"
        />
        <path d="M75 20C70 22 60 25 50 30" stroke="#8B7500" strokeWidth="4" strokeLinecap="round" />
        <defs>
          <linearGradient id="bananaIconGrad" x1="20" y1="20" x2="80" y2="80">
            <stop offset="0%" stopColor="#FFE135" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  )
}
