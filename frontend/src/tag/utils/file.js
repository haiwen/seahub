export const getFileById = (tagFiles, fileId) => {
  return tagFiles.rows.find(file => file._id === fileId);
};
