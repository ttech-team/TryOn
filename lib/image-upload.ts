// Image upload utilities for ImgBB integration

const IMGBB_API_KEY = "26dd45e122238f3b560c6ee2be20bbea"
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload"

export interface ImageUploadResult {
  success: boolean
  url?: string
  error?: string
}

export async function uploadImageToImgBB(imageData: string): Promise<ImageUploadResult> {
  try {
    // Convert data URL to base64 (remove data:image/jpeg;base64, prefix)
    const base64Data = imageData.split(",")[1]

    const formData = new FormData()
    formData.append("key", IMGBB_API_KEY)
    formData.append("image", base64Data)
    formData.append("expiration", "600") // 10 minutes expiration

    const response = await fetch(IMGBB_UPLOAD_URL, {
      method: "POST",
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      return {
        success: true,
        url: result.data.url,
      }
    } else {
      return {
        success: false,
        error: result.error?.message || "Upload failed",
      }
    }
  } catch (error) {
    console.error("ImgBB upload error:", error)
    return {
      success: false,
      error: "Network error during upload",
    }
  }
}

export async function uploadToImgBB(blob: Blob): Promise<ImageUploadResult> {
  try {
    const formData = new FormData()
    formData.append("key", IMGBB_API_KEY)
    formData.append("image", blob)
    formData.append("expiration", "600") // 10 minutes expiration

    const response = await fetch(IMGBB_UPLOAD_URL, {
      method: "POST",
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      return {
        success: true,
        url: result.data.url,
      }
    } else {
      return {
        success: false,
        error: result.error?.message || "Upload failed",
      }
    }
  } catch (error) {
    console.error("ImgBB upload error:", error)
    return {
      success: false,
      error: "Network error during upload",
    }
  }
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "Please select an image file" }
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: "Image must be smaller than 10MB" }
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
