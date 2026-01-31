import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SimpleEditor } from '@seafile/seafile-sdoc-editor';
import ExternalOperations from './external-operations';
import { seafileAPI } from '../../../utils/seafile-api';
import Dirent from '../../../models/dirent';
import { Utils } from '../../../utils/utils';
import { useCollaborators } from '../../../metadata';
import EmbeddedFileDetails from '../../../components/dirent-detail/embedded-file-details';
import { mediaUrl } from '../../../utils/constants';
import { useMetadataStatus } from '../../../hooks';

import './index.css';

const SdocEditor = () => {
  const [isStarred, setStarted] = useState(window.app.pageOptions.isStarred);
  const [isDraft] = useState(window.app.pageOptions.isSdocDraft);
  const [direntList, setDirentList] = useState([]);
  const [currentDirent, setCurrentDirent] = useState(null);
  const { collaborators } = useCollaborators();
  const { enableMetadata } = useMetadataStatus();
  const plugins = useMemo(() => {
    const { repoID, docPath, docPerm, isRepoAdmin } = window.seafile;
    return [
      {
        name: 'sdoc-info',
        icon: 'sdoc-info',
        resizable_width: true,
        display_type: 'right-panel',
        component: ({ onClose, width }) => {
          return (
            <EmbeddedFileDetails
              repoID={repoID}
              path={docPath}
              dirent={currentDirent}
              repoInfo={{ permission: docPerm, is_admin: isRepoAdmin }}
              width={width - 1}
              component={{
                headerComponent: {
                  closeIcon: (<i className="sdocfont sdoc-sm-close"></i>)
                }
              }}
              onClose={onClose}
            />
          );
        },
      }
    ];
  }, [currentDirent]);

  const dirPath = useMemo(() => {
    const { docPath } = window.seafile;
    const index = docPath.lastIndexOf('/');
    if (index) {
      return docPath.slice(0, index);
    }
    return '/';
  }, []);

  const onSetFavicon = useCallback((suffix) => {
    let { docName } = window.seafile;
    if (suffix) {
      docName = docName + suffix;
    }
    const fileIcon = Utils.getFileIconUrl(docName);
    document.getElementById('favicon').href = fileIcon;
  }, []);

  const toggleStar = (isStarred) => {
    setStarted(isStarred);
  };

  const onNewNotification = useCallback(() => {
    onSetFavicon('_notification');
  }, [onSetFavicon]);

  const onClearNotification = useCallback(() => {
    onSetFavicon();
  }, [onSetFavicon]);

  const getDirentList = () => {
    const { repoID, docPath } = window.seafile;
    seafileAPI.listDir(repoID, dirPath, { 'with_thumbnail': true }).then(res => {
      let direntList = [];
      res.data.dirent_list.forEach(item => {
        const dirent = new Dirent(item);
        if (Utils.joinPath(item.parent_dir, item.name) === docPath) {
          setCurrentDirent(dirent);
        }
        direntList.push(dirent);
      });
      setDirentList(direntList);
    }).catch((err) => {
      Utils.getErrorMsg(err, true);
    });
  };

  useEffect(() => {
    onSetFavicon();
    getDirentList();
    window.seafile = { ...window.seafile, enableMetadata };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { repoID, docPath, docName, docPerm } = window.seafile;
  return (
    <>
      <SimpleEditor isStarred={isStarred} isDraft={isDraft} plugins={plugins} collaborators={collaborators} showComment={true} mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'} />
      <ExternalOperations
        repoID={repoID}
        docPath={docPath}
        docName={docName}
        docPerm={docPerm}
        isStarred={isStarred}
        direntList={direntList}
        dirPath={dirPath}
        toggleStar={toggleStar}
        onNewNotification={onNewNotification}
        onClearNotification={onClearNotification}
      />
    </>
  );
};

export default SdocEditor;
