// Vendor Management System for JulineMart
// Place this at: /js/shared/vendor-manager.js

const vendorManager = {
  supabase: null,
  
  // Initialize Supabase client with service role key
  init() {
    if (!window.supabase) {
      console.error('Supabase library not loaded');
      return false;
    }
    
    if (!this.supabase) {
      // Use service role key for admin operations
      const SUPABASE_URL = window.SUPABASE_URL;
      const SUPABASE_SERVICE_KEY = window.SUPABASE_SERVICE_ROLE_KEY || 
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucHduampqZ3h1ZWxmb2duYWtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc1NTY0NiwiZXhwIjoyMDc0MzMxNjQ2fQ.3qu-BpT0N914eCFBo8a0StXvNy6uKs7eWgYCIyEEL7w';
      
      this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false }
      });
    }
    return true;
  },
  
  /**
   * Create vendor with authentication account
   * @param {string} vendorCode - 3-letter vendor code
   * @param {string} vendorName - Full vendor name
   * @param {string} email - Vendor email address
   * @returns {Object} Result object with creation details
   */
  async createVendorWithAuth(vendorCode, vendorName, email) {
    if (!this.supabase) this.init();
    
    const result = {
      isNewVendor: false,
      authCreated: false,
      emailSent: false,
      error: null
    };
    
    try {
      // Step 1: Check if vendor already exists
      const { data: existingVendor, error: findError } = await this.supabase
        .from('vendors')
        .select('id, email, vendor_code')
        .eq('vendor_code', vendorCode.toUpperCase())
        .maybeSingle();
      
      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }
      
      // Step 2: Create or update vendor record
      if (existingVendor) {
        // Vendor exists, update if email changed
        if (existingVendor.email !== email.toLowerCase() && email) {
          await this.supabase
            .from('vendors')
            .update({ 
              email: email.toLowerCase(),
              vendor_name: vendorName,
              updated_at: new Date().toISOString()
            })
            .eq('vendor_code', vendorCode);
        }
      } else {
        // Create new vendor
        const { error: insertError } = await this.supabase
          .from('vendors')
          .insert([{
            vendor_code: vendorCode.toUpperCase(),
            vendor_name: vendorName,
            email: email.toLowerCase(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        
        if (insertError) {
          // Check if it's a duplicate key error
          if (insertError.code === '23505') {
            console.log('Vendor already exists, skipping creation');
          } else {
            throw insertError;
          }
        } else {
          result.isNewVendor = true;
        }
      }
      
      // Step 3: Create auth account using Supabase Admin API
      if (email) {
        try {
          // Generate a temporary password
          const tempPassword = this.generatePassword();
          
          const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
            email: email.toLowerCase(),
            password: tempPassword,
            email_confirm: false, // Require email confirmation
            user_metadata: {
              role: 'vendor',
              vendor_code: vendorCode.toUpperCase(),
              vendor_name: vendorName
            }
          });
          
          if (authError) {
            // User might already exist
            if (authError.message.includes('User already registered')) {
              console.log('Auth account already exists for this email');
            } else {
              console.error('Auth creation error:', authError);
            }
          } else {
            result.authCreated = true;
            
            // Step 4: Send password reset email to let them set their own password
            const { error: resetError } = await this.supabase.auth.resetPasswordForEmail(
              email.toLowerCase(),
              {
                redirectTo: `${window.location.origin}/vendor/index.html`
              }
            );
            
            if (!resetError) {
              result.emailSent = true;
            }
          }
        } catch (authErr) {
          console.error('Authentication setup error:', authErr);
          // Don't fail the whole operation if auth fails
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('Vendor creation error:', error);
      result.error = error.message;
      throw error;
    }
  },
  
  /**
   * Generate a random temporary password
   */
  generatePassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  },
  
  /**
   * Update vendor password
   * @param {string} vendorCode - Vendor code
   * @param {string} newPassword - New password
   */
  async updateVendorPassword(vendorCode, newPassword) {
    if (!this.supabase) this.init();
    
    try {
      // Get vendor email
      const { data: vendor, error: vendorError } = await this.supabase
        .from('vendors')
        .select('email')
        .eq('vendor_code', vendorCode)
        .single();
      
      if (vendorError) throw vendorError;
      if (!vendor || !vendor.email) {
        throw new Error('Vendor email not found');
      }
      
      // Update password using admin API
      const { data: users, error: listError } = await this.supabase.auth.admin.listUsers();
      if (listError) throw listError;
      
      const user = users.users.find(u => u.email === vendor.email);
      if (!user) {
        throw new Error('Auth user not found');
      }
      
      const { error: updateError } = await this.supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      );
      
      if (updateError) throw updateError;
      
      return { success: true };
      
    } catch (error) {
      console.error('Password update error:', error);
      throw error;
    }
  }
};

// Auto-initialize
if (typeof window !== 'undefined' && window.supabase) {
  vendorManager.init();
}

// Make available globally
if (typeof window !== 'undefined') {
  window.vendorManager = vendorManager;
}
