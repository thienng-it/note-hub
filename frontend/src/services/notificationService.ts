/**
 * Notification Service
 * Handles browser notifications for unread messages
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: unknown;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private soundEnabled = true;
  private notificationSound: HTMLAudioElement | null = null;

  constructor() {
    this.checkPermission();
    this.initSound();
  }

  /**
   * Check current notification permission
   */
  private checkPermission(): void {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Initialize notification sound
   */
  private initSound(): void {
    // Create audio element for notification sound
    // Using a simple data URI for a short notification sound
    this.notificationSound = new Audio(
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKrj8LNgGgU7k9n0y3ksBS2Cyfrdkj8IFmG18u2rVxMJR6Hh8r1uHwYsiM/y24o3CBt=',
    );
    this.notificationSound.volume = 0.3;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Show a browser notification
   */
  async showNotification(options: NotificationOptions): Promise<void> {
    if (!('Notification' in window)) {
      return;
    }

    // Request permission if not already granted
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        return;
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.svg',
        tag: options.tag,
        data: options.data,
        requireInteraction: false,
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
        // Emit custom event that can be listened to
        if (options.data) {
          window.dispatchEvent(
            new CustomEvent('notification-click', {
              detail: options.data,
            }),
          );
        }
      };
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Play notification sound
   */
  playSound(): void {
    if (this.soundEnabled && this.notificationSound) {
      this.notificationSound.currentTime = 0;
      this.notificationSound.play().catch((error) => {
        console.error('Error playing notification sound:', error);
      });
    }
  }

  /**
   * Enable notification sound
   */
  enableSound(): void {
    this.soundEnabled = true;
  }

  /**
   * Disable notification sound
   */
  disableSound(): void {
    this.soundEnabled = false;
  }

  /**
   * Check if notifications are supported and permitted
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }

  /**
   * Update page title with unread count
   */
  updateTitleWithCount(count: number, originalTitle = 'NoteHub'): void {
    if (count > 0) {
      document.title = `(${count}) ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }
  }

  /**
   * Show notification for new chat message
   */
  async notifyNewMessage(senderName: string, message: string, roomId: number): Promise<void> {
    // Don't show notification if window is focused
    if (document.hasFocus()) {
      return;
    }

    await this.showNotification({
      title: `New message from ${senderName}`,
      body: message.length > 100 ? `${message.substring(0, 100)}...` : message,
      tag: `chat-${roomId}`,
      data: { roomId, type: 'chat-message' },
    });

    this.playSound();
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
