import { NextResponse } from "next/server"

export const runtime = "nodejs"

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
const OPENROUTER_MODEL = "google/gemini-2.5-flash-image"

type OpenRouterImage = {
  image_url?: {
    url?: string
  }
}

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      images?: OpenRouterImage[]
      content?: unknown
    }
  }>
  error?: {
    message?: string
  }
}

function jsonError(status: number, error: string, details?: unknown) {
  return NextResponse.json({ error, details }, { status })
}

async function fileToDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are supported.")
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Each image must be smaller than 10MB.")
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString("base64")
  const mimeType = file.type || "application/octet-stream"
  return `data:${mimeType};base64,${base64}`
}

function extractImageUrlsFromMessageContent(content: unknown) {
  if (!Array.isArray(content)) return []

  const urls: string[] = []
  for (const item of content) {
    if (!item || typeof item !== "object") continue
    const maybeType = (item as { type?: unknown }).type
    if (maybeType !== "image_url") continue
    const url = (item as { image_url?: { url?: string } }).image_url?.url
    if (typeof url === "string" && url.length > 0) urls.push(url)
  }

  return urls
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return jsonError(500, "Missing environment variable OPENROUTER_API_KEY (set it in .env.local).")
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return jsonError(400, "Invalid request format: expected multipart/form-data.")
  }

  const prompt = String(formData.get("prompt") ?? "").trim()
  const mode = String(formData.get("mode") ?? "").trim()

  if (!prompt) {
    return jsonError(400, "Prompt must not be empty.")
  }

  const inputFiles = formData.getAll("images").filter((v): v is File => v instanceof File)
  const files = mode === "image" ? inputFiles.slice(0, 4) : []

  let imageUrls: string[] = []
  try {
    imageUrls = await Promise.all(files.map(fileToDataUrl))
  } catch (err) {
    return jsonError(400, err instanceof Error ? err.message : "Failed to process images.")
  }

  const userContent = [
    {
      type: "text",
      text:
        mode === "image"
          ? `Please edit/redraw based on the reference image(s) and generate a new image.\n\nPrompt: ${prompt}`
          : `Please generate an image based on the prompt.\n\nPrompt: ${prompt}`,
    },
    ...imageUrls.map((url) => ({
      type: "image_url",
      image_url: { url },
    })),
  ]

  const payload = {
    model: OPENROUTER_MODEL,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  }

  const referer = process.env.OPENROUTER_HTTP_REFERER || process.env.NEXT_PUBLIC_SITE_URL
  const title = process.env.OPENROUTER_X_TITLE || "banana-editor"
  if (referer) headers["HTTP-Referer"] = referer
  if (title) headers["X-Title"] = title

  const upstream = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })

  let data: OpenRouterResponse | undefined
  try {
    data = (await upstream.json()) as OpenRouterResponse
  } catch {
    return jsonError(502, "OpenRouter returned a non-JSON response.")
  }

  if (!upstream.ok) {
    return jsonError(upstream.status, data?.error?.message || "OpenRouter request failed.", data)
  }

  const message = data?.choices?.[0]?.message
  const imagesFromField = Array.isArray(message?.images)
    ? message!.images
        .map((img) => img?.image_url?.url)
        .filter((url): url is string => typeof url === "string" && url.length > 0)
    : []

  const imagesFromContent = extractImageUrlsFromMessageContent(message?.content)
  const images = imagesFromField.length > 0 ? imagesFromField : imagesFromContent

  return NextResponse.json({ images })
}
