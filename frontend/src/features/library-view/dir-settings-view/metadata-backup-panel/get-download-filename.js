const getDownloadFilename = (contentDisposition) => {
  // Consume quoted values together so embedded semicolons stay inside their parameter.
  const parameters = /(?:^|;)\s*([^=;\s]+)\s*=\s*(?:"((?:\\.|[^"\\])*)"|([^;]*))/g;
  let filename;
  let encodedFilename;
  let match;

  while ((match = parameters.exec(contentDisposition || ''))) {
    const name = match[1].toLowerCase();
    const value = match[2] === undefined ? match[3].trim() : match[2].replace(/\\(.)/g, '$1');
    if (name === 'filename') filename = value;
    if (name === 'filename*') encodedFilename = value;
  }

  const encoded = encodedFilename?.match(/^UTF-8'[^']*'(.+)$/i);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      // Fall back to filename when the extended value has invalid UTF-8 encoding.
    }
  }

  return filename || 'metadata-backup.xlsx';
};

export default getDownloadFilename;
