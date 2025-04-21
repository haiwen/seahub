import React, { useCallback, useState, useEffect, useRef } from 'react';
import SimpleEditor from './simple-editor';
import editorApi from './editor-api';
import isHotkey from 'is-hotkey';
import { gettext } from '../../utils/constants';
import toaster from '../../components/toast';
import { SAVE_INTERVAL_TIME } from './constants';
import { Utils } from '../../utils/utils';

import './index.css';

const ExcaliEditor = () => {
  const [fileContent, setFileContent] = useState(null);
  const editorRef = useRef(null);
  const isChangedRef = useRef(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    editorApi.getFileContent().then(res => {
      if (res.data?.appState?.collaborators && !Array.isArray(res.data.appState.collaborators)) {
        // collaborators.forEach is not a function
        res.data['appState']['collaborators'] = [];
      }
      setFileContent(res.data);
      setIsFetching(false);
    });
    onSetFavicon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSceneContent = useCallback(async () => {
    if (isChangedRef.current) {
      try {
        await editorApi.saveContent(JSON.stringify(editorRef.current));
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
    editorRef.current = { elements };
    isChangedRef.current = true;
  }, []);

  const onSetFavicon = useCallback(() => {
    const { docName } = window.app.pageOptions;
    const fileIcon = Utils.getFileIconUrl(docName);
    document.getElementById('favicon').href = fileIcon;
  }, []);

  return (
    <SimpleEditor
      isFetching={isFetching}
      sceneContent={fileContent}
      onSaveContent={onSaveContent}
      onChangeContent={onChangeContent}
    />
  );
};

export default ExcaliEditor;
