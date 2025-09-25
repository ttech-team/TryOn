// Image upload utilities that use Next.js API routes
export interface ImageUploadResult {
  success: boolean
  url?: string
  deleteUrl?: string
  thumbUrl?: string
  error?: string
}

// Upload base64 image data via API route
export async function uploadImageToFreeimage(imageData: string): Promise<ImageUploadResult> {
  try {
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData
      }),
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

// Upload blob/file via API route
export async function uploadToFreeimage(blob: Blob): Promise<ImageUploadResult> {
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
    console.error("API blob upload error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error during upload",
    }
  }
}

// Upload image from URL via API route
export async function uploadImageUrlToFreeimage(imageUrl: string): Promise<ImageUploadResult> {
  try {
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("API URL upload error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error during upload",
    }
  }
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "Please select an image file" }
  }

  // Check file size (max 32MB for freeimage.host)
  const maxSize = 32 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: "Image must be smaller than 32MB" }
  }

  return { valid: true }
}

export function resizeImage(file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL("image/jpeg", quality)
      resolve(dataUrl)
    }

    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

// Helper function to convert File to base64 if needed
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
