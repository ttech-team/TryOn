import { db } from "./firebase"
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from "firebase/firestore"

export interface WigData {
  id?: string
  name: string
  category: string
  imageUrl: string
  imgbbUrl: string
  createdAt: Timestamp
}

export const addWigToFirestore = async (wigData: Omit<WigData, "id" | "createdAt">) => {
  try {
    const docRef = await addDoc(collection(db, "wigs"), {
      ...wigData,
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
