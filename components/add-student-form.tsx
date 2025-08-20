"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface AddStudentFormProps {
  onSuccess: () => void
}

export default function AddStudentForm({ onSuccess }: AddStudentFormProps) {
  const [formData, setFormData] = useState({
    student_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    department: "",
    year_of_study: "",
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.student_id || !formData.first_name || !formData.last_name || !formData.email) {
        throw new Error("Please fill in all required fields")
      }

      // For demo purposes, we'll use a placeholder photo URL if no photo is uploaded
      let photoUrl = "/placeholder.svg?height=200&width=200"

      if (photoFile) {
        // In a real app, you'd upload the photo to Supabase Storage
        // For now, we'll use a placeholder
        photoUrl = "/diverse-students-studying.png"
      }

      // Insert student data
      const { data, error } = await supabase
        .from("students")
        .insert([
          {
            ...formData,
            year_of_study: formData.year_of_study ? Number.parseInt(formData.year_of_study) : null,
            photo_url: photoUrl,
          },
        ])
        .select()

      if (error) throw error

      toast({
        title: "Success",
        description: "Student added successfully!",
      })

      // Reset form
      setFormData({
        student_id: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        department: "",
        year_of_study: "",
      })
      setPhotoFile(null)
      setPhotoPreview(null)

      onSuccess()
    } catch (error: any) {
      console.error("Error adding student:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add student. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="student_id">Student ID *</Label>
          <Input
            id="student_id"
            value={formData.student_id}
            onChange={(e) => handleInputChange("student_id", e.target.value)}
            placeholder="STU001"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            placeholder="student@university.edu"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleInputChange("first_name", e.target.value)}
            placeholder="John"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleInputChange("last_name", e.target.value)}
            placeholder="Doe"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            placeholder="+1-555-0123"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Select value={formData.department} onValueChange={(value) => handleInputChange("department", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Computer Science">Computer Science</SelectItem>
              <SelectItem value="Mathematics">Mathematics</SelectItem>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Physics">Physics</SelectItem>
              <SelectItem value="Chemistry">Chemistry</SelectItem>
              <SelectItem value="Biology">Biology</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="year_of_study">Year of Study</Label>
          <Select value={formData.year_of_study} onValueChange={(value) => handleInputChange("year_of_study", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1st Year</SelectItem>
              <SelectItem value="2">2nd Year</SelectItem>
              <SelectItem value="3">3rd Year</SelectItem>
              <SelectItem value="4">4th Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Photo Upload */}
      <div className="space-y-2">
        <Label>Student Photo</Label>
        <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-6">
            {photoPreview ? (
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img
                    src={photoPreview || "/placeholder.svg"}
                    alt="Student preview"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={removePhoto}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div>
                  <p className="text-sm font-medium">Photo uploaded</p>
                  <p className="text-xs text-muted-foreground">Click the X to remove</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Upload student photo</p>
                  <p className="text-xs text-muted-foreground">Required for facial recognition attendance</p>
                  <Input type="file" accept="image/*" onChange={handlePhotoChange} className="max-w-xs mx-auto" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
          {loading ? "Adding..." : "Add Student"}
        </Button>
      </div>
    </form>
  )
}
