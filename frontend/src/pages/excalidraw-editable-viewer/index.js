import React, { useCallback, useEffect, useRef, useState } from 'react';
import context from '../excalidraw-editor/context';
import SimpleEditor from '../excalidraw-editor/editor';
import SocketManager from '../excalidraw-editor/socket/socket-manager';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import Rename from './rename';

import './index.css';

const { avatarURL, serviceURL } = window.app.config;
const { repoID, filePerm, docUuid, docName, docPath, exdrawServerUrl, exdrawAccessToken, name, shareLinkUsername, sharedToken } = window.shared.pageOptions;
const userInfo = {
  name: name || '',
  username: shareLinkUsername,
  contact_email: '',
};

// used for support lib
window.name = `${docUuid}`;

window.excalidraw = {
  serviceURL,
  userInfo,
  avatarURL,
  repoID,
  filePerm,
  docUuid,
  docName,
  docPath,
  excalidrawServerUrl: exdrawServerUrl,
  accessToken: exdrawAccessToken,
  sharedToken: sharedToken,
};

context.initSettings();

const updateAppIcon = () => {
  const { docName } = window.excalidraw;
  const fileIcon = Utils.getFileIconUrl(docName);
  document.getElementById('favicon').href = fileIcon;
};

function ExcalidrawEdiableViewer() {

  const canEditNameRef = useRef(name === 'Anonymous');
  const [isEditName, setIsEditName] = useState(false);
  const [username, setUsername] = useState(userInfo.name);

  useEffect(() => {
    updateAppIcon();
  }, []);

  const onEditNameToggle = useCallback(() => {
    setIsEditName(true);
  }, []);

  const onRenameConfirm = useCallback((value) => {
    setUsername(value);
    const newUser = {
      ...userInfo,
      _username: userInfo.username,
      username: value,
      avatarURL: avatarURL,
    };
    const socketManager = SocketManager.getInstance();
    socketManager.updateUserInfo(newUser);
    setIsEditName(false);
  }, []);

  const onRenameCancel = useCallback(() => {
    setIsEditName(false);
  }, []);

  return (
    <div className="exdraw-editable-viewer-wrapper">
      <div className="exdraw-editable-viewer-header">
        <div className='doc-info'>
          <div className="doc-name">{docName}</div>
        </div>

        <div className='doc-ops'>
          <span className="collaborator-name">{gettext('Your name')}:</span>
          {!isEditName && (
            <span className="collaborator-name">{username}</span>
          )}
          {isEditName && (
            <Rename
              name={username}
              onRenameConfirm={onRenameConfirm}
              onRenameCancel={onRenameCancel}
            />
          )}
          {canEditNameRef.current && (
            <i className="sdocfont sdoc-rename" onClick={onEditNameToggle}></i>
          )}
        </div>
      </div>
      <div className="exdraw-editable-viewer-content">
        <SimpleEditor isSharedView={true} />
      </div>
    </div>
  );
}

export default ExcalidrawEdiableViewer;
