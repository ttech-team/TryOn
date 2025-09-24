"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogOut, Upload, List, Trash2, AlertCircle, Eye, Calendar } from "lucide-react"
import WigUploader from "./wig-uploader"
import { getWigsFromFirestore, deleteWigFromFirestore, type WigData } from "@/lib/firestore-operations"

interface DeleteConfirmationModalProps {
  isOpen: boolean
  wigName: string
  onConfirm: () => void
  onCancel: () => void
}

const DeleteConfirmationModal = ({ isOpen, wigName, onConfirm, onCancel }: DeleteConfirmationModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg p-4 sm:p-6 max-w-md w-full mx-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold truncate">Delete Wig</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">This action cannot be undone</p>
          </div>
        </div>
        
        <p className="mb-4 sm:mb-6 text-xs sm:text-sm">
          Are you sure you want to delete <span className="font-semibold truncate">"{wigName}"</span>? 
          This will permanently remove it from the database and users will no longer be able to try it on.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} className="order-2 sm:order-1">
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="order-1 sm:order-2">
            Delete Wig
          </Button>
        </div>
      </div>
    </div>
  )
}

function WigManager() {
  const [wigs, setWigs] = useState<WigData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingWigId, setDeletingWigId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [wigToDelete, setWigToDelete] = useState<WigData | null>(null)

  useEffect(() => {
    loadWigs()
  }, [])

  const loadWigs = async () => {
    try {
      setLoading(true)
      setError(null)
      const wigsData = await getWigsFromFirestore()
      setWigs(wigsData)
    } catch (err) {
      setError("Failed to load wigs")
      console.error("Error loading wigs:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (wig: WigData) => {
    setWigToDelete(wig)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!wigToDelete?.id) return

    try {
      setDeletingWigId(wigToDelete.id)
      const result = await deleteWigFromFirestore(wigToDelete.id)
      
      if (result.success) {
        setWigs(wigs.filter(wig => wig.id !== wigToDelete.id))
        setShowDeleteModal(false)
        setWigToDelete(null)
      } else {
        setError(result.error || "Failed to delete wig")
      }
    } catch (err) {
      setError("Failed to delete wig")
      console.error("Delete error:", err)
    } finally {
      setDeletingWigId(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setWigToDelete(null)
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return "Unknown"
    return timestamp.toDate().toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center py-8 sm:py-12 px-4">
        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
        <span className="ml-2 mt-2 sm:mt-0 text-sm sm:text-base">Loading wigs...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 sm:py-12 px-4">
        <div className="text-red-600 mb-4 text-sm sm:text-base">{error}</div>
        <Button onClick={loadWigs} variant="outline" size="sm" className="sm:text-base">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold truncate">Manage Wigs</h2>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">View and delete wigs from your collection</p>
        </div>
        <Badge variant="secondary" className="text-xs sm:text-sm w-fit self-start sm:self-auto">
          {wigs.length} total wigs
        </Badge>
      </div>

      {wigs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 sm:py-12 px-4">
            <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">No wigs found</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Upload some wigs to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {wigs.map((wig) => (
            <Card key={wig.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
                <img
                  src={wig.imageUrl || "/placeholder.svg"}
                  alt={wig.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-xs">
                    {wig.category}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg truncate">{wig.name}</CardTitle>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  {formatDate(wig.createdAt)}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs sm:text-sm"
                    onClick={() => window.open(wig.imageUrl, '_blank')}
                  >
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    View
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(wig)}
                    disabled={deletingWigId === wig.id}
                    className="text-xs sm:text-sm"
                  >
                    {deletingWigId === wig.id ? (
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white" />
                    ) : (
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        wigName={wigToDelete?.name || ""}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  )
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"upload" | "manage">("upload")

  const handleLogout = () => {
    window.location.href = window.location.host + "/"
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">Tokitos Admin Panel</h1>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2 bg-transparent text-xs sm:text-sm">
            <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
            Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Button
            variant={activeTab === "upload" ? "default" : "outline"}
            onClick={() => setActiveTab("upload")}
            className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
          >
            <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
            Upload Wig
          </Button>
          <Button
            variant={activeTab === "manage" ? "default" : "outline"}
            onClick={() => setActiveTab("manage")}
            className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
          >
            <List className="w-3 h-3 sm:w-4 sm:h-4" />
            Manage Wigs
          </Button>
        </div>

        {activeTab === "upload" && <WigUploader />}
        {activeTab === "manage" && <WigManager />}
      </div>
    </div>
  )
}