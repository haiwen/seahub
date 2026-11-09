export const resolveImageUrl = (element, pageOptions, serviceURL, imageFiles) => {
  const { fileId, filename, dataURL } = element;
  // A share gateway mapping is authoritative; never fall back to a raw URL.
  if (imageFiles) return imageFiles[fileId]?.url;

  const { docUuid, repoID, sharedToken } = pageOptions;
  if (!dataURL) {
    return `${serviceURL}/api/v2.1/exdraw/download-image/${docUuid}/${encodeURIComponent(filename)}`;
  }
  // Internal previews use the normal file endpoint and its login/path checks.
  if (!sharedToken) return dataURL;

  try {
    const image = new URL(dataURL);
    const repo = new URL(`${serviceURL}/lib/${repoID}/file/`);
    if (image.origin !== repo.origin || !image.pathname.startsWith(repo.pathname) ||
        image.searchParams.get('raw') !== '1') return dataURL;
    const path = decodeURIComponent(image.pathname.slice(repo.pathname.length - 1));
    const params = new URLSearchParams({ token: sharedToken, path });
    return `${serviceURL}/view-image-via-share-link/?${params.toString()}`;
  } catch (error) {
    return dataURL;
  }
};
