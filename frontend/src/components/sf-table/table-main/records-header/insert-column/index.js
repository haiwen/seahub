import React, { useCallback, useEffect, useMemo, useRef, cloneElement } from 'react';
import PropTypes from 'prop-types';
import Icon from '../../../../icon';
import { isEnter } from '../../../../../utils/hotkey';

import './index.css';

const InsertColumn = ({ lastColumn, height, groupOffsetLeft, NewColumnComponent, insertColumn: insertColumnAPI }) => {
  const id = useMemo(() => 'sf-table-add-column', []);
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

  const openPopover = useCallback(() => {
    ref?.current?.click();
  }, [ref]);

  const insertColumn = useCallback((name, type, { key, data }) => {
    insertColumnAPI(name, type, { key, data });
  }, [insertColumnAPI]);

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
      <div className="sf-table-header-cell">
        <div className="sf-table-cell column insert-column" style={style} id={id} ref={ref}>
          <Icon symbol="add-table" />
        </div>
      </div>
      {cloneElement(NewColumnComponent, { target: id, onChange: insertColumn })}
    </>
  );
};

InsertColumn.propTypes = {
  lastColumn: PropTypes.object.isRequired,
  height: PropTypes.number,
  groupOffsetLeft: PropTypes.number,
  NewColumnComponent: PropTypes.object,
  insertColumn: PropTypes.func.isRequired,
};

export default InsertColumn;
