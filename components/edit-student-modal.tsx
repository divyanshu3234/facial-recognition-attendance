"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Student } from "@/lib/types"

interface EditStudentModalProps {
  student: Student
  onClose: () => void
  onSave: () => void
}

export default function EditStudentModalComponent({ student, onClose, onSave }: EditStudentModalProps) {
  const [formData, setFormData] = useState({
    first_name: student.first_name,
    last_name: student.last_name,
    student_id: student.student_id,
    email: student.email,
    phone: student.phone || "",
    department: student.department || "",
    year_of_study: student.year_of_study || 1,
    photo_url: student.photo_url || "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const { toast } = useToast()

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setFormData((prev) => ({ ...prev, photo_url: previewUrl }))
    }
  }

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${student.id}-${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage.from("student-photos").upload(fileName, file)

      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from("student-photos").getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error("Error uploading photo:", error)
      return null
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      let photoUrl = formData.photo_url

      // Upload new photo if selected
      if (photoFile) {
        const uploadedUrl = await uploadPhoto(photoFile)
        if (uploadedUrl) {
          photoUrl = uploadedUrl
        }
      }

      const { error } = await supabase
        .from("students")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          student_id: formData.student_id,
          email: formData.email,
          phone: formData.phone || null,
          department: formData.department || null,
          year_of_study: formData.year_of_study,
          photo_url: photoUrl || null,
        })
        .eq("id", student.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Student updated successfully",
      })
      onSave()
    } catch (error: any) {
      console.error("Error updating student:", error)
      toast({
        title: "Error",
        description: "Failed to update student",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photo Upload */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={formData.photo_url || "/placeholder.svg"}
                alt={`${formData.first_name} ${formData.last_name}`}
              />
              <AvatarFallback className="text-lg">
                {getInitials(formData.first_name, formData.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <div className="flex items-center space-x-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">Upload Photo</span>
                </div>
              </Label>
              <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange("first_name", e.target.value)}
                placeholder="Enter first name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                placeholder="Enter last name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="student_id">Student ID</Label>
              <Input
                id="student_id"
                value={formData.student_id}
                onChange={(e) => handleInputChange("student_id", e.target.value)}
                placeholder="Enter student ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department (Optional)</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange("department", e.target.value)}
                placeholder="Enter department"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="year_of_study">Year of Study</Label>
              <Select
                value={formData.year_of_study.toString()}
                onValueChange={(value) => handleInputChange("year_of_study", Number.parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year of study" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Year 1</SelectItem>
                  <SelectItem value="2">Year 2</SelectItem>
                  <SelectItem value="3">Year 3</SelectItem>
                  <SelectItem value="4">Year 4</SelectItem>
                  <SelectItem value="5">Year 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
