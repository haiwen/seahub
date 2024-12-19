import React, { useContext, useEffect, useState } from 'react';
import { Utils } from '../../utils/utils';
import tagsAPI from '../api';
import { useTags } from './tags';
import { PRIVATE_COLUMN_KEY } from '../constants';
import { getRecordIdFromRecord } from '../../metadata/utils/cell';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes, views data, etc.
const TagViewContext = React.createContext(null);

export const TagViewProvider = ({ repoID, tagID, children, ...params }) => {
  const [isLoading, setLoading] = useState(true);
  const [tagFiles, setTagFiles] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const { updateLocalTag } = useTags();

  useEffect(() => {
    setLoading(true);
    tagsAPI.getTagFiles(repoID, tagID).then(res => {
      const rows = res.data?.results || [];
      setTagFiles({ columns: res.data?.metadata || [], rows: res.data?.results || [] });
      updateLocalTag(tagID, {
        [PRIVATE_COLUMN_KEY.TAG_FILE_LINKS]: rows.map(r => {
          const recordId = getRecordIdFromRecord(r);
          return {
            row_id: recordId,
            display_value: recordId
          };
        })
      });
      setLoading(false);
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error);
      setErrorMessage(errorMessage);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, tagID]);

  return (
    <TagViewContext.Provider value={{
      isLoading,
      errorMessage,
      tagFiles,
      repoID,
      tagID,
      repoInfo: params.repoInfo,
      deleteFilesCallback: params.deleteFilesCallback,
      renameFileCallback: params.renameFileCallback,
      updateCurrentDirent: params.updateCurrentDirent,
    }}>
      {children}
    </TagViewContext.Provider>
  );
};

export const useTagView = () => {
  const context = useContext(TagViewContext);
  if (!context) {
    throw new Error('\'TagViewContext\' is null');
  }
  return context;
};
