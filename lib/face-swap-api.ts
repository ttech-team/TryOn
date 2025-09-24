// Fixed Face Swap API to match the actual PiAPI specification
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

export async function startFaceSwap(request: FaceSwapRequest): Promise<FaceSwapResult> {
  try {
    const response = await fetch(PIAPI_CREATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PIAPI_API_KEY, // Note: lowercase 'x' as per spec
        "Accept": "application/json",
      },
      body: JSON.stringify({
        model: "Qubico/image-toolkit",
        task_type: "face-swap",
        input: {
          target_image: request.targetImageUrl, // Wig image
          swap_image: request.swapImageUrl,     // User's face
        }
      }),
    })

    const result = await response.json()
    console.log("Start face swap response:", result)
    
    if (response.ok && result.code === 200 && result.data?.task_id) {
      return {
        success: true,
        taskId: result.data.task_id,
      }
    } else {
      return {
        success: false,
        error: result.message || result.error || "Failed to start face swap task",
      }
    }
  } catch (error) {
    console.error("Face swap API error:", error)
    return {
      success: false,
      error: "Network error during face swap request",
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

    const result = await response.json()
    console.log("Task status response:", result)
    
    if (response.ok && result.code === 200) {
      const data = result.data
      
      // Map API status to our internal status
      let mappedStatus: "pending" | "processing" | "completed" | "failed"
      let progress = 0
      let resultUrl: string | undefined
      let error: string | undefined

      switch (data.status?.toLowerCase()) {
        case "completed":
          mappedStatus = "completed"
          progress = 100
          // The result image should be in data.output
          resultUrl = data.output?.image_url || data.output?.url || data.output?.result
          break
        case "processing":
          mappedStatus = "processing"
          progress = 50 // Estimate progress
          break
        case "pending":
        case "staged":
          mappedStatus = "pending"
          progress = 10
          break
        case "failed":
          mappedStatus = "failed"
          progress = 0
          error = data.error?.message || "Face swap processing failed"
          break
        default:
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
      return {
        status: "failed",
        progress: 0,
        error: result.message || result.error || "Failed to check task status",
      }
    }
  } catch (error) {
    console.error("Task status check error:", error)
    return {
      status: "failed",
      progress: 0,
      error: "Network error during status check",
    }
  }
}

export async function performFaceSwap(
  request: FaceSwapRequest,
  onProgress?: (progress: number) => void,
): Promise<FaceSwapResult> {
  // Start the face swap task
  const startResult = await startFaceSwap(request)
  if (!startResult.success || !startResult.taskId) {
    return startResult
  }

  // Poll for completion
  return new Promise((resolve) => {
    let pollCount = 0
    const maxPolls = 150 // 5 minutes with 2-second intervals
    
    const pollInterval = setInterval(async () => {
      pollCount++
      console.log(`Polling attempt ${pollCount}/${maxPolls}`)
      
      const status = await checkTaskStatus(startResult.taskId!)
      
      if (onProgress) {
        onProgress(status.progress)
      }

      if (status.status === "completed" && status.resultUrl) {
        console.log("Face swap completed successfully:", status.resultUrl)
        clearInterval(pollInterval)
        resolve({
          success: true,
          resultUrl: status.resultUrl,
          progress: 100,
        })
      } else if (status.status === "failed") {
        console.log("Face swap failed:", status.error)
        clearInterval(pollInterval)
        resolve({
          success: false,
          error: status.error || "Face swap processing failed",
        })
      } else if (pollCount >= maxPolls) {
        console.log("Face swap timed out after maximum polls")
        clearInterval(pollInterval)
        resolve({
          success: false,
          error: "Face swap processing timed out",
        })
      }
      // Continue polling if status is "pending" or "processing"
    }, 2000) // Check every 2 seconds
  })
}
