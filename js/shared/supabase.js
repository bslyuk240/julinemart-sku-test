// Shared Supabase configuration for the JulineMart app
// This file centralizes the Supabase URL and anon key so pages don't duplicate them.
// If you need to change the project, update the values here.
window.SUPABASE_URL = 'https://hnpwnjjjgxuelfognakp.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucHduampqZ3h1ZWxmb2duYWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTU2NDYsImV4cCI6MjA3NDMzMTY0Nn0.AVaBAzmddxnZz23YIu7IaeZzTEPI6n8CjyahRQvZSHk';

// Helpful: expose a small helper that returns the same names existing code expects
// (pages call getSupabase(), which builds a client using SUPABASE_URL and SUPABASE_ANON_KEY).
// We don't override getSupabase here to avoid clashing with page-local implementations.
// This file only provides the constants on the window object.
