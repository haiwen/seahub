import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';
import Tag from './tag';
import EmptyTip from '../../../../components/empty-tip';
import { getTagId } from '../../../utils/cell/core';
import { debounce } from '../../../../metadata/utils/common';
import { isCellValueChanged } from '../../../../metadata/utils/cell';

import './index.css';

const Main = React.memo(({ context, tags, onChangeDisplayTag }) => {
  const tableRef = useRef(null);

  useEffect(() => {
    if (!tableRef.current) return;
    const currentLocalStorage = context.localStorage;
    const lastScrollTop = currentLocalStorage.getItem('scroll_top') || 0;
    if (lastScrollTop) {
      tableRef.current.scrollTop = Number(lastScrollTop);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handelScroll = debounce(() => {
    const currentLocalStorage = context.localStorage;
    const currentScrollTop = tableRef.current.scrollTop || 0;
    currentLocalStorage.setItem('scroll_top', currentScrollTop);
  }, 200);

  if (tags.length === 0) {
    return (
      <div className="w-100 h-100 d-flex align-items-center justify-content-center">
        <EmptyTip text={gettext('No tags')} />
      </div>
    );
  }

  return (
    <div className="sf-metadata-tags-table" ref={tableRef} onScroll={handelScroll}>
      <div className="sf-metadata-tags-table-header sf-metadata-tags-table-row">
        <div className="sf-metadata-tags-table-cell">{gettext('Tag')}</div>
        <div className="sf-metadata-tags-table-cell">{gettext('File count')}</div>
        <div className="sf-metadata-tags-table-cell"></div>
      </div>
      {tags.map(tag => {
        const id = getTagId(tag);
        return (<Tag tag={tag} context={context} tags={tags} key={id} onChangeDisplayTag={onChangeDisplayTag} />);
      })}
    </div>
  );
}, (props, nextProps) => {
  return !isCellValueChanged(props.tags, nextProps.tags);
});

Main.propTypes = {
  context: PropTypes.object,
  tags: PropTypes.array,
  onChangeDisplayTag: PropTypes.func,
};

export default Main;
