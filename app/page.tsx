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
  User,
  Sparkles,
  Image as ImageIcon,
  Eye,
  History,
  Loader2,
} from "lucide-react"
import { useTheme } from "next-themes"
import { CameraCapture } from "@/components/camera-capture"
import { validateImageFile, uploadImageToFreeimage } from "@/lib/image-upload"
import { performHairstyleSwap } from "@/lib/hair-swap"

// Enhanced Progress Modal with smooth, simulated progress
const ProgressModal = ({ isOpen, progress, onCancel }: { isOpen: boolean; progress: number; onCancel: () => void }) => {
  const [simulatedProgress, setSimulatedProgress] = useState(0)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

  const progressMessages = [
    "Analyzing facial features...",
    "Processing wig template...", 
    "Applying AI transformation...",
    "Finalizing your new look...",
    "Optimizing results...",
  ]

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSimulatedProgress(0)
      setCurrentMessageIndex(0)
    }
  }, [isOpen])

  // Simulate smooth progress regardless of actual API progress
  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      setSimulatedProgress(prev => {
        const newProgress = prev + 0.5 // Very slow increment
        
        // Update message based on progress
        if (newProgress >= 20 && currentMessageIndex < 1) setCurrentMessageIndex(1)
        if (newProgress >= 40 && currentMessageIndex < 2) setCurrentMessageIndex(2)
        if (newProgress >= 60 && currentMessageIndex < 3) setCurrentMessageIndex(3)
        if (newProgress >= 80 && currentMessageIndex < 4) setCurrentMessageIndex(4)
        
        // Cap at 95% until actual completion
        return Math.min(newProgress, 95)
      })
    }, 100) // Update every 100ms for smooth animation

    return () => clearInterval(interval)
  }, [isOpen, currentMessageIndex])

  // When actual progress completes, jump to 100%
  useEffect(() => {
    if (progress === 100) {
      setSimulatedProgress(100)
      setCurrentMessageIndex(4) // Final message
    }
  }, [progress])

  if (!isOpen) return null

  const currentMessage = progressMessages[currentMessageIndex]

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-background border border-border rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl mx-4">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wand2 className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h3 className="text-xl font-bold mb-3">Creating Your Look...</h3>
          {/* <p className="text-sm text-muted-foreground mb-2 animate-pulse">{currentMessage}</p> */}
          <p className="text-xs text-muted-foreground">Processing time: 10-20 seconds</p>
        </div>

        <div className="mb-6 space-y-3">
          {/* Smooth progress bar */}
          <Progress value={simulatedProgress} className="h-3 bg-muted rounded-full transition-all duration-300 ease-out" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span></span>
            <span className="font-medium">{Math.round(simulatedProgress)}%</span>
            <span></span>
          </div>
        </div>

        {/* <Button
          variant="outline"
          onClick={onCancel}
          className="w-full border-none hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all bg-transparent rounded-xl"
          size="lg"
        >
          Cancel Process
        </Button> */}
      </div>
    </div>
  )
}
// Enhanced Confirmation Modal for mobile
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
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-background border border-border rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl mx-4 animate-in slide-in-up duration-300">
        <div className="mb-5">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2">Ready to Try On?</h3>
          <p className="text-sm text-muted-foreground">
            You selected <span className="font-semibold text-foreground">"{wigName}"</span>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            onClick={onConfirm} 
            className="w-full bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-xl py-3 text-base font-medium shadow-lg"
            size="lg"
          >
            Upload Photo
          </Button>
          <Button 
            variant="outline" 
            onClick={onCancel} 
            className="w-full border-none rounded-xl py-3 text-base"
            size="lg"
          >
            Browse More
          </Button>
        </div>
      </div>
    </div>
  )
}

// Enhanced Delete Confirmation Modal
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
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl mx-4">
        <div className="mb-5">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">Delete {type === "photo" ? "Photo" : "Result"}?</h3>
          <p className="text-sm text-muted-foreground">
            This will remove the {type} from your recent items. This action cannot be undone.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            onClick={onConfirm} 
            variant="destructive"
            className="w-full rounded-xl py-3 text-base font-medium"
            size="lg"
          >
            Delete
          </Button>
          <Button 
            variant="outline" 
            onClick={onCancel} 
            className="w-full border-none rounded-xl py-3 text-base"
            size="lg"
          >
            Keep It
          </Button>
        </div>
      </div>
    </div>
  )
}

// Enhanced Fullscreen Viewer for mobile
const FullscreenViewer = ({ imageUrl, onClose, title }: { imageUrl: string; onClose: () => void; title?: string }) => (
  <div className="fixed inset-0 bg-black z-50 flex items-center justify-center animate-in fade-in duration-300">
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute top-6 left-4 text-white z-10">
        {title && <h3 className="font-semibold text-lg">{title}</h3>}
      </div>
      <img
        src={imageUrl || "/placeholder.svg"}
        alt="Fullscreen view"
        className="w-full h-full object-contain animate-in zoom-in duration-300"
      />
      <Button
        variant="outline"
        size="icon"
        className="absolute top-6 right-4 bg-black/50 backdrop-blur-sm border-none border-white/30 text-white hover:bg-white/30 hover:text-white rounded-xl"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>
      
      {/* Swipe down to close hint for mobile */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/70 text-sm animate-bounce">
        ↓ Swipe down to close
      </div>
    </div>
  </div>
)

// Enhanced Wig Card for mobile
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
    className={`relative group overflow-hidden border-none transition-all duration-300 active:scale-95 ${
      isSelected 
        ? "ring-4 ring-purple-500 shadow-xl border-red-700" 
        : "border-border hover:border-gray-300 active:border-red-600"
    }`}
  >
    <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
      <img
        src={wig.image || "/placeholder.svg"}
        alt={wig.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />

      {/* Selection overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
          <div className="bg-red-700 text-white rounded-full p-3 shadow-lg">
            <Check className="h-6 w-6" />
          </div>
        </div>
      )}

      {/* Quick select button for mobile */}
      <button
        onClick={() => onSelect(wig.id)}
        className={`absolute bottom-3 left-5 w-[90%] bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-xl py-3 text-sm font-medium shadow-lg`}
      >
        {isSelected ? "Selected" : "Try on"}
      </button>
    </div>

    <div className="p-4">
      <p className="text-base font-semibold text-center truncate">{wig.name}</p>
      {isSelected && viewMode === "browse" && (
        <p className="text-sm text-green-600 text-center mt-1 font-medium">✓ Ready for try-on</p>
      )}
    </div>
  </Card>
)

// Enhanced Recent Item Component
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
      className="w-24 h-24 rounded-2xl border-none border-border overflow-hidden cursor-pointer active:scale-95 transition-transform bg-gray-100 dark:bg-gray-800"
      onClick={onClick}
    >
      <img src={image || "/placeholder.svg"} alt={`Recent ${type}`} className="w-full h-full object-cover" />
      
      {/* Overlay on hover/tap */}
      <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 transition-colors flex items-center justify-center">
        <span className="text-white text-xs font-medium opacity-0 group-active:opacity-100 transition-opacity">
          Tap to use
        </span>
      </div>
    </div>

    {/* Delete Button */}
    <button
      onClick={(e) => {
        e.stopPropagation()
        onDelete()
      }}
      disabled={isDeleting}
      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 shadow-lg active:scale-90 transition-transform"
    >
      <X className="h-3 w-3" />
    </button>

    {/* Type Badge */}
    <div className="absolute bottom-2 left-2">
      <Badge variant="secondary" className="text-xs px-2 py-1 rounded-lg font-medium">
        {type === "photo" ? "YOU" : "AI"}
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

      // Enhanced watermark styling
      ctx.font = `bold ${Math.max(img.width * 0.04, 24)}px system-ui, -apple-system, sans-serif`
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Text shadow for better visibility
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)"
      ctx.shadowBlur = 10
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2

      const x = canvas.width / 2
      const y = canvas.height - 40

      ctx.fillText("SHOP @ TOKITOSHAIR.SHOP", x, y)

      resolve(canvas.toDataURL("image/jpeg", 0.9))
    }
    img.src = imageUrl
  })
}

// Mobile-friendly swipe detection hook
const useSwipe = (onSwipeLeft?: () => void, onSwipeRight?: () => void) => {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && onSwipeLeft) onSwipeLeft()
    if (isRightSwipe && onSwipeRight) onSwipeRight()
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
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
  
  // Enhanced upload state management
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "failed">("idle")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)
  
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

  // Swipe handlers for wig carousel
  const swipeHandlers = useSwipe(
    () => navigateWigs("next"),
    () => navigateWigs("prev")
  )

  useEffect(() => {
    const loadWigs = async () => {
      setWigsLoading(true)
      setWigsError(null)

      try {
        const cachedWigs = getCachedWigs()
        if (cachedWigs && cachedWigs.length > 0) {
          setWigs(cachedWigs)
          setWigsLoading(false)

          const freshWigs = await getWigsFromFirestore()
          if (freshWigs.length > 0) {
            setWigs(freshWigs)
            setCachedWigs(freshWigs)
          }
        } else {
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
      localStorage.setItem("tokitos-recent-images", JSON.stringify(newImages))
    } else {
      const newGenerations = recentGenerations.filter((_, i) => i !== index)
      setRecentGenerations(newGenerations)
      localStorage.setItem("tokitos-recent-generations", JSON.stringify(newGenerations))
    }
    setShowDeleteModal(false)
    setItemToDelete(null)
  }

  const handleUseRecentImage = (imageData: string) => {
    setSelectedImage(imageData)
    setSelectedImageUrl(null)
    setResultImage(null)
    setProcessingError(null)
    setUploadError(null)
    setUploadStatus("idle")
    setViewMode("upload")

    // Start upload process for the recent image
    setUploadStatus("uploading")
    setIsUploading(true)
    
    uploadImageToFreeimage(imageData).then((uploadResult) => {
      if (uploadResult.success && uploadResult.url) {
        setSelectedImageUrl(uploadResult.url)
        setUploadStatus("success")
      } else {
        setUploadError(uploadResult.error || "Failed to upload image")
        setUploadStatus("failed")
      }
      setIsUploading(false)
    }).catch((error) => {
      setUploadError("Network error during upload. Please try again.")
      setUploadStatus("failed")
      setIsUploading(false)
    })
  }

  const handleUseRecentGeneration = (imageData: string) => {
    setResultImage(imageData)
    setSelectedImage(null)
    setSelectedImageUrl(null)
    setSelectedWig(null)
    setProcessingError(null)
    setUploadError(null)
    setUploadStatus("idle")
    setViewMode("result")
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setResultImage(null)
    setProcessingError(null)
    setUploadStatus("uploading")

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid file")
      setUploadStatus("failed")
      return
    }

    try {
      setIsUploading(true)
      
      // Read file as base64
      const reader = new FileReader()
      const imageData = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })
      
      setSelectedImage(imageData)
      addToRecentImages(imageData)

      // Upload to cloud
      const uploadResult = await uploadImageToFreeimage(imageData)
      if (uploadResult.success && uploadResult.url) {
        setSelectedImageUrl(uploadResult.url)
        setUploadStatus("success")
      } else {
        setUploadError(uploadResult.error || "Failed to upload image")
        setUploadStatus("failed")
      }
    } catch (error) {
      setUploadError("Failed to process image. Please try again.")
      setUploadStatus("failed")
    } finally {
      setIsUploading(false)
    }
  }

  const handleCameraCapture = async (imageData: string) => {
    setSelectedImage(imageData)
    setUploadError(null)
    setResultImage(null)
    setProcessingError(null)
    setUploadStatus("uploading")
    addToRecentImages(imageData)

    try {
      setIsUploading(true)
      const uploadResult = await uploadImageToFreeimage(imageData)
      if (uploadResult.success && uploadResult.url) {
        setSelectedImageUrl(uploadResult.url)
        setUploadStatus("success")
      } else {
        setUploadError(uploadResult.error || "Failed to upload image")
        setUploadStatus("failed")
      }
    } catch (error) {
      setUploadError("Network error during upload. Please try again.")
      setUploadStatus("failed")
    } finally {
      setIsUploading(false)
      setShowCamera(false)
    }
  }

  const handleRetryUpload = async () => {
    if (!selectedImage) return
    
    setUploadError(null)
    setUploadStatus("uploading")
    setIsUploading(true)

    try {
      const uploadResult = await uploadImageToFreeimage(selectedImage)
      if (uploadResult.success && uploadResult.url) {
        setSelectedImageUrl(uploadResult.url)
        setUploadStatus("success")
      } else {
        setUploadError(uploadResult.error || "Failed to upload image")
        setUploadStatus("failed")
      }
    } catch (error) {
      setUploadError("Network error during upload. Please try again.")
      setUploadStatus("failed")
    } finally {
      setIsUploading(false)
    }
  }

  // const handleTryOn = async () => {
  //   if (!selectedImageUrl || !selectedWig) {
  //     setProcessingError("Please select both a wig and upload your photo")
  //     setShowFailureModal(true)
  //     return
  //   }

  //   const selectedWigData = wigs.find((w) => w.id === selectedWig)
  //   if (!selectedWigData) {
  //     setProcessingError("Selected wig not found")
  //     setShowFailureModal(true)
  //     return
  //   }

  //   setIsProcessing(true)
  //   setShowProcessingModal(true)
  //   setProgress(0)
  //   setProcessingError(null)

  //   try {
  //     const result = await performHairstyleSwap(
  //       {
  //         sourceImageUrl: selectedWigData.imageUrl,
  //         targetImageUrl: selectedImageUrl,
  //         disableSafetyChecker: false
  //       },
  //       (progressValue: any) => setProgress(progressValue),
  //     )

  //     if (result.success && result.resultUrl) {
  //       const watermarkedImage = await addWatermarkToImage(result.resultUrl)
  //       setResultImage(watermarkedImage)
  //       addToRecentGenerations(watermarkedImage)
  //       setProgress(100)
  //       setViewMode("result")
        
  //       setTimeout(() => {
  //         setIsProcessing(false)
  //         setShowProcessingModal(false)
  //       }, 1000)
  //     } else {
  //       throw new Error(result.error || "Hairstyle processing failed")
  //     }
  //   } catch (error) {
  //     const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
  //     setProcessingError(errorMessage)
  //     setIsProcessing(false)
  //     setShowProcessingModal(false)
  //     setShowFailureModal(true)
  //   }
  // }

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
    // FIX: Use the correct parameter names for face swap
    const result = await performHairstyleSwap(
      {
        swapImageUrl: selectedImageUrl,        // User's face photo
        targetImageUrl: selectedWigData.imageUrl, // Wig image
      },
      (progressValue: any) => setProgress(progressValue),
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
      throw new Error(result.error || "Hairstyle processing failed")
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
    setProcessingError(errorMessage)
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
    setUploadStatus("idle")
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

  // Generate dynamic button text based on upload status
  const getButtonText = () => {
    if (uploadStatus === "uploading" || isUploading) {
      return "Uploading Image..."
    }
    if (uploadStatus === "failed") {
      return "Retry Upload"
    }
    if (uploadStatus === "success" && selectedImageUrl) {
      return "Generate My Look"
    }
    return "Generate Try-On"
  }

  const getButtonAction = () => {
    if (uploadStatus === "failed") {
      return handleRetryUpload
    }
    return handleTryOn
  }

  const isButtonDisabled = () => {
    if (isProcessing) return true
    if (uploadStatus === "uploading" || isUploading) return true
    if (uploadStatus === "failed") return false // Allow retry
    return !selectedImageUrl || !selectedWig
  }

  if (wigsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-900 border-t-transparent mx-auto"></div>
          <div>
            <p className="text-lg font-medium mb-2">Fetching Tokitos Wigs</p>
          </div>
        </div>
      </div>
    )
  }

  if (wigsError || wigs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">No Wigs Available</h2>
            <p className="text-muted-foreground">
              {wigsError || "The wig collection is currently empty. Please check back later."}
            </p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl">
            Refresh Page
          </Button>
        </div>
      </div>
    )
  }

  if (!mounted) {
    return null
  }

  const displayImage = resultImage || selectedImage
  const isShowingResult = viewMode === "result"
  const hasSelectedImage = !!selectedImage
  const currentWig = wigs[currentWigIndex]

  return (
    <div className="min-h-screen bg-background safe-area-bottom">
      {/* Enhanced Mobile Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-xl border-b border-border z-40 safe-area-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-lg font-bold">Tokitos Hair TryOn</h1>
                <p className="text-xs text-muted-foreground">AI Generated Virtual TryOn</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {viewMode !== "browse" && (
                <Button 
                  variant="outline" 
                  onClick={handleReset} 
                  className="border-none rounded-xl text-sm mr-4"
                  size="sm"
                >
                  Browse
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode("upload")} 
                className="rounded-xl w-9 h-9 p-0 mr-6 border-none"
              >
                <History className="h-4 w-4"/>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-xl w-9 h-9 p-0 border-none"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 safe-area-bottom">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Enhanced Browse Wigs View for Mobile */}
          {viewMode === "browse" && (
            <Card className="border-none rounded-3xl overflow-hidden">
              <div className="p-6 text-center">
                <div className="max-w-2xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">Choose a wig to try it on</h2>
                  </div>

                  {/* Enhanced Wig Carousel with Swipe Support */}
                  <div className="relative mb-6" {...swipeHandlers}>
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateWigs("prev")}
                        className="rounded-xl border-none w-12 h-12"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>

                      <div className="text-center flex-1 mx-4">
                        <h3 className="text-lg font-semibold">{currentWig?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {currentWigIndex + 1} of {wigs.length}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateWigs("next")}
                        className="rounded-xl border-none w-12 h-12"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Current Wig Display */}
                    <div className="mb-4">
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

                    {/* Swipe indicator */}
                    <p className="text-xs text-muted-foreground mb-4">Swipe or use arrows to browse styles</p>

                    {/* Wig Thumbnails */}
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                      {wigs.map((wig, index) => (
                        <button
                          key={wig.id}
                          onClick={() => setCurrentWigIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded-xl border-none overflow-hidden transition-all active:scale-95 ${
                            index === currentWigIndex
                              ? "border-purple-500 shadow-lg"
                              : "border-border hover:border-gray-300"
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
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl p-4 border-none border-green-200 dark:border-green-800 mb-6">
                      <p className="text-green-700 dark:text-green-400 font-semibold flex items-center justify-center gap-2">
                        <Check className="h-4 w-4" />
                        {wigs.find((w) => w.id === selectedWig)?.name} selected
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        Ready to see how it looks on you!
                      </p>
                    </div>
                  )}

                  {/* Enhanced Quick Actions */}
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => setViewMode("upload")}
                      className="w-full bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600 text-white rounded-2xl py-4 text-base font-semibold shadow-lg active:scale-95 transition-transform"
                      size="lg"
                      disabled={!selectedWig}
                    >
                      {selectedWig ? "Upload Photo to Try On" : "Select a Wig First"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Enhanced Upload/Result View for Mobile */}
          {(viewMode === "upload" || viewMode === "result") && (
            <Card className="border-none rounded-3xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">
                    {isShowingResult
                      ? "Your New Look ✨"
                      : selectedWig
                        ? `Trying: ${wigs.find((w) => w.id === selectedWig)?.name}`
                        : "Upload Your Photo"}
                  </h2>

                  {hasSelectedImage && (
                    <Badge variant={isShowingResult ? "default" : "secondary"} className="rounded-lg px-3 py-1">
                      {isShowingResult ? "AI Result" : uploadStatus === "success" ? "Ready" : uploadStatus === "failed" ? "Failed" : "Uploading"}
                    </Badge>
                  )}
                </div>

                {/* Enhanced Upload Error Display */}
                {uploadError && (
                  <div className="mb-6 p-4 border-none border-destructive bg-destructive/10 rounded-2xl flex items-start gap-3">
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
                      <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl border-none border-green-200 dark:border-green-800">
                        <p className="text-green-700 dark:text-green-400 font-semibold flex items-center justify-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Try-On Complete! Your AI-generated look is ready.
                        </p>
                      </div>
                    )}

                    <div className="relative group">
                      <img
                        src={displayImage || "/placeholder.svg"}
                        alt={isShowingResult ? "AI Try-On Result" : "Your photo"}
                        className="w-full h-full border-none shadow-xl cursor-zoom-in"
                        onClick={() => setShowFullscreen(true)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm border-none"
                        onClick={() => setShowFullscreen(true)}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-col gap-3">
                      {isShowingResult ? (
                        <>
                          <Button
                            onClick={handleDownload}
                            className="w-full bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600 text-white rounded-2xl py-4 text-base font-semibold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                            size="lg"
                          >
                            <Download className="h-5 w-5" />
                            Download Image
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleReset}
                            className="w-full border-none rounded-2xl py-4 text-base flex items-center justify-center gap-2 active:scale-95 transition-transform"
                            size="lg"
                          >
                            <RotateCcw className="h-5 w-5" />
                            Try Another Style
                          </Button>
                        </>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedImage(null)
                              setSelectedImageUrl(null)
                              setUploadStatus("idle")
                              setUploadError(null)
                            }}
                            className="w-full border-none rounded-2xl py-4 text-base active:scale-95 transition-transform"
                            size="lg"
                          >
                            Change Photo
                          </Button>
                          <Button
                            onClick={getButtonAction()}
                            disabled={isButtonDisabled()}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl py-4 text-base font-semibold shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                            size="lg"
                          >
                            {isProcessing ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin h-4 w-4" />
                                Processing...
                              </div>
                            ) : isUploading || uploadStatus === "uploading" ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin h-4 w-4" />
                                {getButtonText()}
                              </div>
                            ) : (
                              getButtonText()
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Enhanced Recent Items */}
                    {(recentGenerations.length > 0 || recentImages.length > 0) && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">Recent Items</h3>
                          <span className="text-sm text-muted-foreground">Tap to use • Hold to delete</span>
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
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

                    {/* Enhanced Upload/Camera Section */}
                    <div className="border-none border-dashed border-border rounded-3xl p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800/50">
                      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                        <TabsContent value="upload" className="text-center space-y-5">
                          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl flex items-center justify-center mx-auto">
                            <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-lg font-semibold mb-2">Upload Your Photo</p>
                            <p className="text-muted-foreground mb-4">
                              Choose a clear, well-lit photo for best results
                            </p>
                          </div>
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600 text-white rounded-2xl py-4 text-base font-semibold shadow-lg active:scale-95 transition-transform"
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

                        <TabsContent value="camera" className="text-center space-y-5">
                          <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl flex items-center justify-center mx-auto">
                            <Camera className="h-8 w-8 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-lg font-semibold mb-2">Take a Photo</p>
                            <p className="text-muted-foreground mb-4">Use your camera to capture a new photo</p>
                          </div>
                          <Button
                            onClick={() => setShowCamera(true)}
                            className="w-full bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600 text-white rounded-2xl py-4 text-base font-semibold shadow-lg active:scale-95 transition-transform"
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

      {/* Enhanced Modals */}
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
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-3xl p-6 max-w-sm w-full text-center mx-4">
            <div className="mb-5">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Processing Failed</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {processingError || "Please try again with a different photo."}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowFailureModal(false)} 
                className="w-full border-none rounded-xl py-3"
                size="lg"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowFailureModal(false)
                  handleTryOn()
                }}
                className="w-full bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-xl py-3 font-medium"
                size="lg"
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

      {/* Mobile Bottom Safe Area Spacer */}
      <div className="h-8 safe-area-bottom"></div>
    </div>
  )
}