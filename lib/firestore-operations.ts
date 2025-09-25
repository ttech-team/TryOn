import { db } from "./firebase"
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, Timestamp } from "firebase/firestore"

export interface WigData {
  id?: string
  name: string
  category: string
  imageUrl: string
  imgbbUrl: string
  createdAt: Timestamp
}

// Upload image using your API route
const uploadImageToApi = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const formData = new FormData()
    formData.append('file', file)

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

export const addWigToFirestore = async (wigData: {
  name: string
  category: string
  imageUrl: string
  imgbbUrl: string
}) => {
  try {
    const docRef = await addDoc(collection(db, "wigs"), {
      name: wigData.name,
      category: wigData.category,
      imageUrl: wigData.imageUrl,
      imgbbUrl: wigData.imgbbUrl,
      createdAt: Timestamp.now(),
    })
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error("Error adding wig to Firestore:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export const getWigsFromFirestore = async (): Promise<WigData[]> => {
  try {
    const q = query(collection(db, "wigs"), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as WigData,
    )
  } catch (error) {
    console.error("Error fetching wigs from Firestore:", error)
    return []
  }
}

export const deleteWigFromFirestore = async (wigId: string) => {
  try {
    await deleteDoc(doc(db, "wigs", wigId))
    return { success: true }
  } catch (error) {
    console.error("Error deleting wig from Firestore:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}