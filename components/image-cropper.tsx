"use client"

import React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crop, RotateCw, Palette, Download } from "lucide-react"

interface ImageCropperProps {
  imageSrc: string
  onCropComplete: (croppedImage: string) => void
  onCancel: () => void
}

const filters = [
  { name: "None", filter: "" },
  { name: "Brightness", filter: "brightness(1.2)" },
  { name: "Contrast", filter: "contrast(1.3)" },
  { name: "Saturate", filter: "saturate(1.4)" },
  { name: "Sepia", filter: "sepia(0.5)" },
  { name: "Grayscale", filter: "grayscale(0.3)" },
  { name: "Vintage", filter: "sepia(0.3) contrast(1.2) brightness(1.1)" },
  { name: "Cool", filter: "hue-rotate(180deg) saturate(1.2)" },
  { name: "Warm", filter: "hue-rotate(30deg) saturate(1.1) brightness(1.1)" },
]

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [cropArea, setCropArea] = useState({ x: 100, y: 50, width: 300, height: 300 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [selectedFilter, setSelectedFilter] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  const handleImageLoad = useCallback(() => {
    const image = imageRef.current
    if (!image) return
    
    setImageDimensions({ width: image.naturalWidth, height: image.naturalHeight })
    setImageLoaded(true)
    
    // Reset crop area when new image loads
    setCropArea({ x: 100, y: 50, width: 300, height: 300 })
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if clicking inside crop area
    if (
      x >= cropArea.x &&
      x <= cropArea.x + cropArea.width &&
      y >= cropArea.y &&
      y <= cropArea.y + cropArea.height
    ) {
      setIsDragging(true)
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y })
    }
  }, [cropArea])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - dragStart.x
    const y = e.clientY - rect.top - dragStart.y

    const maxX = canvasRef.current.width - cropArea.width
    const maxY = canvasRef.current.height - cropArea.height

    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    }))
  }, [isDragging, dragStart, cropArea.width, cropArea.height])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image || !imageLoaded) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = 600
    canvas.height = 450

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate image scale to fit in canvas
    const scale = Math.min(
      (canvas.width - 20) / image.naturalWidth,
      (canvas.height - 20) / image.naturalHeight
    )
    const scaledWidth = image.naturalWidth * scale
    const scaledHeight = image.naturalHeight * scale
    
    // Center the image
    const imageX = (canvas.width - scaledWidth) / 2
    const imageY = (canvas.height - scaledHeight) / 2

    // Draw image with rotation and filter
    ctx.save()
    ctx.translate(imageX + scaledWidth / 2, imageY + scaledHeight / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.filter = filters[selectedFilter].filter
    ctx.drawImage(image, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
    ctx.restore()

    // Draw semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Clear crop area (make it transparent)
    ctx.globalCompositeOperation = "destination-out"
    ctx.fillRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height)
    
    // Reset composite operation
    ctx.globalCompositeOperation = "source-over"

    // Draw crop border
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height)

    // Draw corner handles
    const handleSize = 10
    ctx.fillStyle = "#ffffff"
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 1
    
    // Top-left handle
    ctx.fillRect(cropArea.x - handleSize / 2, cropArea.y - handleSize / 2, handleSize, handleSize)
    ctx.strokeRect(cropArea.x - handleSize / 2, cropArea.y - handleSize / 2, handleSize, handleSize)
    
    // Top-right handle
    ctx.fillRect(cropArea.x + cropArea.width - handleSize / 2, cropArea.y - handleSize / 2, handleSize, handleSize)
    ctx.strokeRect(cropArea.x + cropArea.width - handleSize / 2, cropArea.y - handleSize / 2, handleSize, handleSize)
    
    // Bottom-left handle
    ctx.fillRect(cropArea.x - handleSize / 2, cropArea.y + cropArea.height - handleSize / 2, handleSize, handleSize)
    ctx.strokeRect(cropArea.x - handleSize / 2, cropArea.y + cropArea.height - handleSize / 2, handleSize, handleSize)
    
    // Bottom-right handle
    ctx.fillRect(cropArea.x + cropArea.width - handleSize / 2, cropArea.y + cropArea.height - handleSize / 2, handleSize, handleSize)
    ctx.strokeRect(cropArea.x + cropArea.width - handleSize / 2, cropArea.y + cropArea.height - handleSize / 2, handleSize, handleSize)

    // Add grid lines for better cropping guidance
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
    ctx.lineWidth = 1
    
    // Vertical lines
    ctx.beginPath()
    ctx.moveTo(cropArea.x + cropArea.width / 3, cropArea.y)
    ctx.lineTo(cropArea.x + cropArea.width / 3, cropArea.y + cropArea.height)
    ctx.moveTo(cropArea.x + (cropArea.width * 2) / 3, cropArea.y)
    ctx.lineTo(cropArea.x + (cropArea.width * 2) / 3, cropArea.y + cropArea.height)
    
    // Horizontal lines
    ctx.moveTo(cropArea.x, cropArea.y + cropArea.height / 3)
    ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + cropArea.height / 3)
    ctx.moveTo(cropArea.x, cropArea.y + (cropArea.height * 2) / 3)
    ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + (cropArea.height * 2) / 3)
    ctx.stroke()

  }, [cropArea, rotation, selectedFilter, imageLoaded, imageDimensions])

  const handleCrop = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image || !imageLoaded) return

    const cropCanvas = document.createElement("canvas")
    const cropCtx = cropCanvas.getContext("2d")
    if (!cropCtx) return

    cropCanvas.width = cropArea.width
    cropCanvas.height = cropArea.height

    // Calculate the scale and position used in the main canvas
    const scale = Math.min(
      (canvas.width - 20) / image.naturalWidth,
      (canvas.height - 20) / image.naturalHeight
    )
    const scaledWidth = image.naturalWidth * scale
    const scaledHeight = image.naturalHeight * scale
    const imageX = (canvas.width - scaledWidth) / 2
    const imageY = (canvas.height - scaledHeight) / 2

    // Apply filter
    cropCtx.filter = filters[selectedFilter].filter

    // Calculate source coordinates relative to the original image
    const sourceX = (cropArea.x - imageX) / scale
    const sourceY = (cropArea.y - imageY) / scale
    const sourceWidth = cropArea.width / scale
    const sourceHeight = cropArea.height / scale

    // Apply rotation if needed
    if (rotation !== 0) {
      cropCtx.save()
      cropCtx.translate(cropArea.width / 2, cropArea.height / 2)
      cropCtx.rotate((rotation * Math.PI) / 180)
      cropCtx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        -cropArea.width / 2,
        -cropArea.height / 2,
        cropArea.width,
        cropArea.height
      )
      cropCtx.restore()
    } else {
      cropCtx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        cropArea.width,
        cropArea.height
      )
    }

    const croppedDataUrl = cropCanvas.toDataURL("image/jpeg", 0.9)
    onCropComplete(croppedDataUrl)
  }, [cropArea, rotation, selectedFilter, onCropComplete, imageLoaded, imageDimensions])

  // Redraw canvas when dependencies change
  useEffect(() => {
    if (imageLoaded) {
      drawCanvas()
    }
  }, [drawCanvas, imageLoaded])

  // Update crop area when canvas size changes due to rotation
  useEffect(() => {
    if (canvasRef.current) {
      const maxX = canvasRef.current.width - cropArea.width
      const maxY = canvasRef.current.height - cropArea.height
      
      setCropArea(prev => ({
        ...prev,
        x: Math.max(0, Math.min(prev.x, maxX)),
        y: Math.max(0, Math.min(prev.y, maxY))
      }))
    }
  }, [rotation, cropArea.width, cropArea.height])

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crop className="w-5 h-5" />
          Crop & Edit Image
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hidden image for loading */}
        <img
          ref={imageRef}
          src={imageSrc || "/placeholder.svg"}
          alt="Source"
          className="hidden"
          onLoad={handleImageLoad}
          crossOrigin="anonymous"
        />

        {/* Canvas for cropping */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="border border-border rounded-lg cursor-move shadow-lg"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Crop Size */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Crop className="w-4 h-4" />
              Crop Size
            </h3>
            <div className="space-y-2">
              <label className="text-sm">Width: {cropArea.width}px</label>
              <Slider
                value={[cropArea.width]}
                onValueChange={([width]) => setCropArea(prev => ({ ...prev, width }))}
                min={50}
                max={500}
                step={10}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">Height: {cropArea.height}px</label>
              <Slider
                value={[cropArea.height]}
                onValueChange={([height]) => setCropArea(prev => ({ ...prev, height }))}
                min={50}
                max={500}
                step={10}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCropArea(prev => ({ ...prev, width: prev.height, height: prev.width }))}
            >
              Square Crop
            </Button>
          </div>

          {/* Rotation */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <RotateCw className="w-4 h-4" />
              Rotation: {rotation}°
            </h3>
            <Slider 
              value={[rotation]} 
              onValueChange={([rot]) => setRotation(rot)} 
              min={0} 
              max={360} 
              step={15} 
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
              >
                Rotate 90°
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRotation(0)}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Filters
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {filters.map((filter, index) => (
              <Badge
                key={filter.name}
                variant={selectedFilter === index ? "default" : "outline"}
                className={`cursor-pointer text-center p-2 transition-all ${
                  selectedFilter === index 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "hover:bg-muted"
                }`}
                onClick={() => setSelectedFilter(index)}
              >
                {filter.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Image Info */}
        {imageLoaded && (
          <div className="text-sm text-muted-foreground">
            Original: {imageDimensions.width} × {imageDimensions.height}px | 
            Crop: {cropArea.width} × {cropArea.height}px
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleCrop} className="flex items-center gap-2" disabled={!imageLoaded}>
            <Download className="w-4 h-4" />
            Apply Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}