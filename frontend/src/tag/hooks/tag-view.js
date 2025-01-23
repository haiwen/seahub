import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Utils } from '../../utils/utils';
import tagsAPI from '../api';
import { useTags } from './tags';
import { getTreeNodeByKey } from '../../components/sf-table/utils/tree';
import { getAllChildTagsIdsFromNode } from '../utils/tree';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes, views data, etc.
const TagViewContext = React.createContext(null);

export const TagViewProvider = ({ repoID, tagID, nodeKey, children, ...params }) => {
  const [isLoading, setLoading] = useState(true);
  const [tagFiles, setTagFiles] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const { tagsData } = useTags();

  const getChildTagsIds = useCallback((nodeKey) => {
    if (!nodeKey) return [];
    const displayNode = getTreeNodeByKey(nodeKey, tagsData.key_tree_node_map);
    return getAllChildTagsIdsFromNode(displayNode);
  }, [tagsData]);

  useEffect(() => {
    setLoading(true);
    const childTagsIds = getChildTagsIds(nodeKey);
    let tagsIds = [tagID];
    if (Array.isArray(childTagsIds) && childTagsIds.length > 0) {
      tagsIds.push(...childTagsIds);
    }
    tagsAPI.getTagsFiles(repoID, tagsIds).then(res => {
      const rows = res.data?.results || [];
      setTagFiles({ columns: res.data?.metadata || [], rows });
      setLoading(false);
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error);
      setErrorMessage(errorMessage);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, tagID, nodeKey]);

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
