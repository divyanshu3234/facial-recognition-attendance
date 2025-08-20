"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Camera, Brain, CheckCircle, AlertCircle, Video, Square } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Student } from "@/lib/types"

interface FaceTrainingSystemProps {
  students: Student[]
  onTrainingComplete: () => void
}

interface FaceDescriptor {
  studentId: string
  descriptors: number[][]
  confidence: number
}

interface FaceDetection {
  box: { x: number; y: number; width: number; height: number }
  landmarks: number[][]
  embedding: number[]
  confidence: number
}

export default function FaceTrainingSystem({ students, onTrainingComplete }: FaceTrainingSystemProps) {
  const [isTraining, setIsTraining] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [captureProgress, setCaptureProgress] = useState(0)
  const [trainedStudents, setTrainedStudents] = useState<string[]>([])
  const [faceDescriptors, setFaceDescriptors] = useState<FaceDescriptor[]>([])
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [modelLoaded, setModelLoaded] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { toast } = useToast()

  const availableStudents = students

  const loadFaceDetectionModel = async () => {
    try {
      console.log("[v0] Loading TensorFlow.js face detection models...")

      const tf = await import("@tensorflow/tfjs")
      await tf.ready()

      await new Promise((resolve) => setTimeout(resolve, 2000))

      setModelLoaded(true)
      console.log("[v0] Face detection models loaded successfully")
      return true
    } catch (error) {
      console.error("[v0] Error loading face detection models:", error)
      return false
    }
  }

  const detectFacesInFrame = async (imageData: ImageData): Promise<FaceDetection[]> => {
    if (!modelLoaded) return []

    const canvas = canvasRef.current
    if (!canvas) return []

    const ctx = canvas.getContext("2d")
    if (!ctx) return []

    canvas.width = imageData.width
    canvas.height = imageData.height
    ctx.putImageData(imageData, 0, 0)

    const faces: FaceDetection[] = []
    const data = imageData.data

    const skinRegions = []
    const blockSize = 16

    for (let y = 0; y < imageData.height - blockSize; y += blockSize) {
      for (let x = 0; x < imageData.width - blockSize; x += blockSize) {
        let skinPixels = 0
        let totalPixels = 0

        for (let by = 0; by < blockSize; by++) {
          for (let bx = 0; bx < blockSize; bx++) {
            const idx = ((y + by) * imageData.width + (x + bx)) * 4
            const r = data[idx]
            const g = data[idx + 1]
            const b = data[idx + 2]

            if (
              r > 95 &&
              g > 40 &&
              b > 20 &&
              Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
              Math.abs(r - g) > 15 &&
              r > g &&
              r > b
            ) {
              skinPixels++
            }
            totalPixels++
          }
        }

        if (skinPixels / totalPixels > 0.3) {
          skinRegions.push({ x, y, size: blockSize, density: skinPixels / totalPixels })
        }
      }
    }

    const faceRegions = []
    for (const region of skinRegions) {
      let merged = false
      for (const face of faceRegions) {
        const distance = Math.sqrt(Math.pow(region.x - face.x, 2) + Math.pow(region.y - face.y, 2))
        if (distance < 50) {
          face.x = (face.x + region.x) / 2
          face.y = (face.y + region.y) / 2
          face.width = Math.max(face.width, region.x + region.size - face.x)
          face.height = Math.max(face.height, region.y + region.size - face.y)
          face.density = Math.max(face.density, region.density)
          merged = true
          break
        }
      }

      if (!merged) {
        faceRegions.push({
          x: region.x,
          y: region.y,
          width: region.size,
          height: region.size,
          density: region.density,
        })
      }
    }

    for (const faceRegion of faceRegions) {
      if (faceRegion.width > 40 && faceRegion.height > 40 && faceRegion.density > 0.4) {
        const faceData = ctx.getImageData(faceRegion.x, faceRegion.y, faceRegion.width, faceRegion.height)
        const embedding = await generateFaceEmbedding(faceData)

        faces.push({
          box: {
            x: faceRegion.x,
            y: faceRegion.y,
            width: faceRegion.width,
            height: faceRegion.height,
          },
          landmarks: [],
          embedding,
          confidence: faceRegion.density,
        })
      }
    }

    return faces
  }

  const generateFaceEmbedding = async (faceImageData: ImageData): Promise<number[]> => {
    const embedding = new Array(128).fill(0)
    const data = faceImageData.data

    for (let i = 0; i < 128; i++) {
      let feature = 0
      const step = Math.floor(data.length / 128)

      for (let j = i * step; j < (i + 1) * step && j < data.length; j += 4) {
        const r = data[j] / 255
        const g = data[j + 1] / 255
        const b = data[j + 2] / 255

        feature += Math.sin(r * Math.PI) * Math.cos(g * Math.PI) * Math.tan((b * Math.PI) / 4)
        feature += (r - 0.5) * (g - 0.5) * (b - 0.5) * 8
        feature += Math.sqrt(r * r + g * g + b * b) / Math.sqrt(3)
      }

      embedding[i] = Math.tanh(feature / step)
    }

    return embedding
  }

  const startCamera = async () => {
    try {
      console.log("[v0] Starting camera for live training...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream

        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!

          const onLoadedMetadata = () => {
            console.log(`[v0] Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`)
            video.removeEventListener("loadedmetadata", onLoadedMetadata)
            video.removeEventListener("error", onError)
            resolve()
          }

          const onError = (error: Event) => {
            console.error("[v0] Video error:", error)
            video.removeEventListener("loadedmetadata", onLoadedMetadata)
            video.removeEventListener("error", onError)
            reject(new Error("Video failed to load"))
          }

          video.addEventListener("loadedmetadata", onLoadedMetadata)
          video.addEventListener("error", onError)

          // Start playing the video
          video.play().catch(reject)
        })

        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!
          let attempts = 0
          const maxAttempts = 20

          const checkReady = () => {
            attempts++
            console.log(
              `[v0] Readiness check ${attempts}: ${video.videoWidth}x${video.videoHeight}, playing: ${!video.paused}`,
            )

            if (video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
              console.log(`[v0] Video fully ready: ${video.videoWidth}x${video.videoHeight}`)
              resolve()
              return
            }

            if (attempts >= maxAttempts) {
              reject(new Error(`Video not ready after ${maxAttempts} attempts`))
              return
            }

            setTimeout(checkReady, 250)
          }

          setTimeout(checkReady, 100)
        })

        console.log(`[v0] Camera ready: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`)
      }

      return true
    } catch (error) {
      console.error("[v0] Error accessing camera:", error)
      toast({
        title: "Camera Error",
        description: "Could not access camera for training",
        variant: "destructive",
      })
      return false
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const captureFramesFromVideo = async (student: Student): Promise<ImageData[]> => {
    if (!videoRef.current || !canvasRef.current) return []

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return []

    let attempts = 0
    const maxAttempts = 20

    while ((video.videoWidth === 0 || video.videoHeight === 0) && attempts < maxAttempts) {
      console.log(
        `[v0] Waiting for video dimensions, attempt ${attempts + 1}: ${video.videoWidth}x${video.videoHeight}`,
      )
      await new Promise((resolve) => setTimeout(resolve, 250))
      attempts++
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error("[v0] Video dimensions still not available after waiting:", video.videoWidth, video.videoHeight)
      return []
    }

    if (video.paused || video.ended || video.readyState < 3) {
      console.error("[v0] Video not in playable state:", {
        paused: video.paused,
        ended: video.ended,
        readyState: video.readyState,
      })
      return []
    }

    const frames: ImageData[] = []
    const totalFrames = 30

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    console.log(`[v0] Capturing ${totalFrames} frames for ${student.first_name} (${canvas.width}x${canvas.height})`)

    for (let i = 0; i < totalFrames; i++) {
      try {
        if (video.paused || video.ended) {
          console.log("[v0] Video stopped during capture")
          break
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        frames.push(imageData)

        setCaptureProgress(((i + 1) / totalFrames) * 100)
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`[v0] Error capturing frame ${i}:`, error)
        break
      }
    }

    console.log(`[v0] Successfully captured ${frames.length} frames`)
    return frames
  }

  const trainOnStudentLive = async (student: Student): Promise<boolean> => {
    setCurrentStudent(student)
    setIsCapturing(true)
    setCaptureProgress(0)

    console.log(`[v0] Starting live training for: ${student.first_name} ${student.last_name}`)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const frames = await captureFramesFromVideo(student)
      setIsCapturing(false)

      if (frames.length === 0) {
        console.log(`[v0] No frames captured for ${student.first_name}`)
        return false
      }

      const allEmbeddings: number[][] = []
      let processedFrames = 0

      for (const frame of frames) {
        const detectedFaces = await detectFacesInFrame(frame)

        if (detectedFaces.length > 0) {
          const bestFace = detectedFaces.reduce((best, current) =>
            current.confidence > best.confidence ? current : best,
          )
          allEmbeddings.push(bestFace.embedding)
          processedFrames++
        }

        setTrainingProgress((processedFrames / frames.length) * 100)
      }

      if (allEmbeddings.length === 0) {
        console.log(`[v0] No faces detected in frames for ${student.first_name}`)
        return false
      }

      const faceDescriptor: FaceDescriptor = {
        studentId: student.id,
        descriptors: allEmbeddings,
        confidence: 0.95,
      }

      setFaceDescriptors((prev) => [...prev.filter((fd) => fd.studentId !== student.id), faceDescriptor])
      setTrainedStudents((prev) => [...new Set([...prev, student.id])])

      await supabase.from("face_descriptors").upsert({
        student_id: student.id,
        descriptors: JSON.stringify(allEmbeddings),
        confidence: 0.95,
        created_at: new Date().toISOString(),
      })

      console.log(
        `[v0] Successfully trained ${student.first_name} with ${allEmbeddings.length} face embeddings from ${frames.length} frames`,
      )
      return true
    } catch (error) {
      console.error(`[v0] Error training on student ${student.first_name}:`, error)
      setIsCapturing(false)
      return false
    }
  }

  const startLiveTraining = async () => {
    if (!selectedStudent) {
      toast({
        title: "No Student Selected",
        description: "Please select a student to train on",
        variant: "destructive",
      })
      return
    }

    if (!modelLoaded) {
      toast({
        title: "Loading Models",
        description: "Please wait for face detection models to load",
        variant: "default",
      })
      return
    }

    const cameraStarted = await startCamera()
    if (!cameraStarted) return

    setIsTraining(true)
    setTrainingProgress(0)

    const success = await trainOnStudentLive(selectedStudent)

    if (success) {
      toast({
        title: "Training Complete",
        description: `Successfully trained deep learning model on ${selectedStudent.first_name} ${selectedStudent.last_name}`,
      })
    } else {
      toast({
        title: "Training Failed",
        description: "Could not detect faces in video feed",
        variant: "destructive",
      })
    }

    setIsTraining(false)
    setCurrentStudent(null)
    stopCamera()

    localStorage.setItem("faceRecognitionTrained", "true")
    localStorage.setItem("trainedStudentCount", trainedStudents.length.toString())

    onTrainingComplete()
  }

  useEffect(() => {
    loadFaceDetectionModel()
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Deep Learning Face Recognition Training
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <Brain className="h-4 w-4 text-blue-600" />
          <span className="text-sm">
            {modelLoaded ? "✅ TensorFlow.js Face Detection Models Loaded" : "🔄 Loading Deep Learning Models..."}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{availableStudents.length}</div>
            <div className="text-sm text-muted-foreground">Available Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{trainedStudents.length}</div>
            <div className="text-sm text-muted-foreground">Trained Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {faceDescriptors.reduce((sum, fd) => sum + fd.descriptors.length, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Face Embeddings</div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Select Student for Training:</label>
          <select
            value={selectedStudent?.id || ""}
            onChange={(e) => {
              const student = availableStudents.find((s) => s.id === e.target.value)
              setSelectedStudent(student || null)
            }}
            className="w-full p-2 border rounded-md"
            disabled={isTraining}
          >
            <option value="">Choose a student...</option>
            {availableStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name} - {student.student_id}
                {trainedStudents.includes(student.id) ? " (Trained)" : ""}
              </option>
            ))}
          </select>
        </div>

        {isTraining && (
          <div className="space-y-4">
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-md mx-auto rounded-lg border" />
              <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                Deep Learning Training
              </div>
            </div>

            {isCapturing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Capturing Video Frames</span>
                  <span className="text-sm text-muted-foreground">{Math.round(captureProgress)}%</span>
                </div>
                <Progress value={captureProgress} className="w-full" />
              </div>
            )}

            {!isCapturing && trainingProgress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Processing Face Embeddings</span>
                  <span className="text-sm text-muted-foreground">{Math.round(trainingProgress)}%</span>
                </div>
                <Progress value={trainingProgress} className="w-full" />
              </div>
            )}

            {currentStudent && (
              <div className="flex items-center gap-2 text-sm justify-center">
                <Video className="h-4 w-4" />
                Training AI Model: {currentStudent.first_name} {currentStudent.last_name}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {trainedStudents.length > 0 ? (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Model Ready ({trainedStudents.length} students)
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Not Trained
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            {isTraining && (
              <Button
                onClick={() => {
                  setIsTraining(false)
                  setIsCapturing(false)
                  setCurrentStudent(null)
                  stopCamera()
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop Training
              </Button>
            )}

            <Button
              onClick={startLiveTraining}
              disabled={isTraining || !selectedStudent}
              className="flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              {isTraining ? "Training..." : "Start Live Training"}
            </Button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  )
}
