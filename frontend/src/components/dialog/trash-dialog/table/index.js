import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';
import FolderRecords from './folder-records';
import FileRecords from './file-records';
import FixedWidthTable from '../../../common/fixed-width-table';
import LibsMobileThead from '../../../../components/libs-mobile-thead';

const Table = ({ repoID, renderFolder, data, isDesktop }) => {
  const headers = useMemo(() => [
    { isFixed: true, width: 40, className: 'pl-2 pr-2' },
    { isFixed: false, width: 0.25, children: gettext('Name') },
    { isFixed: false, width: 0.4, children: gettext('Original path') },
    { isFixed: false, width: 0.12, children: gettext('Deleted time') },
    { isFixed: false, width: 0.13, children: gettext('Size') },
    { isFixed: false, width: 0.1, children: '' },
  ], []);

  const { items, showFolder, commitID, baseDir, folderPath, folderItems } = data;

  const tbodyContent = (
    <>
      {showFolder ? (
        <FolderRecords records={folderItems} repoID={repoID} commitID={commitID} baseDir={baseDir} folderPath={folderPath} renderFolder={renderFolder} isDesktop={isDesktop} />
      ) : (
        <FileRecords records={items} repoID={repoID} renderFolder={renderFolder} isDesktop={isDesktop} />
      )}
    </>
  );

  return (
    <div className="table-container p-0">
      {isDesktop
        ? (
          <FixedWidthTable className="table-hover" headers={headers}>
            {tbodyContent}
          </FixedWidthTable>
        )
        : (
          <table className="table-thead-hidden">
            <LibsMobileThead />
            <tbody>
              {tbodyContent}
            </tbody>
          </table>
        )
      }
    </div>
  );
};

Table.propTypes = {
  repoID: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
  renderFolder: PropTypes.func.isRequired,
};

export default Table;
