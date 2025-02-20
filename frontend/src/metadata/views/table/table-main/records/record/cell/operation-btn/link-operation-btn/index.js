import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import IconBtn from '../../../../../../../../../components/icon-btn';
import { canEditCell } from '../../../../../../../../utils/column';

import './index.css';

const LinkOperationBtn = ({ record, column }) => {

  const canEdit = useMemo(() => canEditCell(column, record, true), [column, record]);

  const openEditor = useCallback(() => {

  }, []);

  if (!canEdit) return null;

  return (
    <IconBtn
      id="sf-metadata-cell-expand-btn"
      className="sf-metadata-cell-operation-btn sf-metadata-cell-expand-operation-btn"
      size={12}
      symbol="expand"
      onClick={openEditor}
    />
  );
};

LinkOperationBtn.propTypes = {
  record: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
};

export default LinkOperationBtn;
