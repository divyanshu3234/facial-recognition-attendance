"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { User, Mail, Phone, GraduationCap, Calendar, Camera } from "lucide-react"
import type { Student } from "@/lib/types"

interface ViewStudentModalProps {
  student: Student
  onClose: () => void
}

export default function ViewStudentModalComponent({ student, onClose }: ViewStudentModalProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Student Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Header */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={student.photo_url || "/placeholder.svg"}
                alt={`${student.first_name} ${student.last_name}`}
              />
              <AvatarFallback className="text-lg">{getInitials(student.first_name, student.last_name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold">
                {student.first_name} {student.last_name}
              </h3>
              <p className="text-muted-foreground font-mono">{student.student_id}</p>
              <Badge variant={student.photo_url ? "default" : "secondary"} className="flex items-center gap-1 w-fit">
                <Camera className="h-3 w-3" />
                {student.photo_url ? "Photo Available" : "No Photo"}
              </Badge>
            </div>
          </div>

          {/* Student Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {student.phone && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{student.phone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {student.department && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Department</p>
                      <p className="text-sm text-muted-foreground">{student.department}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {student.year_of_study && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Year of Study</p>
                      <p className="text-sm text-muted-foreground">Year {student.year_of_study}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Additional Information */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Registration Date</p>
                  <p className="text-sm text-muted-foreground">{new Date(student.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
