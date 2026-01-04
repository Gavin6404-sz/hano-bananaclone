"use client"

import { Button } from "@/components/ui/button"
import { BananaIcon, BananaDecoration } from "./banana-decoration"
import { ArrowRight, Sparkles, Images, MessageSquare } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background decorations */}
      <BananaDecoration className="absolute left-4 top-1/4 opacity-60" position="left" />
      <BananaDecoration className="absolute right-4 top-1/3 opacity-60" position="right" />
      <BananaDecoration className="absolute left-1/4 bottom-10 opacity-40 scale-50" position="left" />

      <div className="container mx-auto px-4 text-center relative z-10">
        {/* Announcement badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-banana/10 border border-banana/30 px-4 py-2 mb-8">
          <span className="text-banana text-2xl">🍌</span>
          <span className="text-sm text-banana">The AI model that outperforms Flux Kontext</span>
          <a href="#generator" className="text-banana hover:underline text-sm flex items-center gap-1">
            Try Now <ArrowRight className="h-3 w-3" />
          </a>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance">
          <span className="text-foreground">Nano </span>
          <span className="text-banana">Banana</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 text-pretty">
          Transform any image with simple text prompts. Nano-banana&apos;s advanced model delivers consistent character
          editing and scene preservation that surpasses Flux Kontext. Experience the future of AI image editing.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button
            size="lg"
            className="bg-banana text-primary-foreground hover:bg-banana-dark gap-2"
            onClick={() => document.getElementById("generator")?.scrollIntoView({ behavior: "smooth" })}
          >
            Start Editing
            <BananaIcon className="h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-border gap-2 bg-transparent"
            onClick={() => document.getElementById("showcase")?.scrollIntoView({ behavior: "smooth" })}
          >
            View Examples
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-4">
          <div className="flex items-center gap-2 bg-secondary/50 rounded-full px-4 py-2">
            <Sparkles className="h-4 w-4 text-banana" />
            <span className="text-sm text-muted-foreground">One-shot editing</span>
          </div>
          <div className="flex items-center gap-2 bg-secondary/50 rounded-full px-4 py-2">
            <Images className="h-4 w-4 text-banana" />
            <span className="text-sm text-muted-foreground">Multi-image support</span>
          </div>
          <div className="flex items-center gap-2 bg-secondary/50 rounded-full px-4 py-2">
            <MessageSquare className="h-4 w-4 text-banana" />
            <span className="text-sm text-muted-foreground">Natural language</span>
          </div>
        </div>
      </div>
    </section>
  )
}
