"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Upload, List } from "lucide-react"
import WigUploader from "./wig-uploader"
import WigManager from "./wig-manager"

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"upload" | "manage">("upload")

  const handleLogout = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tokitos Admin Panel</h1>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2 bg-transparent">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-4 mb-8">
          <Button
            variant={activeTab === "upload" ? "default" : "outline"}
            onClick={() => setActiveTab("upload")}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Wig
          </Button>
          <Button
            variant={activeTab === "manage" ? "default" : "outline"}
            onClick={() => setActiveTab("manage")}
            className="flex items-center gap-2"
          >
            <List className="w-4 h-4" />
            Manage Wigs
          </Button>
        </div>

        {activeTab === "upload" && <WigUploader />}
        {activeTab === "manage" && <WigManager />}
      </div>
    </div>
  )
}
