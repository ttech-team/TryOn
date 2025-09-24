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
      return {
        success: false,
        error: result.message?.en || "Failed to start hairstyle swap task",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Network error during hairstyle swap request",
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
          break
        default:
          // Log unknown status for debugging
          console.log("Unknown status:", data.status)
          mappedStatus = "pending"
          progress = 5
      }

      return {
        status: mappedStatus,
        progress,
        resultUrl,
        error: data.error || undefined,
      }
    } else {
      return {
        status: "failed",
        progress: 0,
        error: "Failed to check task status",
      }
    }
  } catch (error) {
    return {
      status: "failed",
      progress: 0,
      error: "Network error during status check",
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
            error: "Task completed but no result image was generated",
          })
        }
      } else if (status.status === "failed") {
        console.log("Task failed:", status.error)
        clearInterval(pollInterval)
        resolve({
          success: false,
          error: status.error || "Hairstyle swap processing failed",
        })
      } else if (pollCount >= maxPolls) {
        console.log("Task timed out after maximum polls")
        clearInterval(pollInterval)
        resolve({
          success: false,
          error: "Hairstyle swap processing timed out",
        })
      }
      // Continue polling for "pending" or "processing" status
    }, 2000)
  })
}