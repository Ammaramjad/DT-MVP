type ToastType = 'success' | 'error' | 'warning' | 'info';

class ToastManager {
  private toasts: Array<{ id: string; message: string; type: ToastType }> = [];
  private listeners: Array<(toasts: typeof this.toasts) => void> = [];

  subscribe(listener: (toasts: typeof this.toasts) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  show(message: string, type: ToastType = 'info', duration = 5000) {
    const id = Math.random().toString(36).substring(7);
    this.toasts.push({ id, message, type });
    this.notify();

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  warning(message: string) {
    this.show(message, 'warning');
  }

  info(message: string) {
    this.show(message, 'info');
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
    this.notify();
  }
}

export const toast = new ToastManager();
