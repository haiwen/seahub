import React from 'react';
import PropTypes from 'prop-types';
import { FORMULA_RESULT_TYPE } from '../../../../constants';
import { getDateDisplayString } from '../../../../utils/ledger';

function FormulaFormatter(props) {
  const { column, row } = props;
  const value = row[column.key];

  const { data } = column;
  const { result_type, format } = data || {};
  if (result_type === FORMULA_RESULT_TYPE.DATE) {
    return getDateDisplayString(value, format);
  }
  if (result_type === FORMULA_RESULT_TYPE.STRING) {
    return value;
  }
  if (typeof value === 'object') {
    return null;
  }
  return <></>;
}

FormulaFormatter.propTypes = {
  column: PropTypes.object,
  row: PropTypes.object,
};

export default FormulaFormatter;
