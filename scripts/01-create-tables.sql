-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(100),
  year_of_study INTEGER,
  photo_url TEXT,
  face_encoding TEXT, -- JSON string of face encoding for recognition
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_code VARCHAR(20) UNIQUE NOT NULL,
  class_name VARCHAR(200) NOT NULL,
  instructor_name VARCHAR(100),
  department VARCHAR(100),
  semester VARCHAR(20),
  academic_year VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student_classes junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS student_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, class_id)
);

-- Create attendance_sessions table
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_time TIME NOT NULL,
  session_type VARCHAR(50) DEFAULT 'lecture', -- lecture, lab, tutorial, etc.
  location VARCHAR(200),
  created_by VARCHAR(100), -- instructor/admin who created the session
  status VARCHAR(20) DEFAULT 'active', -- active, closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'present', -- present, absent, late
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recognition_confidence DECIMAL(5,4), -- confidence score from facial recognition
  manual_override BOOLEAN DEFAULT FALSE, -- if attendance was manually adjusted
  notes TEXT,
  UNIQUE(session_id, student_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_classes_class_code ON classes(class_code);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_session_student ON attendance(session_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_at ON attendance(marked_at);
