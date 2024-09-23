import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import { IconBtn } from '@seafile/sf-metadata-ui-component';
import { Utils } from '../../../../../../../../utils/utils';
import { gettext, siteRoot } from '../../../../../../../../utils/constants';
import { EVENT_BUS_TYPE } from '../../../../../../../..//components/common/event-bus-type';
import { EVENT_BUS_TYPE as METADATA_EVENT_BUS_TYPE, EDITOR_TYPE } from '../../../../../../../constants';
import { getFileNameFromRecord, getParentDirFromRecord } from '../../../../../../../utils/cell';
import { checkIsDir } from '../../../../../../../utils/row';

import './index.css';

const FILE_TYPE = {
  FOLDER: 'folder',
  MARKDOWN: 'markdown',
  SDOC: 'sdoc',
  IMAGE: 'image',
};

const CellOperationBtn = ({ isDir, column, record, cellValue, ...props }) => {

  const fileName = useMemo(() => {
    const { key } = column;
    return record[key];
  }, [column, record]);

  const fileType = useMemo(() => {
    if (checkIsDir(record)) return FILE_TYPE.FOLDER;
    if (!fileName) return '';
    const index = fileName.lastIndexOf('.');
    if (index === -1) return '';
    const suffix = fileName.slice(index).toLowerCase();
    if (suffix.indexOf(' ') > -1) return '';
    if (Utils.imageCheck(fileName)) return FILE_TYPE.IMAGE;
    if (Utils.isMarkdownFile(fileName)) return FILE_TYPE.MARKDOWN;
    if (Utils.isSdocFile(fileName)) return FILE_TYPE.SDOC;
    return '';
  }, [record, fileName]);

  const getParentDir = () => {
    const parentDir = getParentDirFromRecord(record);
    if (parentDir === '/') {
      return '';
    }
    return parentDir;
  };

  const generateUrl = () => {
    const repoID = window.sfMetadataContext.getSetting('repoID');
    const parentDir = getParentDir();
    const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
    return `${siteRoot}lib/${repoID}/file${path}`;
  };

  const openUrl = (url) => {
    window.open(url);
  };

  const openMarkdown = () => {
    const fileName = getFileNameFromRecord(record);
    const parentDir = getParentDirFromRecord(record);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.OPEN_MARKDOWN_DIALOG, parentDir, fileName);
  };

  const openByNewWindow = (fileType) => {
    if (!fileType) {
      const url = generateUrl();
      openUrl(url);
    } else {
      const parentDir = getParentDir();
      let pathname = window.location.pathname;
      if (pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      openUrl(window.location.origin + pathname + Utils.encodePath(Utils.joinPath(parentDir, fileName)));
    }
  };

  const openSdoc = () => {
    const url = generateUrl();
    openUrl(url);
  };

  const openOthers = () => {
    openByNewWindow(fileType);
  };

  const openFile = (event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();

    switch (fileType) {
      case FILE_TYPE.MARKDOWN: {
        openMarkdown();
        break;
      }
      case FILE_TYPE.SDOC: {
        openSdoc();
        break;
      }
      case FILE_TYPE.IMAGE: {
        // render image previewer via FileNameEditor
        window.sfMetadataContext.eventBus.dispatch(METADATA_EVENT_BUS_TYPE.OPEN_EDITOR, EDITOR_TYPE.PREVIEWER);
        break;
      }
      default: {
        openOthers();
        break;
      }
    }
  };

  if (!cellValue) return null;

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
