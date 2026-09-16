const formatMonthInput = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 4) {
    return digits;
  }
  const month = digits.slice(4);
  return `${digits.slice(0, 4)}-${Number(month) > 12 ? '12' : month}`;
};

const normalizeMonthValue = (value) => value.replace('-', '');

const isValidMonthInput = (value) => /^(?:[012]\d{3})-(0[1-9]|1[0-2])$/.test(value);

export { formatMonthInput, normalizeMonthValue, isValidMonthInput };
