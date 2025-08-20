"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, TrendingDown, Target, Award, Clock, CheckCircle, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { Student, Class, Attendance, AttendanceSession } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface AnalyticsDashboardProps {
  classes: Class[]
  students: Student[]
}

interface AttendanceRecord extends Attendance {
  students: Student
  attendance_sessions: AttendanceSession & { classes: Class }
}

interface ChartData {
  name: string
  value: number
  present?: number
  absent?: number
  late?: number
  total?: number
  percentage?: number
}

export default function AnalyticsDashboard({ classes, students }: AnalyticsDashboardProps) {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("month")
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const { toast } = useToast()

  useEffect(() => {
    fetchAnalyticsData()
  }, [selectedPeriod, selectedClass])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)

      // Calculate date range
      const now = new Date()
      let startDate = new Date()
      switch (selectedPeriod) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case "semester":
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
          break
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1)
          break
      }

      // Fetch attendance data
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

      if (selectedClass !== "all") {
        query = query.eq("attendance_sessions.class_id", selectedClass)
      }

      const { data, error } = await query

      if (error) throw error

      setAttendanceData(data || [])
    } catch (error) {
      console.error("Error fetching analytics data:", error)
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Calculate analytics metrics
  const calculateMetrics = () => {
    const totalRecords = attendanceData.length
    const presentCount = attendanceData.filter((r) => r.status === "present").length
    const absentCount = attendanceData.filter((r) => r.status === "absent").length
    const lateCount = attendanceData.filter((r) => r.status === "late").length

    const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0
    const punctualityRate = totalRecords > 0 ? ((presentCount - lateCount) / totalRecords) * 100 : 0

    // Recognition accuracy
    const recognitionRecords = attendanceData.filter((r) => r.recognition_confidence)
    const avgConfidence =
      recognitionRecords.length > 0
        ? recognitionRecords.reduce((sum, r) => sum + (r.recognition_confidence || 0), 0) / recognitionRecords.length
        : 0

    return {
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      attendanceRate,
      punctualityRate,
      avgConfidence: avgConfidence * 100,
      manualOverrides: attendanceData.filter((r) => r.manual_override).length,
    }
  }

  // Generate attendance trend data
  const generateTrendData = (): ChartData[] => {
    const dailyData = new Map<string, { present: number; absent: number; late: number; total: number }>()

    attendanceData.forEach((record) => {
      const date = new Date(record.marked_at).toLocaleDateString()
      const existing = dailyData.get(date) || { present: 0, absent: 0, late: 0, total: 0 }

      existing[record.status as keyof typeof existing]++
      existing.total++
      dailyData.set(date, existing)
    })

    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        name: date,
        present: data.present,
        absent: data.absent,
        late: data.late,
        total: data.total,
        percentage: (data.present / data.total) * 100,
      }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())
      .slice(-14) // Last 14 days
  }

  // Generate class-wise data
  const generateClassData = (): ChartData[] => {
    const classData = new Map<string, { present: number; total: number }>()

    attendanceData.forEach((record) => {
      const className = record.attendance_sessions.classes.class_code
      const existing = classData.get(className) || { present: 0, total: 0 }

      if (record.status === "present") existing.present++
      existing.total++
      classData.set(className, existing)
    })

    return Array.from(classData.entries()).map(([className, data]) => ({
      name: className,
      value: data.total,
      percentage: data.total > 0 ? (data.present / data.total) * 100 : 0,
    }))
  }

  // Generate department data
  const generateDepartmentData = (): ChartData[] => {
    const deptData = new Map<string, { present: number; total: number }>()

    attendanceData.forEach((record) => {
      const dept = record.students.department || "Unknown"
      const existing = deptData.get(dept) || { present: 0, total: 0 }

      if (record.status === "present") existing.present++
      existing.total++
      deptData.set(dept, existing)
    })

    return Array.from(deptData.entries()).map(([dept, data]) => ({
      name: dept,
      value: data.total,
      percentage: data.total > 0 ? (data.present / data.total) * 100 : 0,
    }))
  }

  // Generate status distribution data
  const generateStatusData = (): ChartData[] => {
    const metrics = calculateMetrics()
    return [
      { name: "Present", value: metrics.presentCount },
      { name: "Absent", value: metrics.absentCount },
      { name: "Late", value: metrics.lateCount },
    ]
  }

  const metrics = calculateMetrics()
  const trendData = generateTrendData()
  const classData = generateClassData()
  const departmentData = generateDepartmentData()
  const statusData = generateStatusData()

  const chartConfig = {
    present: {
      label: "Present",
      color: "hsl(var(--chart-1))",
    },
    absent: {
      label: "Absent",
      color: "hsl(var(--chart-2))",
    },
    late: {
      label: "Late",
      color: "hsl(var(--chart-3))",
    },
  }

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive attendance insights and trends</p>
        </div>
        <div className="flex items-center space-x-2">
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
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="semester">Semester</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.attendanceRate.toFixed(1)}%</div>
            <Progress value={metrics.attendanceRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.presentCount} of {metrics.totalRecords} present
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Punctuality Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.punctualityRate.toFixed(1)}%</div>
            <Progress value={metrics.punctualityRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">{metrics.lateCount} late arrivals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recognition Accuracy</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgConfidence.toFixed(1)}%</div>
            <Progress value={metrics.avgConfidence} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">Average confidence score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Overrides</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.manualOverrides}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {((metrics.manualOverrides / metrics.totalRecords) * 100).toFixed(1)}% of records
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
            <CardDescription>Daily attendance rates over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-1))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Status Distribution</CardTitle>
            <CardDescription>Breakdown of attendance statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Class Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Class Performance</CardTitle>
            <CardDescription>Attendance rates by class</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="percentage" fill="hsl(var(--chart-1))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Department Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Department Analysis</CardTitle>
            <CardDescription>Attendance by department</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="percentage" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Insights */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Top Performing Classes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {classData
              .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
              .slice(0, 3)
              .map((classItem, index) => (
                <div key={classItem.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-medium">{classItem.name}</span>
                  </div>
                  <Badge variant="default">{(classItem.percentage || 0).toFixed(1)}%</Badge>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {classData
              .sort((a, b) => (a.percentage || 0) - (b.percentage || 0))
              .slice(0, 3)
              .map((classItem, index) => (
                <div key={classItem.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{index + 1}</Badge>
                    <span className="font-medium">{classItem.name}</span>
                  </div>
                  <Badge variant="secondary">{(classItem.percentage || 0).toFixed(1)}%</Badge>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Recognition Accuracy</span>
              <Badge variant={metrics.avgConfidence > 90 ? "default" : "secondary"}>
                {metrics.avgConfidence > 90 ? "Excellent" : "Good"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Manual Overrides</span>
              <Badge variant={metrics.manualOverrides < 10 ? "default" : "destructive"}>
                {metrics.manualOverrides < 10 ? "Low" : "High"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Data Quality</span>
              <Badge variant="default">High</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
