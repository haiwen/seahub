import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { IconBtn } from '@seafile/sf-metadata-ui-component';
import { CellType } from '../../../../../../../_basic';
import { EVENT_BUS_TYPE, EDITOR_TYPE } from '../../../../../../../constants';

import './index.css';

const CellOperationBtn = ({
  column,
  value,
}) => {

  const openFile = useCallback(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.OPEN_EDITOR, EDITOR_TYPE.PREVIEWER);
  }, []);

  if (!value) return null;
  const { type } = column;
  if (type === CellType.FILE_NAME) {
    return (<IconBtn className="sf-metadata-cell-operation-btn" size={20} iconName="open-file" onClick={openFile} />);
  }
  return null;
};

CellOperationBtn.propTypes = {
  column: PropTypes.object,
  value: PropTypes.any,
};

export default CellOperationBtn;
