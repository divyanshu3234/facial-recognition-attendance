"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface AddClassFormProps {
  onSuccess: () => void
}

export default function AddClassForm({ onSuccess }: AddClassFormProps) {
  const [formData, setFormData] = useState({
    class_code: "",
    class_name: "",
    instructor_name: "",
    department: "",
    semester: "",
    academic_year: "",
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from("classes").insert([
        {
          class_code: formData.class_code,
          class_name: formData.class_name,
          instructor_name: formData.instructor_name,
          department: formData.department,
          semester: formData.semester,
          academic_year: formData.academic_year || new Date().getFullYear().toString(),
        },
      ])

      if (error) throw error

      toast({
        title: "Success",
        description: "Class added successfully!",
      })

      setFormData({
        class_code: "",
        class_name: "",
        instructor_name: "",
        department: "",
        semester: "",
        academic_year: "",
      })

      onSuccess()
    } catch (error) {
      console.error("Error adding class:", error)
      toast({
        title: "Error",
        description: "Failed to add class. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="class_code">Class Code *</Label>
          <Input
            id="class_code"
            value={formData.class_code}
            onChange={(e) => handleInputChange("class_code", e.target.value)}
            placeholder="e.g., CS101"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="class_name">Class Name *</Label>
          <Input
            id="class_name"
            value={formData.class_name}
            onChange={(e) => handleInputChange("class_name", e.target.value)}
            placeholder="e.g., Introduction to Computer Science"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructor_name">Instructor Name *</Label>
          <Input
            id="instructor_name"
            value={formData.instructor_name}
            onChange={(e) => handleInputChange("instructor_name", e.target.value)}
            placeholder="e.g., Dr. John Smith"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department *</Label>
          <Select value={formData.department} onValueChange={(value) => handleInputChange("department", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Computer Science">Computer Science</SelectItem>
              <SelectItem value="Mathematics">Mathematics</SelectItem>
              <SelectItem value="HSS">Engineering</SelectItem>
              <SelectItem value="Psychology">Psychology</SelectItem>
              <SelectItem value="English">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="semester">Semester *</Label>
          <Select value={formData.semester} onValueChange={(value) => handleInputChange("semester", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ODDSEM">Fall</SelectItem>
              <SelectItem value="EVENSEM">Spring</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="academic_year">Academic Year</Label>
          <Input
            id="academic_year"
            value={formData.academic_year}
            onChange={(e) => handleInputChange("academic_year", e.target.value)}
            placeholder={new Date().getFullYear().toString()}
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Adding Class..." : "Add Class"}
      </Button>
    </form>
  )
}
