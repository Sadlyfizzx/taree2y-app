export async function copyTextToClipboard(text) {
  const safeText = String(text || '').trim();
  if (!safeText) throw new Error('empty_text');

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(safeText);
    return true;
  }

  const textArea = document.createElement('textarea');
  textArea.value = safeText;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } finally {
    document.body.removeChild(textArea);
  }

  if (!ok) throw new Error('copy_failed');
  return true;
}
