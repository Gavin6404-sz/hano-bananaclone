"use client"

import Link from "next/link"
import { BananaIcon } from "./banana-decoration"

export function Footer() {
  return (
    <footer className="border-t border-border py-12 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <BananaIcon className="h-6 w-6" />
            <span className="text-xl font-bold text-banana">Nano Banana</span>
          </div>

          <nav className="flex flex-wrap justify-center gap-6">
            <Link href="#generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Image Editor
            </Link>
            <Link href="#showcase" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Showcase
            </Link>
            <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              API
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
          </nav>

          <p className="text-sm text-muted-foreground">© 2025 Nano Banana. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
