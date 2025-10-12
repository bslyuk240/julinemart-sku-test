// Authentication Manager for JulineMart
// Place this file at: /js/shared/auth.js

const authManager = {
  supabase: null,
  
  // Initialize Supabase client
  init() {
    if (!window.supabase) {
      console.error('Supabase library not loaded');
      return false;
    }
    
    if (!this.supabase) {
      this.supabase = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );
    }
    return true;
  },
  
  // Login with email and password
  async login(email, password) {
    if (!this.supabase) this.init();
    
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });
      
      if (error) throw error;
      
      // Store user data
      if (data.user) {
        const userData = {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || 'vendor',
          vendor_code: data.user.user_metadata?.vendor_code || null,
          username: data.user.user_metadata?.username || data.user.email
        };
        localStorage.setItem('jm_user', JSON.stringify(userData));
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Logout user
  async logout() {
    if (!this.supabase) this.init();
    
    try {
      await this.supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all session data
      sessionStorage.clear();
      localStorage.removeItem('jm_user');
      localStorage.removeItem('vendorCode');
      localStorage.removeItem('vendorLoggedIn');
    }
  },
  
  // Get current authenticated user
  async getCurrentUser() {
    if (!this.supabase) this.init();
    
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  },
  
  // Check authentication and redirect if not authenticated
  async initAuthCheck() {
    const user = await this.getCurrentUser();
    
    if (!user) {
      // Not authenticated, redirect to login
      window.location.href = './login.html';
      return false;
    }
    
    // Update stored user data
    const userData = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'vendor',
      vendor_code: user.user_metadata?.vendor_code || null,
      username: user.user_metadata?.username || user.email
    };
    localStorage.setItem('jm_user', JSON.stringify(userData));
    
    return true;
  },
  
  // Get stored user data
  getUserData() {
    const stored = localStorage.getItem('jm_user');
    return stored ? JSON.parse(stored) : null;
  },
  
  // Check if user is admin
  isAdmin() {
    const user = this.getUserData();
    return user && user.role === 'admin';
  },
  
  // Check if user is vendor
  isVendor() {
    const user = this.getUserData();
    return user && user.role === 'vendor';
  },
  
  // Get vendor code for current user
  getVendorCode() {
    const user = this.getUserData();
    return user?.vendor_code || null;
  },
  
  // Redirect to admin portal
  redirectToAdmin() {
    window.location.href = './index.html';
  },
  
  // Redirect to login
  redirectToLogin() {
    window.location.href = './login.html';
  },
  
  // Register new user (admin only)
  async register(email, password, metadata = {}) {
    if (!this.supabase) this.init();
    
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: metadata // role, vendor_code, username, etc.
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  // Listen for auth state changes
  onAuthStateChange(callback) {
    if (!this.supabase) this.init();
    
    return this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN') {
        const user = session?.user;
        if (user) {
          const userData = {
            id: user.id,
            email: user.email,
            role: user.user_metadata?.role || 'vendor',
            vendor_code: user.user_metadata?.vendor_code || null,
            username: user.user_metadata?.username || user.email
          };
          localStorage.setItem('jm_user', JSON.stringify(userData));
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('jm_user');
        sessionStorage.clear();
      }
      
      if (callback) callback(event, session);
    });
  }
};

// Auto-initialize when script loads
if (typeof window !== 'undefined' && window.supabase) {
  authManager.init();
}

// Make available globally
if (typeof window !== 'undefined') {
  window.authManager = authManager;
}
