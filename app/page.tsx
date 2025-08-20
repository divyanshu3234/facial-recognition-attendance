import { createClient } from "@/lib/supabase/server"
import StudentDashboard from "@/components/student-dashboard"

export default async function HomePage() {
  const supabase = createClient()

  // For demo purposes, we'll skip authentication and go directly to the dashboard
  // In a real app, you'd check authentication here

  return <StudentDashboard />
}
