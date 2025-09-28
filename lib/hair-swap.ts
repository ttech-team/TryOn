// Face Swap API using PiAPI
const PIAPI_API_KEY = "10276de17f920eb7b06a831b406f5409469d0736e807f0e8a14c597ca7d9f7ee"
const PIAPI_CREATE_URL = "https://api.piapi.ai/api/v1/task"
const PIAPI_FETCH_URL = "https://api.piapi.ai/api/v1/task"

export interface FaceSwapRequest {
  swapImageUrl: string // User's face image URL
  targetImageUrl: string // Wig image URL
}

export interface FaceSwapResult {
  success: boolean
  resultUrl?: string
  taskId?: string
  error?: string
  progress?: number
}

export interface TaskStatus {
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  resultUrl?: string
  error?: string
}

// Image size validation and resizing
const MAX_IMAGE_SIZE = 2048

// Function to check image dimensions and resize if needed
async function validateAndResizeImage(imageUrl: string, imageType: 'face' | 'wig'): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = function() {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Could not create canvas context'))
        return
      }

      let { width, height } = img
      
      // Check if resizing is needed
      if (width <= MAX_IMAGE_SIZE && height <= MAX_IMAGE_SIZE) {
        console.log(`${imageType} image dimensions are within limits: ${width}x${height}`)
        resolve(imageUrl) // No resizing needed
        return
      }

      console.log(`${imageType} image needs resizing: ${width}x${height}`)
      
      // Calculate new dimensions while maintaining aspect ratio
      let newWidth, newHeight
      if (width > height) {
        newWidth = MAX_IMAGE_SIZE
        newHeight = Math.round((height * MAX_IMAGE_SIZE) / width)
      } else {
        newHeight = MAX_IMAGE_SIZE
        newWidth = Math.round((width * MAX_IMAGE_SIZE) / height)
      }

      console.log(`Resizing ${imageType} image to: ${newWidth}x${newHeight}`)

      // Resize the image
      canvas.width = newWidth
      canvas.height = newHeight
      
      ctx.drawImage(img, 0, 0, newWidth, newHeight)
      
      // Convert back to data URL
      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9)
      resolve(resizedDataUrl)
    }
    
    img.onerror = function() {
      console.warn(`Could not load ${imageType} image for validation, proceeding with original`)
      resolve(imageUrl) // Proceed with original if we can't validate
    }
    
    img.src = imageUrl
  })
}

// Enhanced error message mapping for face swap
const getDescriptiveError = (errorCode: string, errorMessage: string): string => {
  const errorMappings: Record<string, { message: string; solution: string }> = {
    '10003': {
      message: 'Image size too large',
      solution: 'The wig image has been automatically resized. Please try again.'
    },
    'FACE_NOT_FOUND': {
      message: 'No face detected in your photo',
      solution: 'Please upload a clear photo where your face is clearly visible and well-lit'
    },
    'MULTIPLE_FACES': {
      message: 'Multiple faces detected',
      solution: 'Please upload a photo with only one person facing the camera directly'
    },
    'POOR_QUALITY': {
      message: 'Image quality is too low',
      solution: 'Use a higher resolution photo with good lighting and clear facial features'
    },
    'FACE_TOO_SMALL': {
      message: 'Face is too small in the image',
      solution: 'Please upload a closer photo where your face takes up at least 1/3 of the image'
    },
    'BAD_LIGHTING': {
      message: 'Poor lighting conditions',
      solution: 'Use a photo with even lighting - avoid shadows, backlight, or extreme brightness'
    },
    'BLURRY_IMAGE': {
      message: 'Image is too blurry',
      solution: 'Please upload a sharper photo. Hold your camera steady or use better lighting'
    },
    'INVALID_IMAGE_FORMAT': {
      message: 'Unsupported image format',
      solution: 'Please use JPG, PNG, or WebP format. Convert your image if needed'
    },
    'IMAGE_TOO_LARGE': {
      message: 'Image file is too large',
      solution: 'Please compress your image to under 10MB or use a smaller file size'
    },
    'IMAGE_TOO_SMALL': {
      message: 'Image resolution is too low',
      solution: 'Please use an image with at least 500x500 pixels resolution'
    },
    'NETWORK_ERROR': {
      message: 'Network connection failed',
      solution: 'Check your internet connection and try again. If using mobile data, ensure strong signal'
    },
    'SERVER_ERROR': {
      message: 'Server is temporarily unavailable',
      solution: 'Please wait a few minutes and try again. The service may be undergoing maintenance'
    },
    'RATE_LIMITED': {
      message: 'Too many requests',
      solution: 'Please wait a few minutes before trying again. We limit requests to ensure service quality'
    },
    'API_KEY_INVALID': {
      message: 'Service configuration error',
      solution: 'This is a system issue. Please contact support if the problem persists'
    },
    'PROCESSING_TIMEOUT': {
      message: 'Processing took too long',
      solution: 'Please try again with a smaller image or better lighting conditions'
    },
    'SAFETY_VIOLATION': {
      message: 'Content policy violation',
      solution: 'Please use appropriate images that comply with our terms of service'
    },
    'UNSUPPORTED_ANGLE': {
      message: 'Face angle not supported',
      solution: 'Please use a front-facing photo with your head straight and both eyes visible'
    },
    'OCCLUSION': {
      message: 'Face is partially covered',
      solution: 'Remove glasses, hats, or hair covering your face. Ensure your entire face is visible'
    },
    'EXPRESSION_EXTREME': {
      message: 'Facial expression too extreme',
      solution: 'Use a photo with a neutral expression - avoid wide open mouth or squinted eyes'
    }
  }

  // Check for specific error codes first
  if (errorMappings[errorCode]) {
    return `${errorMappings[errorCode].message}. ${errorMappings[errorCode].solution}`
  }

  // Handle message-based errors
  const lowerMessage = errorMessage.toLowerCase()
  
  if (lowerMessage.includes('too large') || lowerMessage.includes('size') || lowerMessage.includes('2048')) {
    return 'Image size too large. The image has been automatically resized. Please try again.'
  }
  
  if (lowerMessage.includes('face') && lowerMessage.includes('detect')) {
    return 'No face detected in your photo. Please upload a clear photo where your face is clearly visible and well-lit.'
  }
  
  if (lowerMessage.includes('multiple') || lowerMessage.includes('many')) {
    return 'Multiple faces detected. Please upload a photo with only one person facing the camera directly.'
  }

  // Fallback for unknown errors
  return `Face swap failed: ${errorMessage}. Please try uploading a clearer photo with good lighting where your face is clearly visible.`
}

export async function startFaceSwap(request: FaceSwapRequest): Promise<FaceSwapResult> {
  try {
    console.log("Starting face swap with image validation...")

    // Validate and resize images if needed
    let processedTargetImage = request.targetImageUrl
    let processedSwapImage = request.swapImageUrl

    try {
      processedTargetImage = await validateAndResizeImage(request.targetImageUrl, 'wig')
      processedSwapImage = await validateAndResizeImage(request.swapImageUrl, 'face')
    } catch (resizeError) {
      console.warn('Image resizing failed, proceeding with original images:', resizeError)
    }

    const response = await fetch(PIAPI_CREATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PIAPI_API_KEY,
        "Accept": "application/json",
      },
      body: JSON.stringify({
        model: "Qubico/image-toolkit",
        task_type: "face-swap",
        input: {
          target_image: processedTargetImage, // Wig image
          swap_image: processedSwapImage,     // User's face
        }
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    console.log("Face swap API response:", result)
    
    if (result.code === 200 && result.data?.task_id) {
      return {
        success: true,
        taskId: result.data.task_id,
      }
    } else {
      const errorMessage = result.message || result.error || "Failed to start face swap task"
      const errorCode = result.code || result.data?.error?.code || 'UNKNOWN_ERROR'
      return {
        success: false,
        error: getDescriptiveError(errorCode.toString(), errorMessage),
      }
    }
  } catch (error) {
    console.error("Face swap API error:", error)
    return {
      success: false,
      error: "Network connection error. Please check your internet and try again.",
    }
  }
}

export async function checkTaskStatus(taskId: string): Promise<TaskStatus> {
  try {
    const response = await fetch(`${PIAPI_FETCH_URL}/${taskId}`, {
      method: "GET",
      headers: {
        "x-api-key": PIAPI_API_KEY,
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    console.log("Task status response:", result)
    
    if (result.code === 200) {
      const data = result.data
      
      let mappedStatus: "pending" | "processing" | "completed" | "failed"
      let progress = 0
      let resultUrl: string | undefined
      let error: string | undefined

      switch (data.status?.toLowerCase()) {
        case "completed":
          mappedStatus = "completed"
          progress = 100
          resultUrl = data.output?.image_url || data.output?.url || data.output?.result
          if (!resultUrl) {
            error = "Processing completed but no result image was generated"
          }
          break
        case "processing":
        case "running":
          mappedStatus = "processing"
          progress = data.progress || 50
          break
        case "pending":
        case "staged":
        case "queued":
          mappedStatus = "pending"
          progress = data.progress || 10
          break
        case "failed":
        case "error":
        case "cancelled":
          mappedStatus = "failed"
          progress = 0
          const errorCode = data.error?.code || result.code || 'PROCESSING_FAILED'
          const errorMessage = data.error?.message || data.error || result.message || 'Processing failed'
          error = getDescriptiveError(errorCode.toString(), errorMessage)
          break
        default:
          console.log("Unknown status:", data.status)
          mappedStatus = "pending"
          progress = 5
      }

      return {
        status: mappedStatus,
        progress,
        resultUrl,
        error,
      }
    } else {
      const errorMessage = result.message || result.error || "Failed to check task status"
      const errorCode = result.code || 'STATUS_CHECK_FAILED'
      return {
        status: "failed",
        progress: 0,
        error: getDescriptiveError(errorCode.toString(), errorMessage),
      }
    }
  } catch (error) {
    console.error("Task status check error:", error)
    return {
      status: "failed",
      progress: 0,
      error: "Unable to check processing status. Please check your internet connection and try again.",
    }
  }
}

export async function performFaceSwap(
  request: FaceSwapRequest,
  onProgress?: (progress: number) => void,
): Promise<FaceSwapResult> {
  console.log("Starting face swap process with image validation...")
  
  // Validate inputs
  if (!request.swapImageUrl || !request.targetImageUrl) {
    return {
      success: false,
      error: "Missing required images. Please provide both your face photo and the hairstyle image.",
    }
  }

  // Start the face swap task
  const startResult = await startFaceSwap(request)
  if (!startResult.success) {
    return startResult
  }

  if (!startResult.taskId) {
    return {
      success: false,
      error: "Failed to start processing. No task ID received from the server.",
    }
  }

  console.log("Face swap task started:", startResult.taskId)

  // Poll for completion
  return new Promise((resolve) => {
    let pollCount = 0
    const maxPolls = 180
    let lastProgress = 0
    
    const pollInterval = setInterval(async () => {
      pollCount++
      console.log(`Polling attempt ${pollCount}/${maxPolls}`)
      
      try {
        const status = await checkTaskStatus(startResult.taskId!)
        console.log("Current status:", status.status, "Progress:", status.progress)
        
        if (onProgress && status.progress !== lastProgress) {
          onProgress(status.progress)
          lastProgress = status.progress
        }

        if (status.status === "completed") {
          clearInterval(pollInterval)
          if (status.resultUrl) {
            console.log("Face swap completed successfully with result:", status.resultUrl)
            if (onProgress) onProgress(100)
            resolve({
              success: true,
              resultUrl: status.resultUrl,
              progress: 100,
              taskId: startResult.taskId,
            })
          } else {
            resolve({
              success: false,
              error: status.error || "Processing completed but no result image was generated. Please try again with different photos.",
              taskId: startResult.taskId,
            })
          }
        } else if (status.status === "failed") {
          console.log("Face swap failed:", status.error)
          clearInterval(pollInterval)
          resolve({
            success: false,
            error: status.error || "Face swap processing failed due to unknown reasons. Please try again.",
            taskId: startResult.taskId,
          })
        } else if (pollCount >= maxPolls) {
          console.log("Face swap timed out after maximum polls")
          clearInterval(pollInterval)
          resolve({
            success: false,
            error: "Processing is taking longer than expected. This might be due to server load or image complexity. Please try again in a moment.",
            taskId: startResult.taskId,
          })
        }
      } catch (error) {
        console.error("Error during polling:", error)
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval)
          resolve({
            success: false,
            error: "Unable to complete processing due to connection issues. Please check your internet and try again.",
            taskId: startResult.taskId,
          })
        }
      }
    }, 2000)
  })
}

// Export with the correct function name that matches your import
export { performFaceSwap as performHairstyleSwap }



// const VMODEL_API_TOKEN = "auUi6W3shdbijfmkk26YiWvVTUSzh8BlNIh8TFayPg5SquzpmZx7uVGmTOMmihoLXg25d4xKSr4WkuiDSpBOtg=="
// const VMODEL_CREATE_URL = "https://api.vmodel.ai/api/tasks/v1/create"
// const VMODEL_STATUS_URL = "https://api.vmodel.ai/api/tasks/v1/get"

// export interface HairstyleSwapRequest {
//   sourceImageUrl: string
//   targetImageUrl: string
//   disableSafetyChecker?: boolean
// }

// export interface HairstyleSwapResult {
//   success: boolean
//   resultUrl?: string
//   taskId?: string
//   error?: string
//   progress?: number
// }

// export interface TaskStatus {
//   status: "pending" | "processing" | "completed" | "failed"
//   progress: number
//   resultUrl?: string
//   error?: string
// }

// // Enhanced error message mapping
// const getDescriptiveError = (errorCode: string, errorMessage: string): string => {
//   // Handle specific error codes
//   const errorMappings: Record<string, string> = {
//     'HairSwap.Swap.Failed': 'Please try uploading a clearer photo with better lighting where your face is clearly visible.',
//     'Download.Unknown': 'Unable to download the image. Please check your internet connection and try again.',
//     'Upload.Failed': 'Image upload failed. Please check your internet connection and try again.',
//     'InvalidImage': 'This image cannot be processed. Please use a clear photo showing your face.',
//     'FaceNotDetected': 'No face was detected in your photo. Please upload a clear image where your face is clearly visible.',
//     'ImageTooSmall': 'Image resolution is too low. Please upload a higher quality image.',
//     'ImageTooLarge': 'Image file is too large. Please compress your image and try again.',
//     'UnsupportedFormat': 'Image format not supported. Please use JPG, PNG, or WebP format.',
//     'NetworkError': 'Network connection error. Please check your internet and try again.',
//     'ServerError': 'Server temporarily unavailable. Please try again in a few moments.',
//     'SafetyViolation': 'Image content violates safety guidelines. Please use a different photo.',
//     'ProcessingTimeout': 'Processing took too long and timed out. Please try again with a smaller image.',
//   }

//   // Check for specific error codes first
//   if (errorMappings[errorCode]) {
//     return errorMappings[errorCode]
//   }

//   // Handle message-based errors
//   const lowerMessage = errorMessage.toLowerCase()
  
//   if (lowerMessage.includes('download') && lowerMessage.includes('failed')) {
//     return 'Unable to process the image. Please check your internet connection and try uploading again.'
//   }
  
//   if (lowerMessage.includes('face') || lowerMessage.includes('detection')) {
//     return 'No clear face detected. Please upload a photo where your face is well-lit and clearly visible.'
//   }
  
//   if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
//     return 'Network connection error. Please check your internet and try again.'
//   }
  
//   if (lowerMessage.includes('timeout') || lowerMessage.includes('time')) {
//     return 'Processing timed out. Please try again with a smaller, clearer image.'
//   }
  
//   if (lowerMessage.includes('format') || lowerMessage.includes('invalid')) {
//     return 'Image format issue. Please use a standard JPG or PNG image.'
//   }
  
//   if (lowerMessage.includes('size') || lowerMessage.includes('large')) {
//     return 'Image is too large or small. Please use a medium-sized, clear photo.'
//   }
  
//   if (lowerMessage.includes('quality') || lowerMessage.includes('blur')) {
//     return 'Image quality is too low. Please upload a clearer, higher quality photo.'
//   }
  
//   if (lowerMessage.includes('safety') || lowerMessage.includes('content')) {
//     return 'Image content cannot be processed. Please use a different photo.'
//   }
  
//   if (lowerMessage === 'fail' || lowerMessage === 'failed' || !errorMessage) {
//     return 'Hairstyle swap failed. Please try uploading a clearer photo with good lighting where your face is clearly visible.'
//   }
  
//   // Fallback for unknown errors
//   return `Processing failed: ${errorMessage}. Please try uploading a clearer photo or check your internet connection.`
// }

// export async function startHairstyleSwap(request: HairstyleSwapRequest): Promise<HairstyleSwapResult> {
//   try {
//     const response = await fetch(VMODEL_CREATE_URL, {
//       method: "POST",
//       headers: {
//         "Authorization": `Bearer ${VMODEL_API_TOKEN}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         version: "5c0440717a995b0bbd93377bd65dbb4fe360f67967c506aa6bd8f6b660733a7e",
//         input: {
//           source: request.sourceImageUrl,
//           target: request.targetImageUrl,
//           disable_safety_checker: request.disableSafetyChecker || false
//         }
//       }),
//     })

//     const result = await response.json()
    
//     if (response.ok && result.code === 200 && result.result?.task_id) {
//       return {
//         success: true,
//         taskId: result.result.task_id,
//       }
//     } else {
//       const errorMessage = result.message?.en || result.message || "Failed to start hairstyle swap task"
//       return {
//         success: false,
//         error: getDescriptiveError(result.code || 'Unknown', errorMessage),
//       }
//     }
//   } catch (error) {
//     return {
//       success: false,
//       error: "Network connection error. Please check your internet and try again.",
//     }
//   }
// }

// export async function checkTaskStatus(taskId: string): Promise<TaskStatus> {
//   try {
//     const response = await fetch(`${VMODEL_STATUS_URL}/${taskId}`, {
//       method: "GET",
//       headers: {
//         "Authorization": `Bearer ${VMODEL_API_TOKEN}`,
//       },
//     })

//     const result = await response.json()
    
//     if (response.ok && result.code === 200) {
//       const data = result.result
//       let mappedStatus: "pending" | "processing" | "completed" | "failed"
//       let progress = 0
//       let resultUrl: string | undefined
//       let error: string | undefined

//       switch (data.status) {
//         case "succeeded":
//         case "completed":
//           mappedStatus = "completed"
//           progress = 100
//           resultUrl = data.output?.[0]
//           break
//         case "processing":
//         case "running":
//           mappedStatus = "processing"
//           progress = 50
//           break
//         case "pending":
//         case "queued":
//         case "starting":
//           mappedStatus = "pending"
//           progress = 10
//           break
//         case "failed":
//         case "error":
//         case "cancelled":
//           mappedStatus = "failed"
//           progress = 0
//           // Enhanced error handling for failed tasks
//           const errorCode = data.error?.code || 'HairSwap.Swap.Failed'
//           const errorMessage = data.error?.message || data.error || 'fail'
//           error = getDescriptiveError(errorCode, errorMessage)
//           break
//         default:
//           console.log("Unknown status:", data.status)
//           mappedStatus = "pending"
//           progress = 5
//       }

//       return {
//         status: mappedStatus,
//         progress,
//         resultUrl,
//         error,
//       }
//     } else {
//       const errorMessage = result.message || "Failed to check task status"
//       return {
//         status: "failed",
//         progress: 0,
//         error: getDescriptiveError(result.code || 'Unknown', errorMessage),
//       }
//     }
//   } catch (error) {
//     return {
//       status: "failed",
//       progress: 0,
//       error: "Network connection error. Please check your internet and try again.",
//     }
//   }
// }

// export async function performHairstyleSwap(
//   request: HairstyleSwapRequest,
//   onProgress?: (progress: number) => void,
// ): Promise<HairstyleSwapResult> {
//   const startResult = await startHairstyleSwap(request)
//   if (!startResult.success || !startResult.taskId) {
//     return startResult
//   }

//   return new Promise((resolve) => {
//     let pollCount = 0
//     const maxPolls = 150
    
//     const pollInterval = setInterval(async () => {
//       pollCount++
//       console.log(`Polling attempt ${pollCount}/${maxPolls}`)
      
//       const status = await checkTaskStatus(startResult.taskId!)
//       console.log("Current status:", status.status, "Progress:", status.progress)
      
//       if (onProgress) {
//         onProgress(status.progress)
//       }

//       if (status.status === "completed") {
//         clearInterval(pollInterval)
//         if (status.resultUrl) {
//           console.log("Task completed successfully with result:", status.resultUrl)
//           resolve({
//             success: true,
//             resultUrl: status.resultUrl,
//             progress: 100,
//           })
//         } else {
//           console.log("Task completed but no result URL found")
//           resolve({
//             success: false,
//             error: "Processing completed but no result image was generated. Please try again.",
//           })
//         }
//       } else if (status.status === "failed") {
//         console.log("Task failed:", status.error)
//         clearInterval(pollInterval)
//         resolve({
//           success: false,
//           error: status.error || getDescriptiveError('HairSwap.Swap.Failed', 'Processing failed'),
//         })
//       } else if (pollCount >= maxPolls) {
//         console.log("Task timed out after maximum polls")
//         clearInterval(pollInterval)
//         resolve({
//           success: false,
//           error: "Processing timed out. Please try again with a smaller, clearer image.",
//         })
//       }
//     }, 2000)
//   })
// }