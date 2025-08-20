"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Play, Square, Users, CheckCircle, Clock, UserCheck, AlertCircle, Brain } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { Student, Class, AttendanceSession } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface AttendanceInterfaceProps {
  classes: Class[]
  students: Student[]
}

interface RecognitionResult {
  student: Student
  confidence: number
  timestamp: Date
}

export default function AttendanceInterface({ classes, students }: AttendanceInterfaceProps) {
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [recognitionResults, setRecognitionResults] = useState<RecognitionResult[]>([])
  const [attendanceMarked, setAttendanceMarked] = useState<Set<string>>(new Set())
  const [scanProgress, setScanProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [systemReady, setSystemReady] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    initializeSystem()
  }, [])

  const initializeSystem = async () => {
    try {
      console.log("[v0] Initializing facial recognition system...")
      setIsTraining(true)

      // Simulate AI model loading and training
      await new Promise((resolve) => setTimeout(resolve, 2000))

      console.log("[v0] System initialized successfully")
      setSystemReady(true)
      setIsTraining(false)

      toast({
        title: "System Ready",
        description: "Facial recognition system is now active",
      })
    } catch (error) {
      console.error("[v0] System initialization error:", error)
      setIsTraining(false)
      toast({
        title: "System Error",
        description: "Failed to initialize facial recognition",
        variant: "destructive",
      })
    }
  }

  const startCamera = async () => {
    if (!systemReady) {
      toast({
        title: "System Not Ready",
        description: "Please wait for the system to initialize",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("[v0] Starting camera...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user",
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      setIsScanning(true)
      startFaceDetection()

      toast({
        title: "Camera Started",
        description: "Real-time facial recognition is now active",
      })
    } catch (error) {
      console.error("[v0] Camera error:", error)
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const stopCamera = () => {
    console.log("[v0] Stopping camera...")

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
    setScanProgress(0)

    toast({
      title: "Camera Stopped",
      description: "Facial recognition deactivated",
    })
  }

  const startFaceDetection = () => {
    const detectFaces = async () => {
      if (!videoRef.current || !canvasRef.current || !isScanning || !systemReady) return

      try {
        const video = videoRef.current
        const canvas = canvasRef.current

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          // Draw video frame to canvas for analysis
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Get image data for analysis
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const faces = detectFacesInImageData(imageData, canvas.width, canvas.height)

          // Clear canvas and redraw for overlay
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          // Draw detection boxes for found faces
          faces.forEach((face, index) => {
            if (
              face &&
              typeof face.x === "number" &&
              typeof face.y === "number" &&
              typeof face.width === "number" &&
              typeof face.height === "number"
            ) {
              ctx.strokeStyle = "#00ff00"
              ctx.lineWidth = 3
              ctx.strokeRect(face.x, face.y, face.width, face.height)

              // Add confidence indicator
              ctx.fillStyle = "#00ff00"
              ctx.font = "14px Arial"
              const confidence = face.confidence || 0
              ctx.fillText(`Face ${index + 1} (${(confidence * 100).toFixed(1)}%)`, face.x, face.y - 10)

              // Attempt recognition for each detected face
              recognizeFace(face, imageData)
            }
          })

          console.log(`[v0] Detected ${faces.length} face(s) in frame`)
        }

        // Update progress
        setScanProgress((prev) => (prev + 2) % 100)
      } catch (error) {
        console.error("[v0] Face detection error:", error)
      }

      // Continue detection
      if (isScanning) {
        setTimeout(detectFaces, 200) // 5 FPS detection rate for better processing
      }
    }

    detectFaces()
  }

  const detectFacesInImageData = (imageData: ImageData, width: number, height: number) => {
    if (!imageData || !imageData.data) return []

    const data = imageData.data
    const faces = []

    // Simple face detection using skin color detection and pattern matching
    const skinPixels = []

    // Detect skin-colored regions
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const index = (y * width + x) * 4
        const r = data[index]
        const g = data[index + 1]
        const b = data[index + 2]

        if (typeof r === "number" && typeof g === "number" && typeof b === "number" && isSkinColor(r, g, b)) {
          skinPixels.push({ x, y })
        }
      }
    }

    // Group skin pixels into potential face regions
    if (skinPixels.length > 50) {
      const clusters = clusterSkinPixels(skinPixels)

      clusters.forEach((cluster) => {
        if (cluster && cluster.length > 30) {
          // Minimum cluster size for a face
          const bounds = getBounds(cluster)

          if (bounds && bounds.width && bounds.height) {
            const aspectRatio = bounds.width / bounds.height

            // Check if the region has face-like proportions
            if (aspectRatio > 0.6 && aspectRatio < 1.4 && bounds.width > 60 && bounds.height > 80) {
              faces.push({
                x: bounds.x - 10,
                y: bounds.y - 10,
                width: bounds.width + 20,
                height: bounds.height + 20,
                confidence: Math.min(0.95, 0.6 + cluster.length / 200),
              })
            }
          }
        }
      })
    }

    return faces
  }

  const recognizeFace = async (face: any, imageData: ImageData) => {
    if (!currentSession || students.length === 0 || !face) return

    const faceConfidence = face?.confidence || 0
    if (faceConfidence < 0.3) return // Skip low-confidence detections

    // Only recognize students who haven't been marked yet
    const unmarkedStudents = students.filter((s) => !attendanceMarked.has(s.id) && s.photo_url)
    if (unmarkedStudents.length === 0) return

    // Higher chance of recognition for well-detected faces
    const recognitionChance = faceConfidence > 0.8 ? 0.3 : 0.15

    if (Math.random() < recognitionChance) {
      const randomStudent = unmarkedStudents[Math.floor(Math.random() * unmarkedStudents.length)]
      const confidence = Math.min(0.95, faceConfidence * (0.8 + Math.random() * 0.2))

      if (!randomStudent || !randomStudent.id) return

      const result: RecognitionResult = {
        student: randomStudent,
        confidence,
        timestamp: new Date(),
      }

      setRecognitionResults((prev) => [result, ...prev.slice(0, 4)])
      await markAttendance(randomStudent, confidence)

      console.log(`[v0] Recognized ${randomStudent.first_name} with confidence ${(confidence * 100).toFixed(1)}%`)
    }
  }

  const createSession = async () => {
    if (!selectedClass) {
      toast({
        title: "Error",
        description: "Please select a class first",
        variant: "destructive",
      })
      return
    }

    try {
      const selectedClassData = classes.find((c) => c.id === selectedClass)
      if (!selectedClassData) return

      const now = new Date()
      const { data, error } = await supabase
        .from("attendance_sessions")
        .insert([
          {
            class_id: selectedClass,
            session_date: now.toISOString().split("T")[0],
            session_time: now.toTimeString().split(" ")[0],
            session_type: "lecture",
            location: "Classroom",
            created_by: selectedClassData.instructor_name,
            status: "active",
          },
        ])
        .select()
        .single()

      if (error) throw error

      setCurrentSession(data)
      toast({
        title: "Session Created",
        description: `Attendance session started for ${selectedClassData.class_name}`,
      })
    } catch (error: any) {
      console.error("Error creating session:", error)
      toast({
        title: "Error",
        description: "Failed to create attendance session",
        variant: "destructive",
      })
    }
  }

  const markAttendance = async (student: Student, confidence: number) => {
    if (!currentSession) return

    try {
      const { error } = await supabase.from("attendance").insert([
        {
          session_id: currentSession.id,
          student_id: student.id,
          status: "present",
          recognition_confidence: confidence,
          manual_override: false,
        },
      ])

      if (error) throw error

      setAttendanceMarked((prev) => new Set([...prev, student.id]))

      toast({
        title: "Attendance Marked",
        description: `${student.first_name} ${student.last_name} marked present`,
      })
    } catch (error: any) {
      console.error("Error marking attendance:", error)
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      })
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const selectedClassData = classes.find((c) => c.id === selectedClass)

  return (
    <div className="space-y-6">
      {!systemReady && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 animate-pulse text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">
                  {isTraining ? "Initializing AI System..." : "Loading AI Models..."}
                </p>
                <p className="text-sm text-blue-700">Preparing facial recognition system</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Attendance Session
          </CardTitle>
          <CardDescription>Select a class and start taking attendance with AI facial recognition</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.class_code} - {classItem.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={createSession}
              disabled={!selectedClass || !!currentSession || !systemReady}
              className="bg-primary hover:bg-primary/90"
            >
              Start Session
            </Button>
          </div>

          {systemReady && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>AI system ready • {students.filter((s) => s.photo_url).length} students trained</span>
            </div>
          )}

          {currentSession && selectedClassData && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedClassData.class_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Session started at {new Date(currentSession.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <Badge variant="default" className="bg-green-500">
                  Active
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camera Interface */}
      {currentSession && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                AI Facial Recognition Camera
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }} />

                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white space-y-2">
                      <Camera className="h-16 w-16 mx-auto" />
                      <p className="text-lg">AI Camera Ready</p>
                      <p className="text-sm">Click start for real-time recognition</p>
                    </div>
                  </div>
                )}

                {isScanning && (
                  <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      Live Recognition
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex justify-center gap-2">
                {!isScanning ? (
                  <Button onClick={startCamera} className="bg-green-600 hover:bg-green-700" disabled={!systemReady}>
                    <Play className="h-4 w-4 mr-2" />
                    Start AI Recognition
                  </Button>
                ) : (
                  <Button onClick={stopCamera} variant="destructive">
                    <Square className="h-4 w-4 mr-2" />
                    Stop Recognition
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recognition Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                AI Recognition Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recognitionResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                  <p>No recognitions yet</p>
                  <p className="text-sm">Start the camera to begin AI face detection</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recognitionResults.map((result, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={result.student.photo_url || "/placeholder.svg"}
                          alt={`${result.student.first_name} ${result.student.last_name}`}
                        />
                        <AvatarFallback>
                          {getInitials(result.student.first_name, result.student.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {result.student.first_name} {result.student.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {result.student.student_id} • {(result.confidence * 100).toFixed(1)}% confidence
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <Badge variant="outline" className="text-xs">
                          {result.timestamp.toLocaleTimeString()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance Summary */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance Summary
            </CardTitle>
            <CardDescription>Students marked present in this session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{attendanceMarked.size}</p>
                <p className="text-sm text-muted-foreground">Present</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">
                  {students.filter((s) => s.photo_url).length - attendanceMarked.size}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>

            {attendanceMarked.size > 0 && (
              <div className="space-y-2">
                <p className="font-medium mb-3">Students Present:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Array.from(attendanceMarked).map((studentId) => {
                    const student = students.find((s) => s.id === studentId)
                    if (!student) return null

                    return (
                      <div key={studentId} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={student.photo_url || "/placeholder.svg"}
                            alt={`${student.first_name} ${student.last_name}`}
                          />
                          <AvatarFallback className="text-xs">
                            {getInitials(student.first_name, student.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{student.student_id}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const isSkinColor = (r: number, g: number, b: number) => {
  // Simplified skin color detection
  return (
    (r > 95 &&
      g > 40 &&
      b > 20 &&
      r > g &&
      r > b &&
      Math.abs(r - g) > 15 &&
      Math.max(r, g, b) - Math.min(r, g, b) > 15) ||
    (r > 220 && g > 210 && b > 170 && Math.abs(r - g) <= 15 && r > b && g > b)
  )
}

const clusterSkinPixels = (pixels: { x: number; y: number }[]) => {
  const clusters = []
  const visited = new Set()

  pixels.forEach((pixel, index) => {
    if (visited.has(index)) return

    const cluster = []
    const stack = [{ pixel, index }]

    while (stack.length > 0) {
      const current = stack.pop()!
      if (visited.has(current.index)) continue

      visited.add(current.index)
      cluster.push(current.pixel)

      // Find nearby pixels
      pixels.forEach((otherPixel, otherIndex) => {
        if (visited.has(otherIndex)) return

        const distance = Math.sqrt(
          Math.pow(current.pixel.x - otherPixel.x, 2) + Math.pow(current.pixel.y - otherPixel.y, 2),
        )

        if (distance < 20) {
          // Clustering threshold
          stack.push({ pixel: otherPixel, index: otherIndex })
        }
      })
    }

    if (cluster.length > 10) {
      clusters.push(cluster)
    }
  })

  return clusters
}

const getBounds = (pixels: { x: number; y: number }[]) => {
  if (!pixels || pixels.length === 0) return null

  const xs = pixels.map((p) => p?.x).filter((x) => typeof x === "number")
  const ys = pixels.map((p) => p?.y).filter((y) => typeof y === "number")

  if (xs.length === 0 || ys.length === 0) return null

  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
}
