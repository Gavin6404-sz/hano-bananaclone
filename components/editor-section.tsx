"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { BananaDecoration } from "./banana-decoration"
import { GenerationProgress } from "@/components/generation-progress"
import {
  Sparkles,
  ImageIcon,
  Type,
  Upload,
  X,
  Copy,
  Zap,
  Crown,
  FolderOpen,
  ImagePlus,
  Check,
  Download,
  RotateCcw,
} from "lucide-react"

type GenerationDurationSample = {
  ms: number
  mode: "image" | "text"
  imagesCount: number
  ts: number
}

const GENERATION_DURATION_STORAGE_KEY = "banana_editor_generation_durations_v1"

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function estimateProgressPercent(elapsedSec: number, etaSec: number) {
  if (!Number.isFinite(elapsedSec) || !Number.isFinite(etaSec) || etaSec <= 0) return 0

  const normalized = elapsedSec / etaSec
  const eased = 1 - Math.exp(-3 * clampNumber(normalized, 0, 1))
  const head = Math.min(0.95, eased)
  const tailSeconds = Math.max(0, elapsedSec - etaSec)
  const tail = 0.95 + 0.04 * (1 - Math.exp(-0.6 * tailSeconds))
  const p = Math.min(0.97, Math.max(head, tail))
  return clampNumber(Math.round(p * 100), 0, 97)
}

function loadDurationSamples() {
  try {
    const raw = localStorage.getItem(GENERATION_DURATION_STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    const now = Date.now()
    return arr
      .filter((x): x is GenerationDurationSample => !!x && typeof x === "object")
      .map((x) => x as GenerationDurationSample)
      .filter((x) => Number.isFinite(x.ms) && (x.mode === "image" || x.mode === "text") && Number.isFinite(x.ts))
      .filter((x) => now - x.ts < 1000 * 60 * 60 * 24 * 30)
      .slice(-20)
  } catch {
    return []
  }
}

function saveDurationSample(sample: GenerationDurationSample) {
  try {
    const prev = loadDurationSamples()
    const next = [...prev, sample].slice(-20)
    localStorage.setItem(GENERATION_DURATION_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

function estimateDurationSec(mode: "image" | "text", imagesCount: number) {
  const samples = loadDurationSamples()
  const sameMode = samples.filter((s) => s.mode === mode).map((s) => s.ms)
  const msList = sameMode.length > 0 ? sameMode : samples.map((s) => s.ms)
  const avgMs = msList.length > 0 ? msList.reduce((a, b) => a + b, 0) / msList.length : mode === "image" ? 22_000 : 12_000

  const extraMs = mode === "image" ? Math.min(16_000, Math.max(0, imagesCount - 1) * 2500) : 0
  const etaMs = clampNumber(avgMs + extraMs, 8_000, 90_000)
  return Math.round(etaMs / 1000)
}

async function copyTextToClipboard(text: string) {
  if (!text) return
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const el = document.createElement("textarea")
  el.value = text
  el.setAttribute("readonly", "true")
  el.style.position = "fixed"
  el.style.left = "-9999px"
  el.style.top = "0"
  document.body.appendChild(el)
  el.select()
  document.execCommand("copy")
  document.body.removeChild(el)
}

function guessExtensionFromMime(mimeType: string | undefined) {
  const mime = String(mimeType || "").toLowerCase()
  if (mime.includes("png")) return "png"
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg"
  if (mime.includes("webp")) return "webp"
  return "png"
}

async function fetchImageAsBlob(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  return await res.blob()
}

async function downloadImageFromUrl(url: string) {
  const tryDirectDownload = () => {
    const a = document.createElement("a")
    a.href = url
    a.download = "banana-editor-image"
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  try {
    const blob = await fetchImageAsBlob(url)
    const ext = guessExtensionFromMime(blob.type)
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = objectUrl
    a.download = `banana-editor-${Date.now()}.${ext}`
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500)
  } catch {
    try {
      tryDirectDownload()
    } catch {
      window.open(url, "_blank", "noopener,noreferrer")
    }
  }
}

type UploadedImage = {
  id: string
  file: File
  previewUrl: string
}

export function EditorSection() {
  const [mode, setMode] = useState<"image" | "text">("image")
  const [model, setModel] = useState("nano-banana")
  const [prompt, setPrompt] = useState("")
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const uploadedImagesRef = useRef<UploadedImage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [showPromptCopyButton, setShowPromptCopyButton] = useState(false)
  const [promptCopyState, setPromptCopyState] = useState<"idle" | "copied" | "error">("idle")
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationEtaSec, setGenerationEtaSec] = useState<number | null>(null)
  const [generationElapsedSec, setGenerationElapsedSec] = useState(0)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [selectedOutputIndex, setSelectedOutputIndex] = useState(0)
  const [isOutputBusy, setIsOutputBusy] = useState(false)
  const [outputMessage, setOutputMessage] = useState<string | null>(null)
  const outputMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [outputOrientation, setOutputOrientation] = useState<"portrait" | "landscape" | "square" | "unknown">("unknown")
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const previewViewportRef = useRef<HTMLDivElement | null>(null)
  const [previewScale, setPreviewScale] = useState(1)
  const [previewTranslate, setPreviewTranslate] = useState({ x: 0, y: 0 })
  const [isPreviewDragging, setIsPreviewDragging] = useState(false)
  const previewDragRef = useRef<{ dragging: boolean; startX: number; startY: number; startTx: number; startTy: number }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
  })

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    setErrorMessage(null)

    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB")
        return
      }

      if (!file.type.startsWith("image/")) {
        return
      }

      setUploadedImages((prev) => {
        if (prev.length >= 9) return prev

        const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
        const previewUrl = URL.createObjectURL(file)
        return [...prev, { id, file, previewUrl }]
      })
    })

    e.target.value = ""
  }, [])

  const removeImage = (index: number) => {
    setUploadedImages((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleGenerate = async () => {
    setErrorMessage(null)

    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) {
      setErrorMessage("Please fill in Main Prompt first.")
      return
    }

    if (mode === "image" && uploadedImages.length === 0) {
      setErrorMessage("Please add at least 1 reference image (Add Image).")
      return
    }

    setShowPromptCopyButton(true)
    setPromptCopyState("idle")

    const imagesCount = mode === "image" ? uploadedImages.length : 0
    const startedAt = performance.now()
    const etaSec = estimateDurationSec(mode, imagesCount)
    setGenerationEtaSec(etaSec)
    setGenerationElapsedSec(0)
    setGenerationProgress(0)
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    progressIntervalRef.current = setInterval(() => {
      const elapsedSec = (performance.now() - startedAt) / 1000
      setGenerationElapsedSec(elapsedSec)
      const progress = estimateProgressPercent(elapsedSec, etaSec)
      setGenerationProgress(progress)
    }, 250)

    setIsGenerating(true)
    setGeneratedImages([])

    let succeeded = false
    try {
      const formData = new FormData()
      formData.set("prompt", trimmedPrompt)
      formData.set("mode", mode)
      formData.set("model", model)

      if (mode === "image") {
        uploadedImages.forEach((img) => {
          formData.append("images", img.file, img.file.name)
        })
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      })

      const data = (await response.json()) as { images?: string[]; error?: string }
      if (!response.ok) {
        setErrorMessage(data?.error || "Generation failed. Please try again later.")
        return
      }

      const images = Array.isArray(data?.images) ? data.images.filter(Boolean) : []
      if (images.length === 0) {
        setErrorMessage("No image returned from the API (it may have returned text). Try a different prompt.")
        return
      }

      setGeneratedImages(images)
      setSelectedOutputIndex(0)
      setGenerationProgress(100)
      succeeded = true
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Generation failed. Check your network and try again.")
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setIsGenerating(false)
      if (succeeded) {
        const durationMs = Math.round(performance.now() - startedAt)
        saveDurationSample({ ms: durationMs, mode, imagesCount, ts: Date.now() })
      }
    }
  }

  const handleCopyPrompt = async () => {
    const text = prompt.trim()
    if (!text) return

    try {
      await copyTextToClipboard(text)
      setPromptCopyState("copied")
      if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current)
      copyResetTimeoutRef.current = setTimeout(() => setPromptCopyState("idle"), 1500)
    } catch {
      setPromptCopyState("error")
      if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current)
      copyResetTimeoutRef.current = setTimeout(() => setPromptCopyState("idle"), 1500)
    }
  }

  const showOutputMessage = useCallback((message: string) => {
    setOutputMessage(message)
    if (outputMessageTimeoutRef.current) clearTimeout(outputMessageTimeoutRef.current)
    outputMessageTimeoutRef.current = setTimeout(() => setOutputMessage(null), 2000)
  }, [])

  const handleDownloadSelected = async () => {
    const url = generatedImages[selectedOutputIndex] || generatedImages[0]
    if (!url) return

    setIsOutputBusy(true)
    try {
      await downloadImageFromUrl(url)
      showOutputMessage("Download started.")
    } catch {
      showOutputMessage("Download failed.")
    } finally {
      setIsOutputBusy(false)
    }
  }

  const handleEditAgain = async () => {
    const url = generatedImages[selectedOutputIndex] || generatedImages[0]
    if (!url) return

    setIsOutputBusy(true)
    setErrorMessage(null)
    try {
      const blob = await fetchImageAsBlob(url)
      if (blob.size > 10 * 1024 * 1024) {
        setErrorMessage("The generated image is larger than 10MB and cannot be added as a reference.")
        return
      }

      const ext = guessExtensionFromMime(blob.type)
      const file = new File([blob], `generated-${Date.now()}.${ext}`, { type: blob.type || "image/png" })
      const previewUrl = URL.createObjectURL(file)
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`

      uploadedImagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl))
      setUploadedImages([{ id, file, previewUrl }])
      setMode("image")
      showOutputMessage("Added to Reference Image.")

      const section = document.querySelector("#generator")
      section?.scrollIntoView({ behavior: "smooth", block: "start" })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load the generated image for editing.")
    } finally {
      setIsOutputBusy(false)
    }
  }

  useEffect(() => {
    const url = generatedImages[selectedOutputIndex] || generatedImages[0]
    if (!url) {
      setOutputOrientation("unknown")
      return
    }

    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
        setOutputOrientation("unknown")
        return
      }

      const ratio = w / h
      if (Math.abs(ratio - 1) < 0.06) setOutputOrientation("square")
      else if (ratio > 1) setOutputOrientation("landscape")
      else setOutputOrientation("portrait")
    }
    img.onerror = () => {
      if (!cancelled) setOutputOrientation("unknown")
    }
    img.src = url

    return () => {
      cancelled = true
    }
  }, [generatedImages, selectedOutputIndex])

  useEffect(() => {
    uploadedImagesRef.current = uploadedImages
  }, [uploadedImages])

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current)
      if (outputMessageTimeoutRef.current) clearTimeout(outputMessageTimeoutRef.current)
      uploadedImagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl))
    }
  }, [])

  const outputFramePaddingClass =
    outputOrientation === "portrait"
      ? "px-4 py-2 sm:px-5 sm:py-3"
      : outputOrientation === "landscape"
        ? "px-3 py-5 sm:px-4 sm:py-6"
        : "p-5 sm:p-6"

  const outputAspectClass =
    outputOrientation === "portrait"
      ? "aspect-[4/5]"
      : outputOrientation === "landscape"
        ? "aspect-[16/10]"
        : "aspect-square"

  const previewUrl = generatedImages[selectedOutputIndex] || generatedImages[0] || ""

  const clampPreviewTranslate = useCallback((x: number, y: number, scale: number, viewportW: number, viewportH: number) => {
    if (!Number.isFinite(viewportW) || !Number.isFinite(viewportH) || viewportW <= 0 || viewportH <= 0) return { x: 0, y: 0 }
    if (scale <= 1) return { x: 0, y: 0 }

    const minX = viewportW - viewportW * scale
    const minY = viewportH - viewportH * scale
    const maxX = 0
    const maxY = 0

    return {
      x: clampNumber(x, minX, maxX),
      y: clampNumber(y, minY, maxY),
    }
  }, [])

  const resetPreviewTransform = useCallback(() => {
    setPreviewScale(1)
    setPreviewTranslate({ x: 0, y: 0 })
    previewDragRef.current.dragging = false
    setIsPreviewDragging(false)
  }, [])

  useEffect(() => {
    if (!isPreviewOpen) return
    resetPreviewTransform()
  }, [isPreviewOpen, previewUrl, resetPreviewTransform])

  const handlePreviewWheel = useCallback(
    (e: React.WheelEvent) => {
      const viewport = previewViewportRef.current
      if (!viewport) return

      e.preventDefault()
      e.stopPropagation()

      const rect = viewport.getBoundingClientRect()
      const viewportW = rect.width
      const viewportH = rect.height
      const px = clampNumber(e.clientX - rect.left, 0, viewportW)
      const py = clampNumber(e.clientY - rect.top, 0, viewportH)

      const direction = e.deltaY > 0 ? -1 : 1
      const step = 0.12
      const nextScale = clampNumber(Number((previewScale * (1 + step * direction)).toFixed(3)), 1, 6)
      if (nextScale === previewScale) return

      const ratio = nextScale / previewScale
      const nextX = px - (px - previewTranslate.x) * ratio
      const nextY = py - (py - previewTranslate.y) * ratio
      const clamped = clampPreviewTranslate(nextX, nextY, nextScale, viewportW, viewportH)

      setPreviewScale(nextScale)
      setPreviewTranslate(clamped)
    },
    [clampPreviewTranslate, previewScale, previewTranslate.x, previewTranslate.y],
  )

  const handlePreviewPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (previewScale <= 1) return
      const viewport = previewViewportRef.current
      if (!viewport) return
      if (e.button !== 0) return

      viewport.setPointerCapture(e.pointerId)
      previewDragRef.current = {
        dragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startTx: previewTranslate.x,
        startTy: previewTranslate.y,
      }
      setIsPreviewDragging(true)
    },
    [previewScale, previewTranslate.x, previewTranslate.y],
  )

  const handlePreviewPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const viewport = previewViewportRef.current
      if (!viewport) return
      if (!previewDragRef.current.dragging) return

      const rect = viewport.getBoundingClientRect()
      const viewportW = rect.width
      const viewportH = rect.height
      const dx = e.clientX - previewDragRef.current.startX
      const dy = e.clientY - previewDragRef.current.startY

      const nextX = previewDragRef.current.startTx + dx
      const nextY = previewDragRef.current.startTy + dy
      const clamped = clampPreviewTranslate(nextX, nextY, previewScale, viewportW, viewportH)
      setPreviewTranslate(clamped)
    },
    [clampPreviewTranslate, previewScale],
  )

  const handlePreviewPointerUp = useCallback((e: React.PointerEvent) => {
    if (!previewDragRef.current.dragging) return
    previewDragRef.current.dragging = false
    setIsPreviewDragging(false)
    try {
      previewViewportRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }, [])

  return (
    <section id="generator" className="relative py-20">
      {/* Banana decorations */}
      <BananaDecoration className="absolute left-0 top-1/2 -translate-y-1/2 opacity-50" position="left" />
      <BananaDecoration className="absolute right-0 top-1/3 opacity-50" position="right" />

      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="bg-banana/20 text-banana border-banana/30 mb-4">Get Started</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Try The AI Editor</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Experience the power of nano-banana&apos;s natural language image editing. Transform any photo with simple
            text commands
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Prompt Engine */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-banana">
                <Sparkles className="h-5 w-5" />
                Prompt Engine
              </CardTitle>
              <CardDescription>Transform your image with AI-powered editing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Toggle */}
              <div className="flex rounded-lg bg-secondary p-1">
                <button
                  onClick={() => setMode("image")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    mode === "image"
                      ? "bg-banana text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  Image to Image
                </button>
                <button
                  onClick={() => setMode("text")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    mode === "text"
                      ? "bg-banana text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Type className="h-4 w-4" />
                  Text to Image
                </button>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-banana" />
                  AI Model Selection
                </Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nano-banana">Nano Banana</SelectItem>
                    <SelectItem value="nano-banana-pro">Nano Banana Pro</SelectItem>
                    <SelectItem value="seedream-4">SeeDream 4</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Different models offer unique characteristics and styles
                </p>
              </div>

              {/* Batch Processing */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Batch Processing</span>
                  <Badge className="bg-banana/20 text-banana border-banana/30 text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Pro
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs border-banana text-banana bg-transparent">
                    <Crown className="h-3 w-3 mr-1" />
                    Upgrade
                  </Button>
                  <Switch disabled />
                </div>
              </div>

              {/* Reference Image Upload */}
              {mode === "image" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm">
                      <ImagePlus className="h-4 w-4 text-banana" />
                      Reference Image
                      <span className="text-muted-foreground">{uploadedImages.length}/9</span>
                    </Label>
                    <Button variant="outline" size="sm" className="text-xs border-banana text-banana bg-transparent">
                      <FolderOpen className="h-3 w-3 mr-1" />
                      Select from Library
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {uploadedImages.map((img, index) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.previewUrl || "/placeholder.svg"}
                          alt={`Upload ${index + 1}`}
                          className="h-20 w-20 object-cover rounded-lg border border-border"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {uploadedImages.length < 9 && (
                      <label className="h-20 w-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-banana/50 transition-colors">
                        <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Add Image</span>
                        <span className="text-xs text-muted-foreground">Max 10MB</span>
                        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Main Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm">
                    <Type className="h-4 w-4 text-banana" />
                    Main Prompt
                  </Label>
                  {showPromptCopyButton && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={handleCopyPrompt}
                      disabled={!prompt.trim()}
                      aria-label="Copy Main Prompt"
                      title={
                        promptCopyState === "copied"
                          ? "Copied"
                          : promptCopyState === "error"
                            ? "Copy failed"
                            : "Copy prompt"
                      }
                    >
                      {promptCopyState === "copied" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A futuristic city powered by nano technology, golden hour lighting, ultra detailed..."
                  className="min-h-[100px] bg-secondary border-border resize-none"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={
                  isGenerating ||
                  !prompt.trim() ||
                  (mode === "image" && uploadedImages.length === 0)
                }
                className="w-full bg-banana text-primary-foreground hover:bg-banana-dark"
              >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Now
                  </>
                )}
              </Button>

              {isGenerating && (
                <GenerationProgress
                  variant="inline"
                  progressPercent={generationProgress}
                  etaSeconds={generationEtaSec}
                  elapsedSeconds={generationElapsedSec}
                />
              )}

              {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
            </CardContent>
          </Card>

          {/* Output Gallery */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-banana">Output Gallery</CardTitle>
              <CardDescription>Your ultra-fast AI creations appear here instantly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`${outputAspectClass} rounded-xl bg-secondary/50 border border-border flex items-center justify-center overflow-hidden`}>
                  {generatedImages.length > 0 ? (
                    <div className="w-full h-full p-2 sm:p-3">
                      <div className="w-full h-full rounded-2xl border border-border bg-background/10 p-2 sm:p-3 flex flex-col shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                        <button
                          type="button"
                          onClick={() => setIsPreviewOpen(true)}
                          className={
                            `flex-1 min-h-0 rounded-xl bg-background/25 overflow-hidden flex items-center justify-center ${outputFramePaddingClass} ` +
                            "cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-banana/40"
                          }
                          aria-label="Open preview"
                          title="Click to preview"
                        >
                          <img
                            src={previewUrl}
                            alt={`Generated ${selectedOutputIndex + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </button>

                        {generatedImages.length > 1 && (
                          <div className="mt-3 flex items-center justify-center gap-2">
                            {generatedImages.slice(0, 6).map((url, idx) => {
                              const isActive = idx === selectedOutputIndex
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedOutputIndex(idx)}
                                  className={`h-12 w-12 rounded-lg border overflow-hidden bg-background/35 transition-colors ${
                                    isActive ? "border-banana ring-2 ring-banana/30" : "border-border hover:border-banana/50"
                                  }`}
                                  aria-label={`Select generated image ${idx + 1}`}
                                >
                                  <img src={url} alt={`Thumb ${idx + 1}`} className="h-full w-full object-cover" />
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : isGenerating ? (
                    <GenerationProgress
                      variant="gallery"
                      progressPercent={generationProgress}
                      etaSeconds={generationEtaSec}
                      elapsedSeconds={generationElapsedSec}
                    />
                  ) : (
                    <div className="text-center p-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-secondary flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium mb-2">Ready for instant generation</h3>
                      <p className="text-sm text-muted-foreground">Enter your prompt and unleash the power</p>
                    </div>
                  )}
                </div>

                {generatedImages.length > 0 && !isGenerating && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleDownloadSelected}
                      disabled={isOutputBusy}
                      className="rounded-xl"
                    >
                      <Download className="h-4 w-4" />
                      Download Image
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleEditAgain}
                      disabled={isOutputBusy}
                      className="rounded-xl bg-amber-500/15 text-amber-200 hover:bg-amber-500/20"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Edit Again
                    </Button>
                  </div>
                )}

                {outputMessage && <p className="text-xs text-muted-foreground text-center">{outputMessage}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent
          className="max-w-none w-[min(96vw,1200px)] h-[min(92vh,900px)] p-0 overflow-hidden bg-background/90 border-border"
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-background/70 backdrop-blur">
              <div className="min-w-0">
                <DialogTitle className="text-sm font-semibold">Preview</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Scroll to zoom · Drag to pan · {Math.round(previewScale * 100)}%
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={handleDownloadSelected} disabled={isOutputBusy}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={resetPreviewTransform} disabled={isOutputBusy}>
                  Reset
                </Button>
              </div>
            </div>

            <div
              ref={previewViewportRef}
              className={`flex-1 min-h-0 bg-black/40 p-3 sm:p-4 overflow-hidden ${
                previewScale > 1 ? (isPreviewDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
              }`}
              onWheel={handlePreviewWheel}
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={handlePreviewPointerUp}
              onPointerCancel={handlePreviewPointerUp}
            >
              <div className="h-full w-full flex items-center justify-center">
                <div
                  className="h-full w-full origin-top-left"
                  style={{
                    transform: `translate3d(${previewTranslate.x}px, ${previewTranslate.y}px, 0) scale(${previewScale})`,
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-contain rounded-lg border border-border bg-background/20 select-none pointer-events-none"
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
