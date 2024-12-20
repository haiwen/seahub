import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';
import FolderRecords from './folder-records';
import FileRecords from './file-records';

const Table = ({ repoID, renderFolder, data }) => {
  const [containerWidth, setContainerWidth] = useState(0);

  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const handleResize = () => {
      if (!container) return;
      setContainerWidth(container.offsetWidth);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    container && resizeObserver.observe(container);

    return () => {
      container && resizeObserver.unobserve(container);
    };
  }, []);

  const { items, showFolder, commitID, baseDir, folderPath, folderItems } = data;

  return (
    <div className="table-container p-0" ref={containerRef}>
      <table className="table-hover">
        <thead>
          <tr>
            <th style={{ width: 40 }} className="pl-2 pr-2">{/* icon */}</th>
            <th style={{ width: (containerWidth - 40) * 0.25 }}>{gettext('Name')}</th>
            <th style={{ width: (containerWidth - 40) * 0.4 }}>{gettext('Original path')}</th>
            <th style={{ width: (containerWidth - 40) * 0.12 }}>{gettext('Delete Time')}</th>
            <th style={{ width: (containerWidth - 40) * 0.13 }}>{gettext('Size')}</th>
            <th style={{ width: (containerWidth - 40) * 0.1 }}>{/* op */}</th>
          </tr>
        </thead>
        <tbody>
          {showFolder ? (
            <FolderRecords records={folderItems} repoID={repoID} commitID={commitID} baseDir={baseDir} folderPath={folderPath} renderFolder={renderFolder} />
          ) : (
            <FileRecords records={items} repoID={repoID} renderFolder={renderFolder} />
          )}
        </tbody>
      </table>
    </div>
  );
};

Table.propTypes = {
  repoID: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
  renderFolder: PropTypes.func.isRequired,
};

export default Table;
