const VMODEL_API_TOKEN = "auUi6W3shdbijfmkk26YiWvVTUSzh8BlNIh8TFayPg5SquzpmZx7uVGmTOMmihoLXg25d4xKSr4WkuiDSpBOtg=="
const VMODEL_CREATE_URL = "https://api.vmodel.ai/api/tasks/v1/create"
const VMODEL_STATUS_URL = "https://api.vmodel.ai/api/tasks/v1/get"

export interface HairstyleSwapRequest {
  sourceImageUrl: string
  targetImageUrl: string
  disableSafetyChecker?: boolean
}

export interface HairstyleSwapResult {
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

// Enhanced error message mapping
const getDescriptiveError = (errorCode: string, errorMessage: string): string => {
  // Handle specific error codes
  const errorMappings: Record<string, string> = {
    'HairSwap.Swap.Failed': 'Please try uploading a clearer photo with better lighting where your face is clearly visible.',
    'Download.Unknown': 'Unable to download the image. Please check your internet connection and try again.',
    'Upload.Failed': 'Image upload failed. Please check your internet connection and try again.',
    'InvalidImage': 'This image cannot be processed. Please use a clear photo showing your face.',
    'FaceNotDetected': 'No face was detected in your photo. Please upload a clear image where your face is clearly visible.',
    'ImageTooSmall': 'Image resolution is too low. Please upload a higher quality image.',
    'ImageTooLarge': 'Image file is too large. Please compress your image and try again.',
    'UnsupportedFormat': 'Image format not supported. Please use JPG, PNG, or WebP format.',
    'NetworkError': 'Network connection error. Please check your internet and try again.',
    'ServerError': 'Server temporarily unavailable. Please try again in a few moments.',
    'SafetyViolation': 'Image content violates safety guidelines. Please use a different photo.',
    'ProcessingTimeout': 'Processing took too long and timed out. Please try again with a smaller image.',
  }

  // Check for specific error codes first
  if (errorMappings[errorCode]) {
    return errorMappings[errorCode]
  }

  // Handle message-based errors
  const lowerMessage = errorMessage.toLowerCase()
  
  if (lowerMessage.includes('download') && lowerMessage.includes('failed')) {
    return 'Unable to process the image. Please check your internet connection and try uploading again.'
  }
  
  if (lowerMessage.includes('face') || lowerMessage.includes('detection')) {
    return 'No clear face detected. Please upload a photo where your face is well-lit and clearly visible.'
  }
  
  if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
    return 'Network connection error. Please check your internet and try again.'
  }
  
  if (lowerMessage.includes('timeout') || lowerMessage.includes('time')) {
    return 'Processing timed out. Please try again with a smaller, clearer image.'
  }
  
  if (lowerMessage.includes('format') || lowerMessage.includes('invalid')) {
    return 'Image format issue. Please use a standard JPG or PNG image.'
  }
  
  if (lowerMessage.includes('size') || lowerMessage.includes('large')) {
    return 'Image is too large or small. Please use a medium-sized, clear photo.'
  }
  
  if (lowerMessage.includes('quality') || lowerMessage.includes('blur')) {
    return 'Image quality is too low. Please upload a clearer, higher quality photo.'
  }
  
  if (lowerMessage.includes('safety') || lowerMessage.includes('content')) {
    return 'Image content cannot be processed. Please use a different photo.'
  }
  
  if (lowerMessage === 'fail' || lowerMessage === 'failed' || !errorMessage) {
    return 'Hairstyle swap failed. Please try uploading a clearer photo with good lighting where your face is clearly visible.'
  }
  
  // Fallback for unknown errors
  return `Processing failed: ${errorMessage}. Please try uploading a clearer photo or check your internet connection.`
}

export async function startHairstyleSwap(request: HairstyleSwapRequest): Promise<HairstyleSwapResult> {
  try {
    const response = await fetch(VMODEL_CREATE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VMODEL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "5c0440717a995b0bbd93377bd65dbb4fe360f67967c506aa6bd8f6b660733a7e",
        input: {
          source: request.sourceImageUrl,
          target: request.targetImageUrl,
          disable_safety_checker: request.disableSafetyChecker || false
        }
      }),
    })

    const result = await response.json()
    
    if (response.ok && result.code === 200 && result.result?.task_id) {
      return {
        success: true,
        taskId: result.result.task_id,
      }
    } else {
      const errorMessage = result.message?.en || result.message || "Failed to start hairstyle swap task"
      return {
        success: false,
        error: getDescriptiveError(result.code || 'Unknown', errorMessage),
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Network connection error. Please check your internet and try again.",
    }
  }
}

export async function checkTaskStatus(taskId: string): Promise<TaskStatus> {
  try {
    const response = await fetch(`${VMODEL_STATUS_URL}/${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${VMODEL_API_TOKEN}`,
      },
    })

    const result = await response.json()
    
    if (response.ok && result.code === 200) {
      const data = result.result
      let mappedStatus: "pending" | "processing" | "completed" | "failed"
      let progress = 0
      let resultUrl: string | undefined
      let error: string | undefined

      switch (data.status) {
        case "succeeded":
        case "completed":
          mappedStatus = "completed"
          progress = 100
          resultUrl = data.output?.[0]
          break
        case "processing":
        case "running":
          mappedStatus = "processing"
          progress = 50
          break
        case "pending":
        case "queued":
        case "starting":
          mappedStatus = "pending"
          progress = 10
          break
        case "failed":
        case "error":
        case "cancelled":
          mappedStatus = "failed"
          progress = 0
          // Enhanced error handling for failed tasks
          const errorCode = data.error?.code || 'HairSwap.Swap.Failed'
          const errorMessage = data.error?.message || data.error || 'fail'
          error = getDescriptiveError(errorCode, errorMessage)
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
      const errorMessage = result.message || "Failed to check task status"
      return {
        status: "failed",
        progress: 0,
        error: getDescriptiveError(result.code || 'Unknown', errorMessage),
      }
    }
  } catch (error) {
    return {
      status: "failed",
      progress: 0,
      error: "Network connection error. Please check your internet and try again.",
    }
  }
}

export async function performHairstyleSwap(
  request: HairstyleSwapRequest,
  onProgress?: (progress: number) => void,
): Promise<HairstyleSwapResult> {
  const startResult = await startHairstyleSwap(request)
  if (!startResult.success || !startResult.taskId) {
    return startResult
  }

  return new Promise((resolve) => {
    let pollCount = 0
    const maxPolls = 150
    
    const pollInterval = setInterval(async () => {
      pollCount++
      console.log(`Polling attempt ${pollCount}/${maxPolls}`)
      
      const status = await checkTaskStatus(startResult.taskId!)
      console.log("Current status:", status.status, "Progress:", status.progress)
      
      if (onProgress) {
        onProgress(status.progress)
      }

      if (status.status === "completed") {
        clearInterval(pollInterval)
        if (status.resultUrl) {
          console.log("Task completed successfully with result:", status.resultUrl)
          resolve({
            success: true,
            resultUrl: status.resultUrl,
            progress: 100,
          })
        } else {
          console.log("Task completed but no result URL found")
          resolve({
            success: false,
            error: "Processing completed but no result image was generated. Please try again.",
          })
        }
      } else if (status.status === "failed") {
        console.log("Task failed:", status.error)
        clearInterval(pollInterval)
        resolve({
          success: false,
          error: status.error || getDescriptiveError('HairSwap.Swap.Failed', 'Processing failed'),
        })
      } else if (pollCount >= maxPolls) {
        console.log("Task timed out after maximum polls")
        clearInterval(pollInterval)
        resolve({
          success: false,
          error: "Processing timed out. Please try again with a smaller, clearer image.",
        })
      }
    }, 2000)
  })
}