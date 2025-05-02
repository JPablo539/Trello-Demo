import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const supabaseUrl = 'https://zndaxpwpknxgokboucbx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZGF4cHdwa254Z29rYm91Y2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MDE5MzYsImV4cCI6MjA2MDE3NzkzNn0.xByF5Of_-fs2GE6w-5YC93d2HaQV1vetjs61utB5r0w';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey); 