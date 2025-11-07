
import { createClient } from '@supabase/supabase-js'
import { constants } from 'buffer'
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY


let supabase : any;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
} else {
  throw new Error('Supabase URL or Key is not defined in environment variables')
}

export default supabase;
