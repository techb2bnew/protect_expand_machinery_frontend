export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

class ToastManager {
  private toasts: HTMLElement[] = [];
  private maxToasts = 5;

  private getPositionClasses(position: ToastOptions['position'] = 'top-right'): string {
    const positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
    };
    return positions[position];
  }

  private getTypeClasses(type: ToastType): string {
    const types = {
      success: 'text-white border-green-600',
      error: 'bg-red-500 text-white border-red-600',
      warning: 'bg-yellow-500 text-white border-yellow-600',
      info: 'bg-blue-500 text-white border-blue-600'
    };
    return types[type];
  }

  private getIcon(type: ToastType): string {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type];
  }

  show(message: string, type: ToastType = 'info', options: ToastOptions = {}) {
    const { duration = 4000, position = 'top-right' } = options;

    // Remove oldest toast if we have too many
    if (this.toasts.length >= this.maxToasts) {
      const oldestToast = this.toasts.shift();
      if (oldestToast && document.body.contains(oldestToast)) {
        this.removeToast(oldestToast);
      }
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `
      fixed z-50 px-6 py-4 rounded-lg shadow-lg border-l-4
      transform transition-all duration-300 ease-in-out
      max-w-sm w-full
      ${this.getPositionClasses(position)}
      ${this.getTypeClasses(type)}
    `;

    // Set custom background color for success toasts
    if (type === 'success') {
      toast.style.backgroundColor = '#49cc90';
    }

    // Set initial position (slide in from right)
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';

    // Create toast content
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
          ${this.getIcon(type)}
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium">${message}</p>
        </div>
        <button class="flex-shrink-0 text-white/80 hover:text-white transition-colors" onclick="this.parentElement.parentElement.remove()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(toast);
    this.toasts.push(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });

    // Auto remove after duration
    setTimeout(() => {
      this.removeToast(toast);
    }, duration);

    // Add click to dismiss
    toast.addEventListener('click', () => {
      this.removeToast(toast);
    });
  }

  private removeToast(toast: HTMLElement) {
    if (!document.body.contains(toast)) return;

    // Animate out
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';

    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
      // Remove from our tracking array
      const index = this.toasts.indexOf(toast);
      if (index > -1) {
        this.toasts.splice(index, 1);
      }
    }, 300);
  }

  // Convenience methods
  success(message: string, options?: ToastOptions) {
    this.show(message, 'success', options);
  }

  error(message: string, options?: ToastOptions) {
    this.show(message, 'error', options);
  }

  warning(message: string, options?: ToastOptions) {
    this.show(message, 'warning', options);
  }

  info(message: string, options?: ToastOptions) {
    this.show(message, 'info', options);
  }

  // Clear all toasts
  clear() {
    this.toasts.forEach(toast => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    });
    this.toasts = [];
  }
}

// Create singleton instance
const toast = new ToastManager();

export default toast;
