import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import { IconBtn } from '@seafile/sf-metadata-ui-component';
import { CellType } from '../../../../../../../../_basic';
import { EVENT_BUS_TYPE, EDITOR_TYPE } from '../../../../../../../../constants';
import { gettext } from '../../../../../../../../utils';

import './index.css';

const CellOperationBtn = ({ isDir, column, value }) => {

  const openFile = useCallback((event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.OPEN_EDITOR, EDITOR_TYPE.PREVIEWER);
  }, []);

  if (!value || column.type !== CellType.FILE_NAME) return null;

  return (
    <>
      <IconBtn id={'sf-metadata-cell-open-file-btn'} className="sf-metadata-cell-operation-btn" size={20} iconName="open-file" onClick={openFile} />
      <UncontrolledTooltip
        hideArrow
        target={'sf-metadata-cell-open-file-btn'}
        placement="bottom"
        fade={false}
        delay={{ show: 0, hide: 0 }}
        modifiers={{ preventOverflow: { boundariesElement: document.body } }}
      >
        {isDir ? gettext('Open folder') : gettext('Open file')}
      </UncontrolledTooltip>
    </>
  );
};

CellOperationBtn.propTypes = {
  isDir: PropTypes.bool,
  column: PropTypes.object,
  value: PropTypes.any,
};

export default CellOperationBtn;
