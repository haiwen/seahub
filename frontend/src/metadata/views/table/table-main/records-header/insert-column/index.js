import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@seafile/sf-metadata-ui-component';
import ColumnPopover from '../../../../../components/popover/column-popover';
import { useMetadataView } from '../../../../../hooks/metadata-view';
import { isEnter } from '../../../../../utils/hotkey';

import './index.css';

const InsertColumn = ({ lastColumn, height, groupOffsetLeft }) => {
  const id = useMemo(() => 'sf-metadata-add-column', []);
  const ref = useRef(null);
  const style = useMemo(() => {
    return {
      height: height,
      width: 44,
      minWidth: 44,
      maxWidth: 44,
      left: lastColumn.left + lastColumn.width + groupOffsetLeft,
      position: 'absolute',
    };
  }, [lastColumn, height, groupOffsetLeft]);

  const { store } = useMetadataView();

  const openPopover = useCallback(() => {
    ref?.current?.click();
  }, [ref]);

  const insertColumn = useCallback((name, type, { key, data }) => {
    store.insertColumn(name, type, { key, data });
  }, [store]);

  const onHotKey = useCallback((event) => {
    if (isEnter(event) && document.activeElement && document.activeElement.id === id) {
      openPopover();
    }
  }, [id, openPopover]);

  useEffect(() => {
    document.addEventListener('keydown', onHotKey);
    return () => {
      document.removeEventListener('keydown', onHotKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="sf-metadata-record-header-cell">
        <div className="sf-metadata-result-table-cell column insert-column" style={style} id={id} ref={ref}>
          <Icon iconName="add-table" />
        </div>
      </div>
      <ColumnPopover target={id} onChange={insertColumn} />
    </>
  );
};

InsertColumn.propTypes = {
  lastColumn: PropTypes.object.isRequired,
  height: PropTypes.number,
  groupOffsetLeft: PropTypes.number,
};

export default InsertColumn;
