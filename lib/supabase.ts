import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ivgogaqfhzcxievzfqhk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2Z29nYXFmaHpjeGlldnpmcWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTA4OTgsImV4cCI6MjA5MTA2Njg5OH0.B10-T6w1kLAVQVmGNQglzrPUotDvn0gcz10K5_0k3d0'
)
