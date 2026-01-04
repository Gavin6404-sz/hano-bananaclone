"use client"

import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type GenerationProgressVariant = "inline" | "gallery"

type GenerationProgressProps = {
  progressPercent: number
  etaSeconds: number | null
  elapsedSeconds: number
  variant?: GenerationProgressVariant
  className?: string
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatEtaSeconds(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  if (s < 60) return `${s} seconds`
  const mm = String(Math.floor(s / 60)).padStart(2, "0")
  const ss = String(s % 60).padStart(2, "0")
  return `${mm}:${ss}`
}

function getStageLabel(progressPercent: number) {
  const p = clampNumber(progressPercent, 0, 100)
  if (p < 8) return "Preparing request…"
  if (p < 25) return "Uploading images…"
  if (p < 92) return "Generating…"
  if (p < 100) return "Finalizing…"
  return "Done"
}

function getEtaText(etaSeconds: number | null, elapsedSeconds: number) {
  if (etaSeconds == null) return ""
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return ""

  const remaining = Math.max(0, Math.ceil(etaSeconds - elapsedSeconds))
  const overEta = elapsedSeconds > etaSeconds
  if (overEta) return "Estimated time remaining: updating…"
  return `Estimated time remaining: ${formatEtaSeconds(remaining)}`
}

function getOverEtaText(etaSeconds: number | null, elapsedSeconds: number) {
  if (etaSeconds == null) return ""
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return ""
  if (elapsedSeconds <= etaSeconds) return ""
  return "Taking longer than usual, still working…"
}

export function GenerationProgress({
  progressPercent,
  etaSeconds,
  elapsedSeconds,
  variant = "gallery",
  className,
}: GenerationProgressProps) {
  const p = clampNumber(progressPercent, 0, 100)
  const stageLabel = getStageLabel(p)
  const overEtaText = getOverEtaText(etaSeconds, elapsedSeconds)
  const etaText = getEtaText(etaSeconds, elapsedSeconds)

  if (variant === "inline") {
    return (
      <div className={cn("space-y-2", className)}>
        <Progress value={p} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{overEtaText || stageLabel}</span>
          <span>{etaText ? `${p}% · ${etaText}` : `${p}%`}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("text-center p-8 w-full", className)}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-secondary flex items-center justify-center">
        <Spinner className="size-8 text-banana drop-shadow-[0_0_18px_rgba(245,158,11,0.35)]" />
      </div>
      <h3 className="font-medium mb-2">Generating image…</h3>
      <p className="text-sm text-muted-foreground">{overEtaText || stageLabel}</p>
      <div className="mt-4 w-full max-w-sm mx-auto space-y-2">
        <Progress value={p} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{p}%</span>
          <span>{etaText}</span>
        </div>
      </div>
      <p className="mt-5 text-xs text-muted-foreground/80 max-w-sm mx-auto">
        This may take 2–5 minutes. Please keep this tab open while we generate your image.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="h-2 w-2 rounded-full bg-banana/80 animate-pulse [animation-delay:-200ms]" />
        <span className="h-2 w-2 rounded-full bg-banana/80 animate-pulse [animation-delay:-100ms]" />
        <span className="h-2 w-2 rounded-full bg-banana/80 animate-pulse" />
      </div>
    </div>
  )
}

