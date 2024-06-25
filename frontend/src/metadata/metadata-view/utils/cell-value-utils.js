class CellValueUtils {

  isValidCellValue = (value) => {
    if (value === undefined) return false;
    if (value === null) return false;
    if (value === '') return false;
    if (JSON.stringify(value) === '{}') return false;
    if (JSON.stringify(value) === '[]') return false;
    return true;
  };

}

export default CellValueUtils;
