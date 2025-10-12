/**
 * Shared Logo Management System
 * Provides consistent logo display across all pages
 */

const logoManager = {
  STORAGE_KEY: 'jm_logo_url_v1',
  TITLE_STORAGE_KEY: 'jm_site_title_v1',
  
  /**
   * Get the current logo URL from storage
   */
  getLogoUrl() {
    return localStorage.getItem(this.STORAGE_KEY) || '';
  },
  
  /**
   * Get the current site title from storage
   */
  getSiteTitle() {
    return localStorage.getItem(this.TITLE_STORAGE_KEY) || '';
  },
  
  /**
   * Save logo URL to storage
   */
  setLogoUrl(url) {
    localStorage.setItem(this.STORAGE_KEY, url);
  },
  
  /**
   * Save site title to storage
   */
  setSiteTitle(title) {
    localStorage.setItem(this.TITLE_STORAGE_KEY, title);
  },
  
  /**
   * Initialize logo display for a page
   * @param {Object} options - Configuration options
   * @param {string} options.logoElementId - ID of the img element to update
   * @param {string} options.fallbackText - Text to show when no logo is available
   * @param {string} options.titleElementId - ID of title element to show/hide (optional)
   * @param {string} options.pageType - Page type for title (optional)
   */
  init(options = {}) {
    const {
      logoElementId = 'headerLogo',
      fallbackText = 'JulineMart',
      titleElementId = null,
      pageType = ''
    } = options;
    
    const logoElement = document.getElementById(logoElementId);
    const titleElement = titleElementId ? document.getElementById(titleElementId) : null;
    const logoUrl = this.getLogoUrl();
    const customTitle = this.getSiteTitle();
    const displayTitle = customTitle || fallbackText;
    
    // Update page title
    this.updatePageTitle(pageType);
    
    if (!logoElement) {
      console.warn('Logo element not found:', logoElementId);
      return;
    }
    
    if (logoUrl) {
      this.updateLogoDisplay(logoElement, logoUrl, titleElement, displayTitle);
    } else {
      this.showFallback(logoElement, displayTitle, titleElement);
    }
    
    // Listen for logo and title changes from other pages
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY || e.key === this.TITLE_STORAGE_KEY) {
        const newLogoUrl = this.getLogoUrl();
        const newCustomTitle = this.getSiteTitle();
        const newDisplayTitle = newCustomTitle || fallbackText;
        
        // Update page title
        this.updatePageTitle(pageType);
        
        if (newLogoUrl) {
          this.updateLogoDisplay(logoElement, newLogoUrl, titleElement, newDisplayTitle);
        } else {
          this.showFallback(logoElement, newDisplayTitle, titleElement);
        }
      }
    });
  },
  
  /**
   * Update logo display with URL
   */
  updateLogoDisplay(logoElement, logoUrl, titleElement = null, displayTitle = 'JulineMart') {
    logoElement.src = logoUrl;
    logoElement.style.display = 'block';
    logoElement.classList.remove('broken');
    
    // Update title text and show both logo and title together
    if (titleElement) {
      titleElement.textContent = displayTitle;
      titleElement.style.display = 'block'; // Show title alongside logo
    }
    
    // Handle load errors
    logoElement.onerror = () => {
      console.warn('Failed to load logo:', logoUrl);
      logoElement.classList.add('broken');
      logoElement.style.display = 'none';
      if (titleElement) {
        titleElement.textContent = displayTitle;
        titleElement.style.display = 'block';
      }
    };
    
    // Handle successful load
    logoElement.onload = () => {
      logoElement.classList.remove('broken');
      logoElement.style.display = 'block';
      if (titleElement) {
        titleElement.textContent = displayTitle;
        titleElement.style.display = 'block'; // Show title alongside logo
      }
    };
  },
  
  /**
   * Show fallback when no logo is available
   */
  showFallback(logoElement, displayTitle, titleElement = null) {
    logoElement.style.display = 'none';
    logoElement.src = '';
    logoElement.classList.remove('broken');
    
    // Show title text when no logo
    if (titleElement) {
      titleElement.style.display = 'block';
      titleElement.textContent = displayTitle;
    }
  },
  
  /**
   * Update page title based on configured site title
   */
  updatePageTitle(pageType = '') {
    const customTitle = this.getSiteTitle();
    const baseName = customTitle || 'JulineMart';
    
    if (pageType) {
      document.title = `${pageType} - ${baseName}`;
    } else {
      document.title = baseName;
    }
  },
  
  /**
   * Get logo HTML for print/export functions
   */
  getLogoForPrint() {
    const logoUrl = this.getLogoUrl();
    const customTitle = this.getSiteTitle();
    const displayTitle = customTitle || 'JulineMart';
    
    if (logoUrl) {
      return `<img src="${logoUrl}" alt="Logo" style="max-height: 50px; max-width: 150px; object-fit: contain;">`;
    }
    return `<div class="company-name">${displayTitle}</div>`;
  }
};

// Make it globally available
if (typeof window !== 'undefined') {
  window.logoManager = logoManager;
}
