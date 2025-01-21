import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';
import FolderRecords from './folder-records';
import FileRecords from './file-records';
import FixedWidthTable from '../../../common/fixed-width-table';

const Table = ({ repoID, renderFolder, data }) => {
  const headers = useMemo(() => [
    { isFixed: true, width: 40, className: 'pl-2 pr-2' },
    { isFixed: false, width: 0.25, children: gettext('Name') },
    { isFixed: false, width: 0.4, children: gettext('Original path') },
    { isFixed: false, width: 0.12, children: gettext('Delete Time') },
    { isFixed: false, width: 0.13, children: gettext('Size') },
    { isFixed: false, width: 0.1, children: '' },
  ], []);

  const { items, showFolder, commitID, baseDir, folderPath, folderItems } = data;

  return (
    <div className="table-container p-0">
      <FixedWidthTable className="table-hover" headers={headers}>
        {showFolder ? (
          <FolderRecords records={folderItems} repoID={repoID} commitID={commitID} baseDir={baseDir} folderPath={folderPath} renderFolder={renderFolder} />
        ) : (
          <FileRecords records={items} repoID={repoID} renderFolder={renderFolder} />
        )}
      </FixedWidthTable>
    </div>
  );
};

Table.propTypes = {
  repoID: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
  renderFolder: PropTypes.func.isRequired,
};

export default Table;
