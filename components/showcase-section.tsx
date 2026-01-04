"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Zap } from "lucide-react"

const showcaseItems = [
  {
    image: "/ai-generated-mountain-landscape-with-snow-peaks.jpg",
    title: "Ultra-Fast Mountain Generation",
    description: "Created in 0.8 seconds with Nano Banana's optimized neural engine",
  },
  {
    image: "/ai-generated-beautiful-garden-with-flowers.jpg",
    title: "Instant Garden Creation",
    description: "Complex scene rendered in milliseconds using Nano Banana technology",
  },
  {
    image: "/ai-generated-tropical-beach-sunset.jpg",
    title: "Real-time Beach Synthesis",
    description: "Nano Banana delivers photorealistic results at lightning speed",
  },
  {
    image: "/ai-generated-aurora-borealis-night-sky.jpg",
    title: "Rapid Aurora Generation",
    description: "Advanced effects processed instantly with Nano Banana AI",
  },
]

export function ShowcaseSection() {
  return (
    <section id="showcase" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="bg-banana/20 text-banana border-banana/30 mb-4">Showcase</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Lightning-Fast AI Creations</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">See what Nano Banana generates in milliseconds</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {showcaseItems.map((item, index) => (
            <Card
              key={index}
              className="bg-card border-border overflow-hidden group hover:border-banana/50 transition-colors"
            >
              <div className="relative overflow-hidden">
                <img
                  src={item.image || "/placeholder.svg"}
                  alt={item.title}
                  className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <Badge className="absolute top-4 left-4 bg-banana/90 text-primary-foreground">
                  <Zap className="h-3 w-3 mr-1" />
                  Nano Banana Speed
                </Badge>
              </div>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">Experience the power of Nano Banana yourself</p>
          <Button
            className="bg-banana text-primary-foreground hover:bg-banana-dark"
            onClick={() => document.getElementById("generator")?.scrollIntoView({ behavior: "smooth" })}
          >
            Try Nano Banana Generator
          </Button>
        </div>
      </div>
    </section>
  )
}
