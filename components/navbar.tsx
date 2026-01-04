"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BananaIcon } from "./banana-decoration"
import { AuthModal } from "./auth-modal"
import { ChevronDown, Zap, LogIn } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function Navbar() {
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null)

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <BananaIcon className="h-6 w-6" />
            <span className="text-xl font-bold text-banana">Nano Banana</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="#generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Image Editor
            </Link>
            <Link href="#showcase" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Showcase
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Toolbox <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Image to Image</DropdownMenuItem>
                <DropdownMenuItem>Text to Image</DropdownMenuItem>
                <DropdownMenuItem>Background Remover</DropdownMenuItem>
                <DropdownMenuItem>Image Upscaler</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              API
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              className="bg-banana text-primary-foreground hover:bg-banana-dark gap-1"
              onClick={() => document.getElementById("generator")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Zap className="h-4 w-4" />
              Launch Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-banana text-banana hover:bg-banana/10 gap-1 bg-transparent"
              onClick={() => setAuthMode("login")}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={authMode !== null}
        onClose={() => setAuthMode(null)}
        mode={authMode || "login"}
        onModeChange={setAuthMode}
      />
    </>
  )
}
