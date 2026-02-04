import Swal from 'sweetalert2';

/** Show an error message (replaces alert) */
export function showError(message, title = 'Error') {
  return Swal.fire({ icon: 'error', title, text: message });
}

/** Show a warning message */
export function showWarning(message, title = 'Notice') {
  return Swal.fire({ icon: 'warning', title, text: message });
}

/** Confirm dialog – returns Promise<boolean> (true if confirmed) */
export function confirm(options) {
  const { title = 'Are you sure?', text = '', confirmText = 'Yes', cancelText = 'Cancel', icon = 'question' } = typeof options === 'string' ? { text: options } : options;
  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: '#8b6f5a',
  }).then((result) => result.isConfirmed);
}

export default Swal;
