import { sileo } from 'sileo';

interface ToastAction {
  label: string;
  onClick: () => void;
}

export const toastSuccess = (
  message: string,
  options?: { description?: string; action?: ToastAction; duration?: number }
) => {
  if (options?.action) {
    sileo.action({
      title: message,
      description: options.description,
      duration: options.duration ?? 3000,
      button: {
        title: options.action.label,
        onClick: options.action.onClick,
      },
    });
  } else {
    sileo.success({
      title: message,
      description: options?.description,
      duration: options?.duration ?? 3000,
    });
  }
};

export const toastError = (message: string, description?: string) => {
  sileo.error({
    title: message,
    description: description ?? 'Ha ocurrido un error inesperado',
    duration: 5000,
  });
};

export const toastWarning = (message: string, description?: string) => {
  sileo.warning({
    title: message,
    description,
    duration: 4000,
  });
};

export const toastInfo = (message: string, description?: string) => {
  sileo.info({
    title: message,
    description,
    duration: 4000,
  });
};

export const toast = (message: string, options?: { description?: string; duration?: number }) => {
  sileo.show({
    title: message,
    description: options?.description,
    duration: options?.duration ?? 4000,
  });
};

export const toastPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
) => {
  return sileo.promise(promise, {
    loading: { title: messages.loading },
    success: (data) => ({
      title: typeof messages.success === 'function' ? messages.success(data) : messages.success,
    }),
    error: (err) => ({
      title: typeof messages.error === 'function' ? messages.error(err as Error) : messages.error,
      description: err instanceof Error ? err.message : undefined,
    }),
  });
};
