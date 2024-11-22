import React from 'react';
import PropTypes from 'prop-types';
import { CellType } from '../../../../../../../constants';
import FileNameOperationBtn from './file-name-operation-btn';
import LinkOperationBtn from './link-operation-btn';

const CellOperationBtn = ({ column, record }) => {
  switch (column.type) {
    case CellType.FILE_NAME: {
      return (<FileNameOperationBtn column={column} record={record} />);
    }
    case CellType.LINK: {
      return (<LinkOperationBtn column={column} record={record} />);
    }
    default: {
      return null;
    }
  }
};

CellOperationBtn.propTypes = {
  column: PropTypes.object.isRequired,
  record: PropTypes.object.isRequired,
};

export default CellOperationBtn;
