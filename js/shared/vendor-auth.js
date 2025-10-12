// Simple Vendor Authentication Manager
// Place this in: /js/shared/vendor-auth.js

const vendorAuth = {
  supabase: null,
  
  init() {
    if (!window.supabase) {
      console.error('Supabase library not loaded');
      return false;
    }
    
    if (!this.supabase) {
      this.supabase = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
      );
    }
    return true;
  },
  
  // Login using vendor code and password
  async login(vendorCode, password) {
    if (!this.supabase) this.init();
    
    try {
      // Call the validation function
      const { data, error } = await this.supabase
        .rpc('validate_vendor_login', {
          p_vendor_code: vendorCode.toUpperCase(),
          p_password: password
        });
      
      if (error) throw error;
      
      // Check if login was successful
      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }
      
      // Store vendor session
      const vendorData = {
        vendor_code: data.vendor_code,
        vendor_name: data.vendor_name,
        email: data.email,
        logged_in_at: new Date().toISOString()
      };
      
      sessionStorage.setItem('vendor_session', JSON.stringify(vendorData));
      sessionStorage.setItem('vendor_logged_in', 'true');
      
      return vendorData;
      
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Logout vendor
  logout() {
    sessionStorage.removeItem('vendor_session');
    sessionStorage.removeItem('vendor_logged_in');
  },
  
  // Check if vendor is logged in
  isLoggedIn() {
    return sessionStorage.getItem('vendor_logged_in') === 'true';
  },
  
  // Get current vendor data
  getVendorData() {
    const data = sessionStorage.getItem('vendor_session');
    return data ? JSON.parse(data) : null;
  },
  
  // Get vendor code
  getVendorCode() {
    const data = this.getVendorData();
    return data ? data.vendor_code : null;
  },
  
  // Verify session is valid
  checkAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '../index.html';
      return false;
    }
    return true;
  }
};

// Auto-initialize
if (typeof window !== 'undefined' && window.supabase) {
  vendorAuth.init();
}

// Make available globally
if (typeof window !== 'undefined') {
  window.vendorAuth = vendorAuth;
}
