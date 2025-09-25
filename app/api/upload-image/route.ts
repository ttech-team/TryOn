import { NextRequest, NextResponse } from 'next/server'

const FREEIMAGE_API_KEY = "6d207e02198a847aa98d0a2a901485a5"
const FREEIMAGE_UPLOAD_URL = "https://freeimage.host/api/1/upload"

interface FreeImageResponse {
  status_code: number
  status_txt: string
  image?: {
    url: string
    delete_url: string
    thumb?: {
      url: string
    }
  }
  error?: {
    message: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageData, imageUrl, blob } = body

    const formData = new FormData()
    formData.append("key", FREEIMAGE_API_KEY)
    formData.append("action", "upload")
    formData.append("format", "json")

    if (imageData) {
      // Handle base64 data
      const base64Data = imageData.split(",")[1]
      formData.append("source", base64Data)
    } else if (imageUrl) {
      // Handle URL upload
      formData.append("source", imageUrl)
    } else if (blob) {
      // Handle blob data (convert base64 blob to actual blob)
      const response = await fetch(blob)
      const blobData = await response.blob()
      formData.append("source", blobData)
    } else {
      return NextResponse.json(
        { success: false, error: "No image data provided" },
        { status: 400 }
      )
    }

    const response = await fetch(FREEIMAGE_UPLOAD_URL, {
      method: "POST",
      body: formData,
    })

    const result: FreeImageResponse = await response.json()

    if (result.status_code === 200 && result.image) {
      return NextResponse.json({
        success: true,
        url: result.image.url,
        deleteUrl: result.image.delete_url,
        thumbUrl: result.image.thumb?.url,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error?.message || result.status_txt || "Upload failed",
      })
    }
  } catch (error) {
    console.error("API upload error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Server error during upload",
      },
      { status: 500 }
    )
  }
}

// Handle file uploads via FormData
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      )
    }

    const uploadFormData = new FormData()
    uploadFormData.append("key", FREEIMAGE_API_KEY)
    uploadFormData.append("action", "upload")
    uploadFormData.append("source", file)
    uploadFormData.append("format", "json")

    const response = await fetch(FREEIMAGE_UPLOAD_URL, {
      method: "POST",
      body: uploadFormData,
    })

    const result: FreeImageResponse = await response.json()

    if (result.status_code === 200 && result.image) {
      return NextResponse.json({
        success: true,
        url: result.image.url,
        deleteUrl: result.image.delete_url,
        thumbUrl: result.image.thumb?.url,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error?.message || result.status_txt || "Upload failed",
      })
    }
  } catch (error) {
    console.error("API file upload error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Server error during upload",
      },
      { status: 500 }
    )
  }
}