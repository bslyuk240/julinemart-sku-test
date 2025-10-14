// Vendor Management System for JulineMart
// Place this at: /js/shared/vendor-manager.js

const vendorManager = {
  supabase: null,
  
  // Initialize Supabase client
  init() {
    if (!window.supabase) {
      console.error('Supabase library not loaded');
      return false;
    }
    
    if (!this.supabase) {
      const SUPABASE_URL = window.SUPABASE_URL;
      const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
      
      this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
      console.log('🔧 Creating vendor:', vendorCode, email);
      
      // Step 1: Check if vendor already exists in database
      const { data: existingVendor, error: findError } = await this.supabase
        .from('vendors')
        .select('id, email, vendor_code')
        .eq('vendor_code', vendorCode.toUpperCase())
        .maybeSingle();
      
      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }
      
      // Step 2: Create or update vendor record in database
      if (existingVendor) {
        console.log('📝 Vendor exists, updating...');
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
        console.log('➕ Creating new vendor record...');
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
            console.log('⚠️ Vendor already exists, continuing...');
          } else {
            throw insertError;
          }
        } else {
          result.isNewVendor = true;
        }
      }
      
      // Step 3: Create auth account via Netlify function
      // This requires service role key, so we use a serverless function
      if (email) {
        console.log('🔐 Creating auth account via Netlify function...');
        
        try {
          const response = await fetch('/.netlify/functions/create-vendor-auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              vendor_code: vendorCode.toUpperCase(),
              vendor_name: vendorName,
              email: email.toLowerCase()
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Auth creation failed:', errorData);
            throw new Error(errorData.error || 'Failed to create auth account');
          }

          const authResult = await response.json();
          console.log('✅ Auth result:', authResult);
          
          result.authCreated = authResult.authCreated;
          result.emailSent = authResult.emailSent;
          
        } catch (authError) {
          console.error('❌ Auth error:', authError);
          // Don't fail the whole operation if auth fails
          result.error = 'Vendor created but auth setup failed: ' + authError.message;
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Vendor creation error:', error);
      result.error = error.message;
      throw error;
    }
  },
  
  /**
   * Send password reset email to vendor
   * @param {string} email - Vendor email address
   */
  async sendPasswordReset(email) {
    if (!this.supabase) this.init();
    
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(
        email.toLowerCase(),
        {
          redirectTo: `${window.location.origin}/vendor/index.html`
        }
      );
      
      if (error) throw error;
      
      return { success: true };
      
    } catch (error) {
      console.error('Password reset error:', error);
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
