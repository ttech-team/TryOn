"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getWigsFromFirestore, type WigData } from "@/lib/firestore-operations"
import { Loader2 } from "lucide-react"

export default function WigManager() {
  const [wigs, setWigs] = useState<WigData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWigs = async () => {
      setLoading(true)
      const wigsData = await getWigsFromFirestore()
      setWigs(wigsData)
      setLoading(false)
    }
    fetchWigs()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading wigs...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Manage Wigs ({wigs.length})</h2>

      {wigs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No wigs uploaded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wigs.map((wig) => (
            <Card key={wig.id}>
              <CardHeader className="pb-3">
                <div className="aspect-square relative overflow-hidden rounded-lg bg-muted">
                  <img src={wig.imageUrl || "/placeholder.svg"} alt={wig.name} className="w-full h-full object-cover" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-2">{wig.name}</CardTitle>
                <Badge variant="secondary" className="mb-2">
                  {wig.category}
                </Badge>
                <p className="text-sm text-muted-foreground">Added: {wig.createdAt?.toDate().toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
