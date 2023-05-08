const isLetterOrNumberReg = (str) => {
  return /^[0-9a-zA-Z]+$/.test(str);
};

const isAllChineseStr = (str) => {
  return /^[\u4E00-\u9FA5]+$/.test(str);
};

const splitStringByNumber = (str, sortByNumericalSize = false) => {
  let strArr = [];
  const REG_STRING_NUMBER_PARTS = /\d+|\D+/g;
  const arr = str.match(REG_STRING_NUMBER_PARTS);
  for (let i = 0; i < arr.length; i++) {
    const splitStr = arr[i];
    if (isNaN(splitStr)) {
      strArr = strArr.concat(splitStr.split(''));
    } else {
      // Whether to split numbers
      if (!sortByNumericalSize) {
        strArr = strArr.concat(splitStr.split(''));
      } else {
        strArr.push(splitStr);
      }
    }
  }
  return strArr;
};

const compareTwoString = (a, b, sortByNumericalSize = true) => {
  // all the string is number or letter
  if (isLetterOrNumberReg(a) && isLetterOrNumberReg(b)) {
    return a.localeCompare(b, 'zh-Hans-CN', { numeric: true });
  }

  // all the string is chinese string
  if (isAllChineseStr(a) && isAllChineseStr(b)) {
    return a.localeCompare(b, 'zh-Hans-CN', { numeric: true });
  }

  const arrA = splitStringByNumber(a, sortByNumericalSize);
  const arrB = splitStringByNumber(b, sortByNumericalSize);

  let result = 0;
  const length = Math.min(arrA.length, arrB.length);
  for (let i = 0; i < length; i++) {
    const charA = arrA[i];
    const charB = arrB[i];
    // charB is chinese
    if (!isAllChineseStr(charA) && isAllChineseStr(charB)) {
      return -1;
    }

    // charA is chinese
    if (isAllChineseStr(charA) && !isAllChineseStr(charB)) {
      return 1;
    }

    // charA and charB all chinese
    if (isAllChineseStr(charA) && isAllChineseStr(charB)) {
      result = charA.localeCompare(charB, 'zh-Hans-CN');
    } else {
      // charA and charB all not chinese
      result = charA.localeCompare(charB, 'zh-Hans-CN', { numeric: true });
    }

    if (result !== 0) {
      return result;
    }
  }

  // result === 0;
  if (arrA.length > arrB.length) return 1;
  if (arrA.length < arrB.length) return -1;
  return 0;
};

export {
  compareTwoString
};
