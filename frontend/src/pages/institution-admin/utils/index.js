export const getNavMessage = (url) => {
  const paths = url.split('/');
  const adminIdx = paths.findIndex(item => item ==='useradmin');
  const email = paths[adminIdx + 1];
  const nav = paths[adminIdx + 2];
  const username = decodeURIComponent(email);
  return { username, nav };
};