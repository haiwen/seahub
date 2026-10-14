import toaster from '@/components/toast';

const copyButton = document.getElementById('qr-code-secret-key');

if (copyButton) {
  const fallbackCopy = (text) => {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(input);
    return copied;
  };

  const notifyCopied = () => {
    toaster.success(copyButton.getAttribute('data-copy-success-message'), {
      id: 'two-factor-copy-secret',
      duration: 2,
    });
  };

  copyButton.addEventListener('click', () => {
    const secretKey = copyButton.getAttribute('data-secret-key') || '';
    if (!secretKey) {
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(secretKey).then(notifyCopied).catch(() => {
        if (fallbackCopy(secretKey)) {
          notifyCopied();
        }
      });
    } else if (fallbackCopy(secretKey)) {
      notifyCopied();
    }
  });
}
