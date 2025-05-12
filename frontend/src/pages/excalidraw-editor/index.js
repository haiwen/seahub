import React, { useCallback, useState, useEffect, useRef } from 'react';
import SimpleEditor from './simple-editor';
import editorApi from './editor-api';
import isHotkey from 'is-hotkey';
import { gettext } from '../../utils/constants';
import toaster from '../../components/toast';
import { SAVE_INTERVAL_TIME } from './constants';
import { Utils } from '../../utils/utils';
import ExdrawServerApi from './collab/exdraw-server-api';
import { io } from 'socket.io-client';

import './index.css';

const { docUuid, excalidrawServerUrl, username } = window.app.pageOptions;

const ExcaliEditor = () => {
  const [fileContent, setFileContent] = useState(null);
  const editorRef = useRef(null);
  const isChangedRef = useRef(false);
  const [isFetching, setIsFetching] = useState(true);
  const exdrawServerConfigRef = useRef({
    exdrawServer: '',
    exdrawUuid: '',
    accessToken: ''
  });
  const exdrawClientConfigRef = useRef({
    excalidrawServerUrl,
    username
  });
  const exdrawClientRef = useRef(null);

  useEffect(() => {
    editorApi.getExdrawToken().then(res => {
      exdrawServerConfigRef.current = {
        exdrawServer: excalidrawServerUrl,
        exdrawUuid: docUuid,
        accessToken: res
      };
      const exdrawServerApi = new ExdrawServerApi(exdrawServerConfigRef.current);
      exdrawServerApi.getSceneContent().then(res => {
        setFileContent(res.data);
        setIsFetching(false);
      });
      exdrawClientRef.current = ExdrawClient(exdrawClientConfigRef.current);
    });
    onSetFavicon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSceneContent = useCallback(async () => {
    if (isChangedRef.current) {
      try {
        const exdrawServerApi = new ExdrawServerApi(exdrawServerConfigRef.current);
        // socket emit event
        await exdrawServerApi.saveSceneContent(JSON.stringify(editorRef.current));
        exdrawClientRef.current.emit('update-document', JSON.stringify(editorRef.current));
        isChangedRef.current = false;
        toaster.success(gettext('Successfully saved'), { duration: 2 });
      } catch {
        toaster.danger(gettext('Failed to save'), { duration: 2 });
      }
    }
  }, []);

  useEffect(() => {
    const handleHotkeySave = (event) => {
      if (isHotkey('mod+s', event)) {
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleHotkeySave, true);
    return () => {
      document.removeEventListener('keydown', handleHotkeySave, true);
    };
  }, [saveSceneContent]);

  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (isChangedRef.current) {
        editorApi.saveContent(JSON.stringify(editorRef.current)).then(res => {
          isChangedRef.current = false;
        });
      }
    }, SAVE_INTERVAL_TIME);

    const handleBeforeUnload = (event) => {
      if (isChangedRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(saveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveSceneContent]);

  const onSaveContent = useCallback(() => {
    saveSceneContent();
  }, [saveSceneContent]);

  const onChangeContent = useCallback((elements) => {
    editorRef.current = elements;
    // socket emit event
    exdrawClientRef.current.emit('update-document', JSON.stringify(editorRef.current));
    isChangedRef.current = true;
  }, []);

  const onSetFavicon = useCallback(() => {
    const { docName } = window.app.pageOptions;
    const fileIcon = Utils.getFileIconUrl(docName);
    document.getElementById('favicon').href = fileIcon;
  }, []);

  const ExdrawClient = useCallback((options) => {
    const socket = io(options.excalidrawServerUrl + '/exdraw');
    socket.on('connect', () => {
      const name = options.username;
      const userInfo = { name };
      socket.emit('join-room', userInfo);
    });

    socket.on('join-room', (userInfo) => {
      console.log('join-room', userInfo);
    });

    socket.on('update-document', function (msg) {
      setFileContent(JSON.parse(msg.msg));
    });

    return socket;
  }, []);

  return (
    <SimpleEditor
      exdrawClient={exdrawClientRef.current}
      isFetching={isFetching}
      sceneContent={fileContent}
      onSaveContent={onSaveContent}
      onChangeContent={onChangeContent}
    />
  );
};

export default ExcaliEditor;
