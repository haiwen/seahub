import React from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import { IconBtn } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../../../../../utils/constants';
import { EVENT_BUS_TYPE as METADATA_EVENT_BUS_TYPE, EDITOR_TYPE } from '../../../../../../../constants';
import { openFile } from '../../../../../../../utils/open-file';

import './index.css';

const CellOperationBtn = ({ isDir, column, record, cellValue, ...props }) => {

  const handelClick = (event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    openFile(record, window.sfMetadataContext.eventBus, () => {
      window.sfMetadataContext.eventBus.dispatch(METADATA_EVENT_BUS_TYPE.OPEN_EDITOR, EDITOR_TYPE.PREVIEWER);
    });
  };

  if (!cellValue) return null;

  return (
    <>
      <IconBtn id={'sf-metadata-cell-open-file-btn'} className="sf-metadata-cell-operation-btn" size={20} iconName="open-file" onClick={handelClick} />
      <UncontrolledTooltip
        hideArrow
        target={'sf-metadata-cell-open-file-btn'}
        placement="bottom"
        fade={false}
        delay={{ show: 0, hide: 0 }}
        modifiers={{ preventOverflow: { boundariesElement: document.body } }}
        className="sf-metadata-tooltip"
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
