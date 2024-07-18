import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import { IconBtn } from '@seafile/sf-metadata-ui-component';
import { CellType } from '../../../../../../../_basic';
import { EVENT_BUS_TYPE, EDITOR_TYPE } from '../../../../../../../constants';
import { gettext } from '../../../../../../../utils';

import './index.css';

const CellOperationBtn = ({
  isDir,
  column,
  value,
}) => {

  const openFile = useCallback((event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.OPEN_EDITOR, EDITOR_TYPE.PREVIEWER);
  }, []);

  if (!value) return null;
  const { type } = column;
  if (type === CellType.FILE_NAME) {
    const target = 'sf-metadata-cell-open-file-btn';
    return (
      <>
        <IconBtn id={target} className="sf-metadata-cell-operation-btn" size={20} iconName="open-file" onClick={openFile} />
        <UncontrolledTooltip
          hideArrow
          target={target}
          placement="bottom"
          fade={false}
          delay={{ show: 0, hide: 0 }}
          modifiers={{ preventOverflow: { boundariesElement: document.body } }}
        >
          {gettext(isDir ? 'Open folder' : 'Open file')}
        </UncontrolledTooltip>
      </>
    );
  }
  return null;
};

CellOperationBtn.propTypes = {
  isDir: PropTypes.bool,
  column: PropTypes.object,
  value: PropTypes.any,
};

export default CellOperationBtn;
