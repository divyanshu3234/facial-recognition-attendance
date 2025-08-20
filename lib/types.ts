export interface Student {
  id: string
  student_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  department?: string
  year_of_study?: number
  photo_url?: string
  face_encoding?: string
  created_at: string
  updated_at: string
}

export interface Class {
  id: string
  class_code: string
  class_name: string
  instructor_name?: string
  department?: string
  semester?: string
  academic_year?: string
  created_at: string
}

export interface AttendanceSession {
  id: string
  class_id: string
  session_date: string
  session_time: string
  session_type: string
  location?: string
  created_by?: string
  status: string
  created_at: string
  classes?: Class
}

export interface Attendance {
  id: string
  session_id: string
  student_id: string
  status: "present" | "absent" | "late"
  marked_at: string
  recognition_confidence?: number
  manual_override: boolean
  notes?: string
  students?: Student
  attendance_sessions?: AttendanceSession
}

export interface StudentClass {
  id: string
  student_id: string
  class_id: string
  enrolled_at: string
  students?: Student
  classes?: Class
}
