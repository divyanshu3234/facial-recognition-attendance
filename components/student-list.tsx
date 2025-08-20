"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Eye, Camera } from "lucide-react"
import type { Student } from "@/lib/types"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import ViewStudentModalComponent from "./view-student-modal"
import EditStudentModalComponent from "./edit-student-modal"

interface StudentListProps {
  students: Student[]
  onRefresh: () => void
}

export default function StudentList({ students, onRefresh }: StudentListProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const { toast } = useToast()

  const handleDelete = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return

    setLoading(studentId)
    try {
      const { error } = await supabase.from("students").delete().eq("id", studentId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Student deleted successfully",
      })
      onRefresh()
    } catch (error: any) {
      console.error("Error deleting student:", error)
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-muted-foreground">No students found</p>
            <p className="text-sm text-muted-foreground">Add your first student to get started</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Students ({students.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={student.photo_url || "/placeholder.svg"}
                          alt={`${student.first_name} ${student.last_name}`}
                        />
                        <AvatarFallback>{getInitials(student.first_name, student.last_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {student.first_name} {student.last_name}
                        </p>
                        {student.phone && <p className="text-sm text-muted-foreground">{student.phone}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{student.student_id}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.department || "N/A"}</TableCell>
                  <TableCell>{student.year_of_study ? `Year ${student.year_of_study}` : "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={student.photo_url ? "default" : "secondary"} className="flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      {student.photo_url ? "Ready" : "No Photo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingStudent(student)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingStudent(student)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Student
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(student.id)}
                          disabled={loading === student.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {loading === student.id ? "Deleting..." : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {viewingStudent && <ViewStudentModalComponent student={viewingStudent} onClose={() => setViewingStudent(null)} />}

      {editingStudent && (
        <EditStudentModalComponent
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSave={() => {
            setEditingStudent(null)
            onRefresh()
          }}
        />
      )}
    </>
  )
}
