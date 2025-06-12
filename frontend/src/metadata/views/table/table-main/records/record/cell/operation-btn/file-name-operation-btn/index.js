import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import IconBtn from '../../../../../../../../../components/icon-btn';
import { gettext } from '../../../../../../../../../utils/constants';
import { EVENT_BUS_TYPE as METADATA_EVENT_BUS_TYPE, EDITOR_TYPE } from '../../../../../../../../constants';
import { checkIsDir } from '../../../../../../../../utils/row';
import { openFile } from '../../../../../../../../utils/file';

import './index.css';

const FileNameOperationBtn = ({ column, record, ...props }) => {

  const fileName = useMemo(() => {
    const { key } = column;
    return record[key];
  }, [column, record]);

  const isDir = useMemo(() => checkIsDir(record), [record]);

  const handleClick = (event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    const repoID = window.sfMetadataContext.getSetting('repoID');
    const canPreview = window.sfMetadataContext.canPreview();
    if (!canPreview) return;
    openFile(repoID, record, () => {
      window.sfMetadataContext.eventBus.dispatch(METADATA_EVENT_BUS_TYPE.OPEN_EDITOR, EDITOR_TYPE.PREVIEWER);
    });
  };

  if (!fileName) return null;

  return (
    <>
      <IconBtn id="sf-metadata-cell-open-file-btn" className="sf-metadata-cell-operation-btn" size={20} symbol="open-file" onClick={handleClick} />
      <UncontrolledTooltip
        hideArrow
        target="sf-metadata-cell-open-file-btn"
        placement="bottom"
        fade={false}
        delay={{ show: 0, hide: 0 }}
        modifiers={[{ name: 'preventOverflow', options: { boundary: document.body } }]}
        className="sf-metadata-tooltip"
      >
        {isDir ? gettext('Open folder') : gettext('Open file')}
      </UncontrolledTooltip>
    </>
  );
};

FileNameOperationBtn.propTypes = {
  column: PropTypes.object,
  record: PropTypes.object,
};

export default FileNameOperationBtn;
