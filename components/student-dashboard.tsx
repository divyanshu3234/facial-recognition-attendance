"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, UserPlus, Search, Camera, GraduationCap, BookOpen, Plus, Brain } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { Student, Class } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import AddStudentForm from "@/components/add-student-form"
import AddClassForm from "@/components/add-class-form"
import StudentList from "@/components/student-list"
import AttendanceInterface from "@/components/attendance-interface"
import AttendanceTracking from "@/components/attendance-tracking"
import AnalyticsDashboard from "@/components/analytics-dashboard"
import FaceTrainingSystem from "@/components/face-training-system"

export default function StudentDashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isModelTrained, setIsModelTrained] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
    checkTrainingStatus()
  }, [])

  const checkTrainingStatus = () => {
    const trained = localStorage.getItem("faceRecognitionTrained") === "true"
    setIsModelTrained(trained)
  }

  const fetchData = async () => {
    try {
      setLoading(true)

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false })

      if (studentsError) throw studentsError

      const { data: classesData, error: classesError } = await supabase.from("classes").select("*").order("class_name")

      if (classesError) throw classesError

      setStudents(studentsData || [])
      setClasses(classesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTrainingComplete = () => {
    setIsModelTrained(true)
    toast({
      title: "Training Complete",
      description: "Facial recognition model is now ready for attendance",
    })
  }

  const filteredStudents = students.filter(
    (student) =>
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const stats = {
    totalStudents: students.length,
    totalClasses: classes.length,
    activeStudents: students.filter((s) => s.photo_url).length,
    departments: [...new Set(students.map((s) => s.department).filter(Boolean))].length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Student Management System</h1>
            <p className="text-muted-foreground">Manage students and track attendance with facial recognition</p>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>Enter student details and upload a photo for facial recognition</DialogDescription>
                </DialogHeader>
                <AddStudentForm onSuccess={fetchData} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">Registered in system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClasses}</div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Face Recognition Ready</CardTitle>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeStudents}</div>
              <p className="text-xs text-muted-foreground">Students with photos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.departments}</div>
              <p className="text-xs text-muted-foreground">Active departments</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="training">AI Training</TabsTrigger>
            <TabsTrigger value="attendance">Take Attendance</TabsTrigger>
            <TabsTrigger value="tracking">Attendance Records</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <StudentList students={filteredStudents} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Brain className="h-6 w-6" />
                  AI Model Training
                </h2>
                <p className="text-muted-foreground">Train the facial recognition model on student photos</p>
              </div>
            </div>
            <FaceTrainingSystem students={students} onTrainingComplete={handleTrainingComplete} />
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <AttendanceInterface classes={classes} students={students} />
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <AttendanceTracking classes={classes} students={students} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <AnalyticsDashboard classes={classes} students={students} />
          </TabsContent>

          <TabsContent value="classes" className="space-y-4">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Classes Overview</h2>
                <p className="text-muted-foreground">Manage class schedules and enrollments</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Class
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Class</DialogTitle>
                    <DialogDescription>Create a new class for the attendance system</DialogDescription>
                  </DialogHeader>
                  <AddClassForm onSuccess={fetchData} />
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Classes</CardTitle>
                <CardDescription>View and manage all classes in the system</CardDescription>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No classes found. Add your first class to get started.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class Code</TableHead>
                        <TableHead>Class Name</TableHead>
                        <TableHead>Instructor</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead>Room</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classes.map((classItem) => (
                        <TableRow key={classItem.id}>
                          <TableCell className="font-medium">{classItem.class_code}</TableCell>
                          <TableCell>{classItem.class_name}</TableCell>
                          <TableCell>{classItem.instructor_name}</TableCell>
                          <TableCell>{classItem.department}</TableCell>
                          <TableCell>
                            {classItem.semester} {classItem.academic_year}
                          </TableCell>
                          <TableCell>{classItem.schedule || "Not specified"}</TableCell>
                          <TableCell>{classItem.room_number || "TBA"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
