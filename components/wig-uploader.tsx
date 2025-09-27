"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, ImageIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { addWigToFirestore } from "@/lib/firestore-operations"
import { clearWigsCache } from "@/lib/cache-manager"

const categories = [
  "Long Hair",
  "Short Hair",
  "Curly Hair",
  "Straight Hair",
  "Wavy Hair",
  "Bob Cut",
  "Pixie Cut",
  "Afro",
  "Braids",
  "Ponytail",
  "Bangs",
  "Colored Hair",
  "Natural Hair",
  "Synthetic Hair",
]

// Upload image using your API route
const uploadImageToApi = async (blob: Blob): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const formData = new FormData()
    formData.append('file', blob)

    const response = await fetch('/api/upload-image', {
      method: 'PUT',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("API upload error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error during upload",
    }
  }
}

export default function WigUploader() {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file")
      setUploadStatus("error")
      return
    }

    // Validate file size (max 32MB for cloudinary)
    if (file.size > 32 * 1024 * 1024) {
      setErrorMessage("File size must be less than 32MB")
      setUploadStatus("error")
      return
    }

    setSelectedFile(file)
    setUploadStatus("idle")
    setErrorMessage("")

    // Create preview URL
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPreviewUrl(result)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!name.trim() || !category || !selectedFile) {
      setErrorMessage("Please fill in all fields and select an image")
      setUploadStatus("error")
      return
    }

    setUploading(true)
    setUploadStatus("idle")
    setErrorMessage("")

    try {
      // Upload to your API route
      const uploadResult = await uploadImageToApi(selectedFile)

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || "Failed to upload image")
      }

      // Save to Firestore
      const firestoreResult = await addWigToFirestore({
        name: name.trim(),
        category,
        imageUrl: uploadResult.url,
        imgbbUrl: uploadResult.url, // Using the same URL for both fields
      })

      if (!firestoreResult.success) {
        throw new Error(firestoreResult.error || "Failed to save wig to database")
      }

      // Clear cache to force refresh
      clearWigsCache()

      // Reset form
      setName("")
      setCategory("")
      setSelectedFile(null)
      setPreviewUrl("")
      setUploadStatus("success")

      // Reset success status after 3 seconds
      setTimeout(() => setUploadStatus("idle"), 3000)
    } catch (error) {
      console.error("Upload error:", error)
      setErrorMessage(error instanceof Error ? error.message : "Upload failed")
      setUploadStatus("error")
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setName("")
    setCategory("")
    setSelectedFile(null)
    setPreviewUrl("")
    setUploadStatus("idle")
    setErrorMessage("")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload New Wig
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Wig Name */}
          <div className="space-y-2">
            <Label htmlFor="wig-name">Wig Name</Label>
            <Input
              id="wig-name"
              placeholder="Enter wig name (e.g., Long Blonde Wavy)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={uploading}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="wig-category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={uploading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <Label>Wig Image</Label>

            {!selectedFile ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="image-upload"
                  disabled={uploading}
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">Click to upload image</p>
                      <p className="text-sm text-muted-foreground">PNG, JPG up to 32MB</p>
                    </div>
                  </div>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={previewUrl || "/placeholder.svg"}
                    alt="Selected image preview"
                    className="w-full max-w-md mx-auto rounded-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null)
                      setPreviewUrl("")
                    }}
                    className="mt-2"
                    disabled={uploading}
                  >
                    Remove Image
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {uploadStatus === "success" && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span>Wig uploaded successfully!</span>
            </div>
          )}

          {uploadStatus === "error" && errorMessage && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button onClick={resetForm} variant="outline" disabled={uploading} className="flex-1 bg-transparent">
              Reset Form
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !name || !category || !selectedFile}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Wig
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}