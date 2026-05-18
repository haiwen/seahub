import React, { useRef, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import VirtualList from '../virtual-list/virtual-list';
import DirentListItem from './dirent-list-item';
import { useCollaborators } from '../../metadata';
import { useTags } from '@/tag/hooks';
import { Utils } from '@/utils/utils';

import './dirent-virtual-list.css';

const DirentItemWrapper = ({
  dirent,
  path,
  repoID,
  registerExecuteOperation,
  unregisterExecuteOperation,
  columns,
  tagsData,
  ...itemProps
}) => {
  const childRef = useRef(null);

  useEffect(() => {
    if (childRef.current) {
      registerExecuteOperation(dirent.name, childRef.current);
    }

    return () => {
      unregisterExecuteOperation(dirent.name);
    };
  }, [dirent.name, registerExecuteOperation, unregisterExecuteOperation]);

  return (
    <DirentListItem
      ref={childRef}
      dirent={dirent}
      path={path}
      repoID={repoID}
      columns={columns}
      tagsData={tagsData}
      {...itemProps}
    />
  );
};

const DirentVirtualListView = ({
  headers,
  items,
  itemHeight = 42,
  overscan = 5,
  registerExecuteOperation,
  unregisterExecuteOperation,
  columns,
  repoID,
  path,
  ...itemProps
}) => {
  const { tagsData } = useTags();

  const scrollContainerRef = useRef(null);
  const headerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const gridStyle = useMemo(() => {
    if (!Utils.isDesktop()) return undefined;
    const teplate = headers.map(header => {
      const { key, width } = header;
      if (key === 'name') {
        return `minmax(${width}px, 1fr)`;
      }
      return `${width}px`;
    });

    return {
      display: 'grid',
      gridTemplateColumns: teplate.join(' '),
    };
  }, [headers]);

  const { collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser } = useCollaborators();

  const handleScroll = (e) => {
    const { scrollTop: st, scrollLeft } = e.target;

    setScrollTop(st);

    if (headerRef.current) {
      headerRef.current.scrollLeft = scrollLeft;
    }
  };

  return (
    <div className="dirent-virtual-list-view">
      <div
        ref={scrollContainerRef}
        className="dirent-virtual-scroll-container"
        onScroll={handleScroll}
      >
        {Utils.isDesktop() && (
          <div
            ref={headerRef}
            className="dirent-virtual-list-header"
            style={gridStyle}
          >
            {headers.map((header, index) => {
              const { className: headerClassName, children } = header;
              return (
                <div
                  key={index}
                  className={`dirent-virtual-list-header-cell ${headerClassName || ''}`}
                >
                  {children}
                </div>
              );
            })}
          </div>
        )}

        <div className="dirent-virtual-list-body">
          <VirtualList
            items={items}
            itemHeight={itemHeight}
            overscan={overscan}
            scrollTop={scrollTop}
            scrollContainerRef={scrollContainerRef}
            renderItem={({ item }) => (
              <DirentItemWrapper
                key={item.name}
                dirent={item}
                path={path}
                repoID={repoID}
                registerExecuteOperation={registerExecuteOperation}
                unregisterExecuteOperation={unregisterExecuteOperation}
                collaborators={collaborators}
                collaboratorsCache={collaboratorsCache}
                updateCollaboratorsCache={updateCollaboratorsCache}
                queryUser={queryUser}
                columns={columns}
                tagsData={tagsData}
                gridStyle={gridStyle}
                {...itemProps}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
};

DirentVirtualListView.propTypes = {
  headers: PropTypes.array.isRequired,
  items: PropTypes.array.isRequired,
  itemHeight: PropTypes.number,
  overscan: PropTypes.number,
  onColumnDataModified: PropTypes.func,
};

export default DirentVirtualListView;
