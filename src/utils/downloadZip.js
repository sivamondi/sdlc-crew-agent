import JSZip from 'jszip';

export async function downloadAllAsZip(files) {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.filename, file.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sdlc-output.zip';
  a.click();
  URL.revokeObjectURL(url);
}
