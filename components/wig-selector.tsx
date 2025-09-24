"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Wig {
  id: string
  name: string
  image: string
  category: string
  length: string
  color: string
}

interface WigSelectorProps {
  wigs: Wig[]
  selectedWig: string | null
  onWigSelect: (wigId: string) => void
}

const categories = [
  { id: "all", name: "All Styles" },
  { id: "long", name: "Long Hair" },
  { id: "short", name: "Short Hair" },
  { id: "curly", name: "Curly" },
  { id: "straight", name: "Straight" },
  { id: "blonde", name: "Blonde" },
  { id: "brunette", name: "Brunette" },
  { id: "colorful", name: "Colorful" },
]

export function WigSelector({ wigs, selectedWig, onWigSelect }: WigSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  const filteredWigs = wigs.filter((wig) => {
    if (selectedCategory === "all") return true
    return wig.category === selectedCategory || wig.length === selectedCategory || wig.color === selectedCategory
  })

  const checkScrollButtons = () => {
    if (!scrollContainerRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
  }

  const scrollLeft = () => {
    if (!scrollContainerRef.current) return
    const scrollAmount = isMobile ? 150 : 200
    scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" })
  }

  const scrollRight = () => {
    if (!scrollContainerRef.current) return
    const scrollAmount = isMobile ? 150 : 200
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" })
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    checkScrollButtons()
    container.addEventListener("scroll", checkScrollButtons)
    window.addEventListener("resize", checkScrollButtons)

    return () => {
      container.removeEventListener("scroll", checkScrollButtons)
      window.removeEventListener("resize", checkScrollButtons)
    }
  }, [filteredWigs])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={`font-bold text-balance ${isMobile ? "text-xl" : "text-2xl"}`}>Choose Your Wig</h2>
        <div className="text-sm text-muted-foreground">
          {filteredWigs.length} style{filteredWigs.length !== 1 ? "s" : ""} available
        </div>
      </div>

      {/* Category Filter - Mobile optimized */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-max">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size={isMobile ? "sm" : "sm"}
              onClick={() => setSelectedCategory(category.id)}
              className="whitespace-nowrap touch-manipulation"
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Wig Selection Slider - Mobile optimized */}
      <div className="relative">
        {/* Scroll Buttons - Hidden on mobile for better touch experience */}
        {!isMobile && canScrollLeft && (
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border-2"
            onClick={scrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {!isMobile && canScrollRight && (
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border-2"
            onClick={scrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Wigs Container - Enhanced for mobile touch */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide touch-pan-x"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className={`flex gap-3 pb-4 ${isMobile ? "px-2" : "px-8"}`}>
            {filteredWigs.map((wig) => (
              <Card
                key={wig.id}
                className={`p-3 cursor-pointer transition-all border-2 flex-shrink-0 touch-manipulation ${
                  isMobile ? "hover:scale-100 active:scale-95" : "hover:scale-105"
                } ${
                  selectedWig === wig.id
                    ? "border-primary bg-accent shadow-lg"
                    : "border-border hover:border-primary/50 hover:shadow-md"
                }`}
                onClick={() => onWigSelect(wig.id)}
              >
                <div
                  className={`relative mb-3 overflow-hidden border border-border ${
                    isMobile ? "w-24 h-24" : "w-32 h-32"
                  }`}
                >
                  <img
                    src={wig.image || "/placeholder.svg"}
                    alt={wig.name}
                    className="w-full h-full object-cover transition-transform hover:scale-110"
                  />
                  {selectedWig === wig.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-5 h-5 bg-primary border-2 border-primary-foreground flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-center space-y-1">
                  <p className={`font-medium ${isMobile ? "text-xs" : "text-sm"}`}>{wig.name}</p>
                  <p className={`text-muted-foreground capitalize ${isMobile ? "text-xs" : "text-xs"}`}>
                    {wig.length} • {wig.color}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {filteredWigs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">No wigs found in this category.</p>
          <Button
            variant="outline"
            onClick={() => setSelectedCategory("all")}
            className="mt-4"
            size={isMobile ? "default" : "default"}
          >
            Show All Styles
          </Button>
        </div>
      )}
    </div>
  )
}
