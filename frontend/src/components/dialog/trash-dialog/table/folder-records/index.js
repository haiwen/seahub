import React from 'react';
import PropTypes from 'prop-types';
import FolderRecord from './folder-record';

const FolderRecords = ({ records, repoID, commitID, baseDir, folderPath, renderFolder, isDesktop }) => {
  if (!Array.isArray(records) || records.length === 0) return null;
  return records.map((record, index) => {
    return (
      <FolderRecord
        key={index}
        record={record}
        repoID={repoID}
        commitID={commitID}
        baseDir={baseDir}
        folderPath={folderPath}
        renderFolder={renderFolder}
        isDesktop={isDesktop}
      />
    );
  });
};

FolderRecords.propTypes = {
  records: PropTypes.array,
};

export default FolderRecords;
