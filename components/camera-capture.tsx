"use client"

import React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Camera, X, RotateCcw } from "lucide-react"

interface CameraCaptureProps {
  onCapture: (imageData: string) => void
  onClose: () => void
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [isMobile, setIsMobile] = useState(false)

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

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const constraints = {
        video: {
          facingMode,
          width: { ideal: isMobile ? 720 : 1280 },
          height: { ideal: isMobile ? 1280 : 720 },
        },
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
      }
      setIsLoading(false)
    } catch (err) {
      setError("Unable to access camera. Please check permissions.")
      setIsLoading(false)
      console.error("Camera error:", err)
    }
  }, [facingMode, isMobile])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL("image/jpeg", 0.8)
    onCapture(imageData)
    stopCamera()
    onClose()
  }, [onCapture, onClose, stopCamera])

  const switchCamera = useCallback(() => {
    stopCamera()
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }, [stopCamera])

  React.useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  React.useEffect(() => {
    if (facingMode && stream) {
      startCamera()
    }
  }, [facingMode, startCamera, stream])

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <Card className={`w-full border-2 ${isMobile ? "max-w-sm p-4" : "max-w-2xl p-6"}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-bold ${isMobile ? "text-lg" : "text-xl"}`}>Take Your Photo</h3>
          <Button variant="outline" size={isMobile ? "sm" : "icon"} onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error ? (
          <div className="text-center py-8">
            <p className="text-destructive mb-4 text-sm">{error}</p>
            <Button onClick={startCamera} size={isMobile ? "default" : "default"}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-black border-2 border-border">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <p className="text-muted-foreground text-sm">Starting camera...</p>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full object-cover ${isMobile ? "h-64" : "h-auto max-h-96"}`}
              />
            </div>

            <div className={`flex justify-center gap-3 ${isMobile ? "flex-col" : "flex-row"}`}>
              <Button
                variant="outline"
                onClick={switchCamera}
                className="flex items-center gap-2 touch-manipulation bg-transparent"
                size={isMobile ? "default" : "default"}
              >
                <RotateCcw className="h-4 w-4" />
                Switch Camera
              </Button>
              <Button
                onClick={capturePhoto}
                size={isMobile ? "lg" : "lg"}
                className="flex items-center gap-2 touch-manipulation"
              >
                <Camera className="h-4 w-4" />
                Capture Photo
              </Button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </Card>
    </div>
  )
}
