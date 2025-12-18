/**
 * Offline detection utilities
 */

type OnlineStatusCallback = (isOnline: boolean) => void;

class OfflineDetector {
  private listeners: Set<OnlineStatusCallback> = new Set();
  private _isOnline: boolean = navigator.onLine;

  constructor() {
    // Listen to online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private handleOnline(): void {
    this._isOnline = true;
    this.notifyListeners();
  }

  private handleOffline(): void {
    this._isOnline = false;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback(this._isOnline);
      } catch (error) {
        console.error('Error in offline status listener:', error);
      }
    });
  }

  /**
   * Check if the browser is currently online
   */
  get isOnline(): boolean {
    return this._isOnline;
  }

  /**
   * Check if the browser is currently offline
   */
  get isOffline(): boolean {
    return !this._isOnline;
  }

  /**
   * Subscribe to online/offline status changes
   * @param callback Function to call when status changes
   * @returns Unsubscribe function
   */
  subscribe(callback: OnlineStatusCallback): () => void {
    this.listeners.add(callback);
    // Call immediately with current status
    callback(this._isOnline);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Ping the server to check if we have actual connectivity
   * (navigator.onLine can be true even when server is unreachable)
   */
  async checkServerConnectivity(url: string = '/api/v1/health'): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const offlineDetector = new OfflineDetector();
