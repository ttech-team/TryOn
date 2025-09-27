import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dbungcn6l', // Replace with your cloud name from the dashboard
  api_key: '979279392393332',
  api_secret: 'DCAMIeo0jl1ZY01TAWKmgp1bS_E', // You'll need to get this from Cloudinary dashboard
})

interface CloudinaryResponse {
  success: boolean
  url?: string
  deleteUrl?: string
  thumbUrl?: string
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageData, imageUrl, blob } = body

    let uploadResult

    if (imageData) {
      // Handle base64 data
      uploadResult = await cloudinary.uploader.upload(imageData, {
        resource_type: 'image',
        folder: 'uploads', // Optional: organize uploads in folders
      })
    } else if (imageUrl) {
      // Handle URL upload
      uploadResult = await cloudinary.uploader.upload(imageUrl, {
        resource_type: 'image',
        folder: 'uploads',
      })
    } else if (blob) {
      // Handle blob data
      uploadResult = await cloudinary.uploader.upload(blob, {
        resource_type: 'image',
        folder: 'uploads',
      })
    } else {
      return NextResponse.json(
        { success: false, error: "No image data provided" },
        { status: 400 }
      )
    }

    if (uploadResult && uploadResult.secure_url) {
      return NextResponse.json({
        success: true,
        url: uploadResult.secure_url,
        deleteUrl: `https://api.cloudinary.com/v1_1/${cloudinary.config().cloud_name}/image/destroy/${uploadResult.public_id}`, // For reference, actual deletion needs API call
        thumbUrl: cloudinary.url(uploadResult.public_id, {
          width: 200,
          height: 200,
          crop: 'fill',
          format: 'jpg'
        }),
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Upload failed - no URL returned",
      })
    }
  } catch (error) {
    console.error("Cloudinary upload error:", error)
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

    // Convert file to buffer for Cloudinary
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Cloudinary using buffer
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'uploads',
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      ).end(buffer)
    }) as any

    if (uploadResult && uploadResult.secure_url) {
      return NextResponse.json({
        success: true,
        url: uploadResult.secure_url,
        deleteUrl: `https://api.cloudinary.com/v1_1/${cloudinary.config().cloud_name}/image/destroy/${uploadResult.public_id}`,
        thumbUrl: cloudinary.url(uploadResult.public_id, {
          width: 200,
          height: 200,
          crop: 'fill',
          format: 'jpg'
        }),
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Upload failed - no URL returned",
      })
    }
  } catch (error) {
    console.error("Cloudinary file upload error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Server error during upload",
      },
      { status: 500 }
    )
  }
}