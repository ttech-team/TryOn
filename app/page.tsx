"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { getWigsFromFirestore, type WigData } from "@/lib/firestore-operations"
import { getCachedWigs, setCachedWigs } from "@/lib/cache-manager"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  Upload,
  Sun,
  Moon,
  Download,
  AlertCircle,
  Maximize2,
  X,
  Check,
  Wand2,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useTheme } from "next-themes"
import { CameraCapture } from "@/components/camera-capture"
import { uploadImageToImgBB, validateImageFile, resizeImage } from "@/lib/image-upload"
import { performFaceSwap } from "@/lib/face-swap-api"

// Enhanced Progress Modal
const ProgressModal = ({ isOpen, progress, onCancel }: { isOpen: boolean; progress: number; onCancel: () => void }) => {
  if (!isOpen) return null

  const progressMessages = [
    "Analyzing facial features...",
    "Processing wig template...",
    "Applying AI transformation...",
    "Finalizing your new look...",
    "Optimizing results...",
  ]

  const currentMessage = progressMessages[Math.floor((progress / 100) * (progressMessages.length - 1))]

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="mb-6">
          <div className="relative inline-block mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-700 rounded-full flex items-center justify-center animate-pulse">
              <Wand2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-bold mb-2">Creating Your New Look</h3>
          <p className="text-sm text-muted-foreground mb-2">{currentMessage}</p>
          <p className="text-xs text-muted-foreground">Processing time: 20-40 seconds</p>
        </div>

        <div className="mb-6 space-y-3">
          <Progress value={progress} className="h-2 bg-muted" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="font-medium">{progress}%</span>
            <span>100%</span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={onCancel}
          className="border hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all bg-transparent"
        >
          Cancel Process
        </Button>
      </div>
    </div>
  )
}

// Confirmation Modal
const ConfirmationModal = ({
  isOpen,
  wigName,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  wigName: string
  onConfirm: () => void
  onCancel: () => void
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl animate-in slide-in-up duration-300">
        <div className="mb-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Ready to Try On?</h3>
          <p className="text-sm text-muted-foreground">
            You've selected <span className="font-medium text-foreground">"{wigName}"</span>. Now upload your photo to
            see the result.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1 border bg-transparent">
            Browse More
          </Button>
          <Button onClick={onConfirm} className="flex-1 bg-gray-900 dark:text-white hover:bg-gray-800">
            Upload Photo
          </Button>
        </div>
      </div>
    </div>
  )
}

// Delete Confirmation Modal
const DeleteConfirmationModal = ({
  isOpen,
  type,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  type: "photo" | "generation"
  onConfirm: () => void
  onCancel: () => void
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
        <div className="mb-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Delete {type === "photo" ? "Photo" : "Generation"}?</h3>
          <p className="text-sm text-muted-foreground">
            This will remove the {type} from your recent items. This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1 border bg-transparent">
            Keep It
          </Button>
          <Button onClick={onConfirm} variant="destructive" className="flex-1">
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

// Enhanced Fullscreen Viewer
const FullscreenViewer = ({ imageUrl, onClose, title }: { imageUrl: string; onClose: () => void; title?: string }) => (
  <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute top-4 left-4 text-white z-10">{title && <h3 className="font-semibold">{title}</h3>}</div>
      <img
        src={imageUrl || "/placeholder.svg"}
        alt="Fullscreen view"
        className="max-w-full max-h-full object-contain animate-in zoom-in duration-300"
      />
      <Button
        variant="outline"
        size="icon"
        className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:text-white"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  </div>
)

// Wig Card Component for Browse View
const WigCard = ({
  wig,
  isSelected,
  onSelect,
  viewMode = "browse",
}: {
  wig: { id: string; name: string; image: string }
  isSelected: boolean
  onSelect: (wigId: string) => void
  viewMode?: "browse" | "tryon"
}) => (
  <Card
    className={`relative group overflow-hidden border rounded-xl transition-all duration-300 ${
      isSelected ? "ring-2 ring-gray-900 shadow-lg" : "hover:shadow-md"
    }`}
  >
    <div className="relative aspect-[4/4] overflow-hidden bg-gray-100 dark:bg-gray-800">
      <img
        src={wig.image || "/placeholder.svg"}
        alt={wig.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />

      {/* Overlay for browse mode */}
      {viewMode === "browse" && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-end">
          <div className="w-full p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <Button
              onClick={() => onSelect(wig.id)}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white text-sm py-2"
              size="sm"
            >
              Select This Wig
            </Button>
          </div>
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5">
          <Check className="h-3 w-3" />
        </div>
      )}
    </div>

    <div className="p-3">
      <p className="text-sm font-medium text-center truncate">{wig.name}</p>
      {isSelected && viewMode === "browse" && (
        <p className="text-xs text-green-600 text-center mt-1">Selected for try-on</p>
      )}
    </div>
  </Card>
)

// Recent Item Component with Delete Option
const RecentItem = ({
  image,
  type,
  onClick,
  onDelete,
  isDeleting,
}: {
  image: string
  type: "photo" | "generation"
  onClick: () => void
  onDelete: () => void
  isDeleting?: boolean
}) => (
  <div className="relative group">
    <div
      className="w-20 h-20 rounded-lg border-2 border-border overflow-hidden cursor-pointer hover:border-gray-400 transition-colors"
      onClick={onClick}
    >
      <img src={image || "/placeholder.svg"} alt={`Recent ${type}`} className="w-full h-full object-cover" />
    </div>

    {/* Delete Button */}
    <button
      onClick={(e) => {
        e.stopPropagation()
        onDelete()
      }}
      disabled={isDeleting}
      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
    >
      <X className="h-3 w-3" />
    </button>

    {/* Type Badge */}
    <div className="absolute bottom-1 left-1">
      <Badge variant="secondary" className="text-xs px-1.5 py-0">
        {type === "photo" ? "Photo" : "AI"}
      </Badge>
    </div>
  </div>
)

// Watermark function
const addWatermarkToImage = (imageUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!

      canvas.width = img.width
      canvas.height = img.height

      ctx.drawImage(img, 0, 0)

      // Watermark styling
      ctx.font = `bold ${Math.max(img.width * 0.035, 30)}px system-ui, -apple-system, sans-serif`
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Text shadow for better visibility
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)"
      ctx.shadowBlur = 8
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2

      const x = canvas.width / 2
      const y = canvas.height / 2

      ctx.fillText("SHOP @ TOKITOSHAIR.SHOP", x, y)

      resolve(canvas.toDataURL("image/jpeg", 0.9))
    }
    img.src = imageUrl
  })
}

export default function HomePage() {
  // State management
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [selectedWig, setSelectedWig] = useState<string | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showCamera, setShowCamera] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showProcessingModal, setShowProcessingModal] = useState(false)
  const [showFailureModal, setShowFailureModal] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: "photo" | "generation"; index: number } | null>(null)
  const [activeTab, setActiveTab] = useState<"upload" | "camera">("upload")
  const [recentImages, setRecentImages] = useState<string[]>([])
  const [recentGenerations, setRecentGenerations] = useState<string[]>([])
  const [currentWigIndex, setCurrentWigIndex] = useState(0)
  const [viewMode, setViewMode] = useState<"browse" | "upload" | "result">("browse")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [wigs, setWigs] = useState<WigData[]>([])
  const [wigsLoading, setWigsLoading] = useState(true)
  const [wigsError, setWigsError] = useState<string | null>(null)

  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const loadWigs = async () => {
      setWigsLoading(true)
      setWigsError(null)

      try {
        // Try to get cached wigs first
        const cachedWigs = getCachedWigs()
        if (cachedWigs && cachedWigs.length > 0) {
          setWigs(cachedWigs)
          setWigsLoading(false)

          // Still fetch fresh data in background
          const freshWigs = await getWigsFromFirestore()
          if (freshWigs.length > 0) {
            setWigs(freshWigs)
            setCachedWigs(freshWigs)
          }
        } else {
          // No cache, fetch fresh data
          const freshWigs = await getWigsFromFirestore()
          if (freshWigs.length > 0) {
            setWigs(freshWigs)
            setCachedWigs(freshWigs)
          } else {
            setWigsError("No wigs available. Please check back later.")
          }
        }
      } catch (error) {
        console.error("Error loading wigs:", error)
        setWigsError("Failed to load wigs. Please try again.")
      } finally {
        setWigsLoading(false)
      }
    }

    loadWigs()
  }, [])

  useEffect(() => {
    setMounted(true)
    const savedImages = localStorage.getItem("tokitos-recent-images")
    const savedGenerations = localStorage.getItem("tokitos-recent-generations")

    if (savedImages) setRecentImages(JSON.parse(savedImages))
    if (savedGenerations) setRecentGenerations(JSON.parse(savedGenerations))
  }, [])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Save to recent items
  const addToRecentImages = (imageData: string) => {
    const newRecent = [imageData, ...recentImages.filter((img) => img !== imageData)].slice(0, 5)
    setRecentImages(newRecent)
    localStorage.setItem("tokitos-recent-images", JSON.stringify(newRecent))
  }

  const addToRecentGenerations = (imageData: string) => {
    const newRecent = [imageData, ...recentGenerations.filter((img) => img !== imageData)].slice(0, 5)
    setRecentGenerations(newRecent)
    localStorage.setItem("tokitos-recent-generations", JSON.stringify(newRecent))
  }

  // Delete recent items
  const handleDeleteItem = (type: "photo" | "generation", index: number) => {
    if (type === "photo") {
      const newImages = recentImages.filter((_, i) => i !== index)
      setRecentImages(newImages)
      localStorage.setItem("tokitos-recent-images", JSON.JSON.stringify(newImages))
    } else {
      const newGenerations = recentGenerations.filter((_, i) => i !== index)
      setRecentGenerations(newGenerations)
      localStorage.setItem("tokitos-recent-generations", JSON.stringify(newGenerations))
    }
    setShowDeleteModal(false)
    setItemToDelete(null)
  }

  // Fixed: handleUseRecentImage function
  const handleUseRecentImage = (imageData: string) => {
    setSelectedImage(imageData)
    setSelectedImageUrl(null)
    setResultImage(null)
    setProcessingError(null)
    setViewMode("upload")

    // Trigger upload for the recent image
    uploadImageToImgBB(imageData).then((uploadResult) => {
      if (uploadResult.success) {
        setSelectedImageUrl(uploadResult.url!)
      }
    })
  }

  const handleUseRecentGeneration = (imageData: string) => {
    setResultImage(imageData)
    setSelectedImage(null)
    setSelectedImageUrl(null)
    setSelectedWig(null)
    setProcessingError(null)
    setViewMode("result")
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setResultImage(null)
    setProcessingError(null)

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid file")
      return
    }

    try {
      setIsUploading(true)
      const maxSize = isMobile ? 800 : 1024
      const resizedImage = await resizeImage(file, maxSize, maxSize, 0.85)
      setSelectedImage(resizedImage)
      addToRecentImages(resizedImage)

      const uploadResult = await uploadImageToImgBB(resizedImage)
      if (uploadResult.success && uploadResult.url) {
        setSelectedImageUrl(uploadResult.url)
      } else {
        setUploadError(uploadResult.error || "Upload failed")
      }
    } catch (error) {
      setUploadError("Failed to process image")
    } finally {
      setIsUploading(false)
    }
  }

  const handleCameraCapture = async (imageData: string) => {
    setSelectedImage(imageData)
    setUploadError(null)
    setResultImage(null)
    setProcessingError(null)
    addToRecentImages(imageData)

    try {
      setIsUploading(true)
      const uploadResult = await uploadImageToImgBB(imageData)
      if (uploadResult.success && uploadResult.url) {
        setSelectedImageUrl(uploadResult.url)
      } else {
        setUploadError(uploadResult.error || "Upload failed")
      }
    } catch (error) {
      setUploadError("Failed to upload image")
    } finally {
      setIsUploading(false)
      setShowCamera(false)
    }
  }

  const handleTryOn = async () => {
    if (!selectedImageUrl || !selectedWig) {
      setProcessingError("Please select both a wig and upload your photo")
      setShowFailureModal(true)
      return
    }

    const selectedWigData = wigs.find((w) => w.id === selectedWig)
    if (!selectedWigData) {
      setProcessingError("Selected wig not found")
      setShowFailureModal(true)
      return
    }

    setIsProcessing(true)
    setShowProcessingModal(true)
    setProgress(0)
    setProcessingError(null)

    try {
      const result = await performFaceSwap(
        {
          swapImageUrl: selectedImageUrl,
          targetImageUrl: selectedWigData.imageUrl,
        },
        (progressValue) => setProgress(progressValue),
      )

      if (result.success && result.resultUrl) {
        const watermarkedImage = await addWatermarkToImage(result.resultUrl)
        setResultImage(watermarkedImage)
        addToRecentGenerations(watermarkedImage)
        setProgress(100)
        setViewMode("result")
        setTimeout(() => {
          setIsProcessing(false)
          setShowProcessingModal(false)
        }, 1000)
      } else {
        throw new Error(result.error || "Processing failed")
      }
    } catch (error) {
      setProcessingError(error instanceof Error ? error.message : "An unexpected error occurred")
      setIsProcessing(false)
      setShowProcessingModal(false)
      setShowFailureModal(true)
    }
  }

  const handleDownload = async () => {
    const imageToDownload = resultImage || selectedImage
    if (!imageToDownload) return

    try {
      let downloadImage = imageToDownload
      if (!resultImage) {
        downloadImage = await addWatermarkToImage(imageToDownload)
      }

      const response = await fetch(downloadImage)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = url
      link.download = `tokitos-tryon-${new Date().getTime()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      const link = document.createElement("a")
      link.download = `tokitos-tryon-${new Date().getTime()}.jpg`
      link.href = imageToDownload
      link.click()
    }
  }

  const handleWigSelect = (wigId: string) => {
    setSelectedWig(wigId)
    const wig = wigs.find((w) => w.id === wigId)
    if (wig) {
      setShowConfirmationModal(true)
    }
  }

  const confirmWigSelection = () => {
    setShowConfirmationModal(false)
    setViewMode("upload")
  }

  const handleReset = () => {
    setSelectedImage(null)
    setSelectedImageUrl(null)
    setSelectedWig(null)
    setResultImage(null)
    setUploadError(null)
    setProcessingError(null)
    setViewMode("browse")
  }

  const navigateWigs = (direction: "prev" | "next") => {
    setCurrentWigIndex((prev) => {
      if (direction === "next") {
        return prev === wigs.length - 1 ? 0 : prev + 1
      } else {
        return prev === 0 ? wigs.length - 1 : prev - 1
      }
    })
  }

  if (wigsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-muted-foreground">Loading wig collection...</p>
        </div>
      </div>
    )
  }

  if (wigsError || wigs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">No Wigs Available</h2>
          <p className="text-muted-foreground">
            {wigsError || "The wig collection is currently empty. Please check back later."}
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Page
          </Button>
        </div>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const displayImage = resultImage || selectedImage
  const isShowingResult = viewMode === "result"
  const hasSelectedImage = !!selectedImage
  const currentWig = wigs[currentWigIndex]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-xl border-b border-border z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* <div className="w-8 h-8 bg-gradient-to-br from-gray-900 to-gray-700 rounded-lg flex items-center justify-center">
                <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/design-mode-images/TOKITOS-HAIRS%281%29-eYGkRy5ixnrRSDPWdnPodAbMQa0H60.jpg" alt="shop" className="w-[40px] text-white" />
              </div> */}
              <div>
                <h1 className="text-xl font-bold">Tokitos Hair Try-On</h1>
                <p className="text-xs text-muted-foreground">Virtual wig studio</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {viewMode !== "browse" && (
                <Button variant="outline" onClick={handleReset} className="border bg-transparent">
                  Browse Wigs
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full w-10 h-10 p-0 border"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Browse Wigs View */}
          {viewMode === "browse" && (
            <Card className="border rounded-2xl overflow-hidden">
              <div className="p-8 text-center">
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-3xl font-bold mb-4">Browse Wig Styles</h2>
                  <p className="text-muted-foreground mb-8">
                    Explore our collection of wig styles. Select one that catches your eye, then upload your photo to
                    see how it looks on you.
                  </p>

                  <div className="mb-6">
                    <Badge variant="secondary" className="text-sm">
                      {wigs.length} styles available
                    </Badge>
                  </div>

                  {/* Wig Carousel */}
                  <div className="relative mb-8">
                    <div className="flex items-center justify-center mb-6">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateWigs("prev")}
                        className="rounded-full mr-4 border"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="text-center flex-1">
                        <h3 className="text-lg font-semibold">{currentWig?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {currentWig?.category} • {currentWigIndex + 1} of {wigs.length} styles
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateWigs("next")}
                        className="rounded-full ml-4 border"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Current Wig Display */}
                    <div className="max-w-sm mx-auto mb-6">
                      <WigCard
                        wig={{
                          id: currentWig?.id || "",
                          name: currentWig?.name || "",
                          image: currentWig?.imageUrl || "",
                        }}
                        isSelected={selectedWig === currentWig?.id}
                        onSelect={handleWigSelect}
                        viewMode="browse"
                      />
                    </div>

                    {/* Wig Thumbnails */}
                    <div className="flex gap-3 overflow-x-auto justify-center pb-2">
                      {wigs.map((wig, index) => (
                        <button
                          key={wig.id}
                          onClick={() => setCurrentWigIndex(index)}
                          className={`flex-shrink-0 w-18 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                            index === currentWigIndex
                              ? "border-gray-900 scale-110"
                              : "border-border hover:border-gray-400"
                          }`}
                        >
                          <img
                            src={wig.imageUrl || "/placeholder.svg"}
                            alt={wig.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Wig Info */}
                  {selectedWig && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800 mb-6">
                      <p className="text-green-700 dark:text-green-400 font-medium">
                        ✓ {wigs.find((w) => w.id === selectedWig)?.name} selected
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        Ready to see how it looks on you? Upload your photo below.
                      </p>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-4 justify-center flex-wrap">
                    <Button
                      onClick={() => setViewMode("upload")}
                      className="bg-gray-900 hover:bg-gray-800 text-white px-8"
                      size="lg"
                      disabled={!selectedWig}
                    >
                      {selectedWig ? "Upload Photo to Try On" : "Select a Wig First"}
                    </Button>
                    <Button variant="outline" onClick={() => setViewMode("upload")} className="border px-8" size="lg">
                      View Recent Items
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Upload/Result View */}
          {(viewMode === "upload" || viewMode === "result") && (
            <Card className="border rounded-2xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">
                    {isShowingResult
                      ? "Your New Look"
                      : selectedWig
                        ? `Trying On: ${wigs.find((w) => w.id === selectedWig)?.name}`
                        : "Upload Your Photo"}
                  </h2>

                  {hasSelectedImage && (
                    <Badge variant={isShowingResult ? "default" : "secondary"}>
                      {isShowingResult ? "AI Result" : "Ready for Try-On"}
                    </Badge>
                  )}
                </div>

                {uploadError && (
                  <div className="mb-6 p-4 border border-destructive bg-destructive/10 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-destructive font-medium">Upload Error</p>
                      <p className="text-destructive text-sm">{uploadError}</p>
                    </div>
                  </div>
                )}

                {displayImage ? (
                  <div className="space-y-6">
                    {isShowingResult && (
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-green-700 dark:text-green-400 font-medium flex items-center justify-center gap-2">
                          <Check className="h-4 w-4" />
                          Try-On Complete! Your AI-generated look is ready.
                        </p>
                      </div>
                    )}

                    <div className="relative group max-w-2xl mx-auto">
                      <img
                        src={displayImage || "/placeholder.svg"}
                        alt={isShowingResult ? "AI Try-On Result" : "Your photo"}
                        className="w-full rounded-xl border shadow-lg cursor-zoom-in transition-transform group-hover:scale-[1.01]"
                        onClick={() => setShowFullscreen(true)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm border opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setShowFullscreen(true)}
                      >
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex gap-4 justify-center flex-wrap">
                      {isShowingResult ? (
                        <>
                          <Button
                            onClick={handleDownload}
                            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6"
                            size="lg"
                          >
                            <Download className="h-4 w-4" />
                            Download Image
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleReset}
                            className="flex items-center gap-2 border px-6 bg-transparent"
                            size="lg"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Try Another Style
                          </Button>
                        </>
                      ) : (
                        <div className="flex gap-4 w-full max-w-md mx-auto">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedImage(null)
                              setSelectedImageUrl(null)
                            }}
                            className="flex-1 border"
                            size="lg"
                          >
                            Change Photo
                          </Button>
                          <Button
                            onClick={handleTryOn}
                            disabled={!selectedImageUrl || isProcessing}
                            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                            size="lg"
                          >
                            {isProcessing ? "Processing..." : "Generate Try-On"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Recent Items */}
                    {(recentGenerations.length > 0 || recentImages.length > 0) && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Recent Items</h3>
                          <span className="text-sm text-muted-foreground">Click to use • Hover to delete</span>
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-4">
                          {recentGenerations.map((img, index) => (
                            <RecentItem
                              key={`gen-${index}`}
                              image={img}
                              type="generation"
                              onClick={() => handleUseRecentGeneration(img)}
                              onDelete={() => {
                                setItemToDelete({ type: "generation", index })
                                setShowDeleteModal(true)
                              }}
                            />
                          ))}

                          {recentImages.map((img, index) => (
                            <RecentItem
                              key={`img-${index}`}
                              image={img}
                              type="photo"
                              onClick={() => handleUseRecentImage(img)}
                              onDelete={() => {
                                setItemToDelete({ type: "photo", index })
                                setShowDeleteModal(true)
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upload/Camera Section */}
                    <div className="border-2 border-dashed border-border rounded-2xl p-8">
                      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                          <TabsTrigger value="upload" className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Upload Photo
                          </TabsTrigger>
                          <TabsTrigger value="camera" className="flex items-center gap-2">
                            <Camera className="h-4 w-4" />
                            Take Photo
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="upload" className="text-center space-y-4">
                          <Upload className="h-16 w-16 text-muted-foreground mx-auto" />
                          <div>
                            <p className="text-lg font-medium mb-2">Upload Your Photo</p>
                            <p className="text-muted-foreground mb-4">
                              Choose a clear, well-lit photo for best results
                            </p>
                          </div>
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-gray-900 hover:bg-gray-800 text-white px-8"
                            size="lg"
                          >
                            Select File
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <p className="text-sm text-muted-foreground">JPG, PNG, WebP • Max 10MB</p>
                        </TabsContent>

                        <TabsContent value="camera" className="text-center space-y-4">
                          <Camera className="h-16 w-16 text-muted-foreground mx-auto" />
                          <div>
                            <p className="text-lg font-medium mb-2">Take a Photo</p>
                            <p className="text-muted-foreground mb-4">Use your camera to capture a new photo</p>
                          </div>
                          <Button
                            onClick={() => setShowCamera(true)}
                            className="bg-gray-900 hover:bg-gray-800 text-white px-8"
                            size="lg"
                          >
                            Open Camera
                          </Button>
                          <p className="text-sm text-muted-foreground">
                            Ensure good lighting and face the camera directly
                          </p>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Modals */}
      <ProgressModal
        isOpen={showProcessingModal}
        progress={progress}
        onCancel={() => {
          setIsProcessing(false)
          setShowProcessingModal(false)
          setProgress(0)
        }}
      />

      <ConfirmationModal
        isOpen={showConfirmationModal}
        wigName={currentWig?.name || ""}
        onConfirm={confirmWigSelection}
        onCancel={() => {
          setShowConfirmationModal(false)
          setSelectedWig(null)
        }}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        type={itemToDelete?.type || "photo"}
        onConfirm={() => itemToDelete && handleDeleteItem(itemToDelete.type, itemToDelete.index)}
        onCancel={() => {
          setShowDeleteModal(false)
          setItemToDelete(null)
        }}
      />

      {showFailureModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Processing Failed</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {processingError || "Please try again with a different photo."}
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowFailureModal(false)} className="flex-1 border">
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowFailureModal(false)
                  handleTryOn()
                }}
                className="flex-1 bg-gray-900 hover:bg-gray-800"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCamera && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}

      {showFullscreen && displayImage && (
        <FullscreenViewer
          imageUrl={displayImage}
          onClose={() => setShowFullscreen(false)}
          title={isShowingResult ? "Your AI Try-On Result" : "Your Photo"}
        />
      )}
    </div>
  )
}
