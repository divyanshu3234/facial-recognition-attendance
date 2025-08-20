"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Calendar,
  Search,
  Download,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  FileText,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { Student, Class, AttendanceSession, Attendance } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface AttendanceTrackingProps {
  classes: Class[]
  students: Student[]
}

interface AttendanceRecord extends Attendance {
  students: Student
  attendance_sessions: AttendanceSession & { classes: Class }
}

export default function AttendanceTracking({ classes, students }: AttendanceTrackingProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [sessions, setSessions] = useState<(AttendanceSession & { classes: Class })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [dateRange, setDateRange] = useState<string>("week")
  const { toast } = useToast()

  useEffect(() => {
    fetchAttendanceData()
  }, [selectedClass, dateRange])

  const fetchAttendanceData = async () => {
    try {
      setLoading(true)

      // Calculate date filter
      const now = new Date()
      let startDate = new Date()
      switch (dateRange) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case "all":
          startDate = new Date(2020, 0, 1) // Far back date
          break
      }

      // Build query
      let query = supabase
        .from("attendance")
        .select(
          `
          *,
          students (*),
          attendance_sessions (
            *,
            classes (*)
          )
        `,
        )
        .gte("marked_at", startDate.toISOString())
        .order("marked_at", { ascending: false })

      // Add class filter
      if (selectedClass !== "all") {
        query = query.eq("attendance_sessions.class_id", selectedClass)
      }

      const { data: attendanceData, error: attendanceError } = await query

      if (attendanceError) throw attendanceError

      // Fetch sessions
      let sessionsQuery = supabase
        .from("attendance_sessions")
        .select("*, classes (*)")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })

      if (selectedClass !== "all") {
        sessionsQuery = sessionsQuery.eq("class_id", selectedClass)
      }

      const { data: sessionsData, error: sessionsError } = await sessionsQuery

      if (sessionsError) throw sessionsError

      setAttendanceRecords(attendanceData || [])
      setSessions(sessionsData || [])
    } catch (error) {
      console.error("Error fetching attendance data:", error)
      toast({
        title: "Error",
        description: "Failed to load attendance data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateAttendanceStatus = async (attendanceId: string, newStatus: "present" | "absent" | "late") => {
    try {
      const { error } = await supabase
        .from("attendance")
        .update({
          status: newStatus,
          manual_override: true,
        })
        .eq("id", attendanceId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Attendance status updated",
      })

      fetchAttendanceData()
    } catch (error) {
      console.error("Error updating attendance:", error)
      toast({
        title: "Error",
        description: "Failed to update attendance",
        variant: "destructive",
      })
    }
  }

  const exportAttendanceData = () => {
    // Create CSV content
    const headers = ["Date", "Time", "Class", "Student ID", "Student Name", "Status", "Confidence", "Manual Override"]
    const csvContent = [
      headers.join(","),
      ...filteredRecords.map((record) =>
        [
          new Date(record.marked_at).toLocaleDateString(),
          new Date(record.marked_at).toLocaleTimeString(),
          record.attendance_sessions.classes.class_code,
          record.students.student_id,
          `"${record.students.first_name} ${record.students.last_name}"`,
          record.status,
          record.recognition_confidence || "N/A",
          record.manual_override ? "Yes" : "No",
        ].join(","),
      ),
    ].join("\n")

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `attendance-report-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Export Complete",
      description: "Attendance data exported successfully",
    })
  }

  // Filter records
  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesSearch =
      record.students.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.students.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.students.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.attendance_sessions.classes.class_code.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = selectedStatus === "all" || record.status === selectedStatus

    return matchesSearch && matchesStatus
  })

  // Calculate statistics
  const stats = {
    totalRecords: filteredRecords.length,
    presentCount: filteredRecords.filter((r) => r.status === "present").length,
    absentCount: filteredRecords.filter((r) => r.status === "absent").length,
    lateCount: filteredRecords.filter((r) => r.status === "late").length,
    averageAttendance:
      filteredRecords.length > 0
        ? ((filteredRecords.filter((r) => r.status === "present").length / filteredRecords.length) * 100).toFixed(1)
        : "0",
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "absent":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "late":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      present: "default",
      absent: "destructive",
      late: "secondary",
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading attendance records...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance Records</h2>
          <p className="text-muted-foreground">View and manage attendance history</p>
        </div>
        <Button onClick={exportAttendanceData} className="bg-accent hover:bg-accent/90">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
            <p className="text-xs text-muted-foreground">Attendance entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.presentCount}</div>
            <p className="text-xs text-muted-foreground">Students present</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lateCount}</div>
            <p className="text-xs text-muted-foreground">Late arrivals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageAttendance}%</div>
            <p className="text-xs text-muted-foreground">Overall rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students or classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    {classItem.class_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records">Attendance Records</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records ({filteredRecords.length})</CardTitle>
              <CardDescription>Individual attendance entries with recognition details</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <p>No attendance records found</p>
                  <p className="text-sm">Try adjusting your filters or date range</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Manual</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={record.students.photo_url || "/placeholder.svg"}
                                alt={`${record.students.first_name} ${record.students.last_name}`}
                              />
                              <AvatarFallback className="text-xs">
                                {getInitials(record.students.first_name, record.students.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {record.students.first_name} {record.students.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">{record.students.student_id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{record.attendance_sessions.classes.class_code}</p>
                            <p className="text-xs text-muted-foreground">
                              {record.attendance_sessions.classes.class_name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{new Date(record.marked_at).toLocaleDateString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(record.marked_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          {record.recognition_confidence ? (
                            <Badge variant="outline">{(record.recognition_confidence * 100).toFixed(1)}%</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.manual_override ? (
                            <Badge variant="secondary">Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => updateAttendanceStatus(record.id, "present")}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                Mark Present
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateAttendanceStatus(record.id, "late")}>
                                <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                                Mark Late
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateAttendanceStatus(record.id, "absent")}>
                                <XCircle className="h-4 w-4 mr-2 text-red-500" />
                                Mark Absent
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Sessions ({sessions.length})</CardTitle>
              <CardDescription>Class sessions where attendance was taken</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <p>No sessions found</p>
                  <p className="text-sm">Sessions will appear here after taking attendance</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Instructor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{session.classes.class_code}</p>
                            <p className="text-sm text-muted-foreground">{session.classes.class_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{new Date(session.session_date).toLocaleDateString()}</p>
                            <p className="text-xs text-muted-foreground">{session.session_time}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{session.session_type}</Badge>
                        </TableCell>
                        <TableCell>{session.location || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={session.status === "active" ? "default" : "secondary"}>
                            {session.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{session.created_by}</TableCell>
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
  )
}
