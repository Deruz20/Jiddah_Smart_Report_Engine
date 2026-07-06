const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vismrobdsdsaxmqegcay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpc21yb2Jkc2RzYXhtcWVnY2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MDI1MDUsImV4cCI6MjA5MzM3ODUwNX0.ee25OGb1m9_n7j-fePXflc6FetNPKFp1iBZqADXIevo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function rotate() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'hassanhatima20@gmail.com',
    password: 'Jiddah',
  });
  
  if (error) {
    console.error('Login failed:', error.message);
    return;
  }
  
  console.log('Logged in successfully. Rotating password...');
  
  const newPassword = 'Jiddah_' + Math.random().toString(36).substring(2, 15);
  
  const { data: updateData, error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (updateError) {
    console.error('Failed to update password:', updateError.message);
  } else {
    console.log('Password rotated successfully to:', newPassword);
  }
}

rotate();
