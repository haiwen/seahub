const SEARCH_DELAY_TIME = 1000;

const getValueLength = (str) => {
  let code;
  let len = 0;
  for (let i = 0; i < str.length; i++) {
    code = str.charCodeAt(i);
    if (code == 10) { //solve enter problem
      len += 2;
    } else if (code < 0x007f) {
      len += 1;
    } else if (code >= 0x0080 && code <= 0x07ff) {
      len += 2;
    } else if (code >= 0x0800 && code <= 0xffff) {
      len += 3;
    }
  }
  return len;
};

export { SEARCH_DELAY_TIME, getValueLength };
