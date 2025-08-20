-- Insert sample classes
INSERT INTO classes (class_code, class_name, instructor_name, department, semester, academic_year) VALUES
('CS101', 'Introduction to Computer Science', 'Dr. Sarah Johnson', 'Computer Science', 'Fall', '2024'),
('CS201', 'Data Structures and Algorithms', 'Prof. Michael Chen', 'Computer Science', 'Fall', '2024'),
('MATH101', 'Calculus I', 'Dr. Emily Rodriguez', 'Mathematics', 'Fall', '2024'),
('ENG101', 'English Composition', 'Prof. David Wilson', 'English', 'Fall', '2024');

-- Insert sample students with mock data
INSERT INTO students (student_id, first_name, last_name, email, phone, department, year_of_study, photo_url) VALUES
('STU001', 'Alice', 'Johnson', 'alice.johnson@university.edu', '+1-555-0101', 'Computer Science', 2, '/placeholder.svg?height=200&width=200'),
('STU002', 'Bob', 'Smith', 'bob.smith@university.edu', '+1-555-0102', 'Computer Science', 2, '/placeholder.svg?height=200&width=200'),
('STU003', 'Carol', 'Davis', 'carol.davis@university.edu', '+1-555-0103', 'Mathematics', 3, '/placeholder.svg?height=200&width=200'),
('STU004', 'David', 'Wilson', 'david.wilson@university.edu', '+1-555-0104', 'Computer Science', 1, '/placeholder.svg?height=200&width=200'),
('STU005', 'Emma', 'Brown', 'emma.brown@university.edu', '+1-555-0105', 'English', 2, '/placeholder.svg?height=200&width=200'),
('STU006', 'Frank', 'Miller', 'frank.miller@university.edu', '+1-555-0106', 'Computer Science', 3, '/placeholder.svg?height=200&width=200'),
('STU007', 'Grace', 'Taylor', 'grace.taylor@university.edu', '+1-555-0107', 'Mathematics', 1, '/placeholder.svg?height=200&width=200'),
('STU008', 'Henry', 'Anderson', 'henry.anderson@university.edu', '+1-555-0108', 'English', 2, '/placeholder.svg?height=200&width=200');

-- Enroll students in classes
INSERT INTO student_classes (student_id, class_id) 
SELECT s.id, c.id 
FROM students s, classes c 
WHERE 
  (s.student_id = 'STU001' AND c.class_code IN ('CS101', 'CS201', 'MATH101')) OR
  (s.student_id = 'STU002' AND c.class_code IN ('CS101', 'CS201')) OR
  (s.student_id = 'STU003' AND c.class_code IN ('MATH101', 'CS101')) OR
  (s.student_id = 'STU004' AND c.class_code IN ('CS101', 'ENG101')) OR
  (s.student_id = 'STU005' AND c.class_code IN ('ENG101', 'MATH101')) OR
  (s.student_id = 'STU006' AND c.class_code IN ('CS201', 'MATH101')) OR
  (s.student_id = 'STU007' AND c.class_code IN ('MATH101', 'CS101')) OR
  (s.student_id = 'STU008' AND c.class_code IN ('ENG101', 'CS101'));

-- Create sample attendance sessions for today and recent days
INSERT INTO attendance_sessions (class_id, session_date, session_time, session_type, location, created_by)
SELECT 
  c.id,
  CURRENT_DATE - INTERVAL '0 days',
  '09:00:00',
  'lecture',
  'Room 101',
  c.instructor_name
FROM classes c WHERE c.class_code = 'CS101'

UNION ALL

SELECT 
  c.id,
  CURRENT_DATE - INTERVAL '0 days',
  '11:00:00',
  'lecture',
  'Room 201',
  c.instructor_name
FROM classes c WHERE c.class_code = 'CS201'

UNION ALL

SELECT 
  c.id,
  CURRENT_DATE - INTERVAL '1 days',
  '10:00:00',
  'lecture',
  'Room 301',
  c.instructor_name
FROM classes c WHERE c.class_code = 'MATH101'

UNION ALL

SELECT 
  c.id,
  CURRENT_DATE - INTERVAL '2 days',
  '14:00:00',
  'lecture',
  'Room 401',
  c.instructor_name
FROM classes c WHERE c.class_code = 'ENG101';
