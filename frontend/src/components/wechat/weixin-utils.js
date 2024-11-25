export const isWorkWeixin = (ua) => {
  if (ua.includes('micromessenger') && ua.includes('wxwork')) {
    return true;
  }
  return false;
};
