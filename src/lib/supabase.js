import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ytfzkzgdshroudkbzerz.supabase.co'
const supabasePublishableKey = 'sb_publishable_Qa6O4MAzHWoYdd_B9o3DIQ__mOWPt38'

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
