import React from 'react';
import PropTypes from 'prop-types';
import TagNameOperationBtn from './tag-name-operation-btn';
import { PRIVATE_COLUMN_KEY } from '../../../../constants/column/private';

const CellOperationBtn = ({ column, record, ...customProps }) => {

  switch (column.key) {
    case PRIVATE_COLUMN_KEY.TAG_NAME: {
      return (<TagNameOperationBtn {...customProps} column={column} record={record} />);
    }
    default: {
      return null;
    }
  }
};

CellOperationBtn.propTypes = {
  column: PropTypes.object,
  record: PropTypes.object,
};

export default CellOperationBtn;
