import React, { useCallback, useState, useEffect, useRef } from 'react';
import { SimpleEditor } from '@seafile/stldraw-editor';
import isHotkey from 'is-hotkey';
import editorApi from './editor-api';
import { gettext } from '../../utils/constants';
import toaster from '../../components/toast';
import { SAVE_INTERVAL_TIME } from './constants';

const TldrawEditor = () => {
  const editorRef = useRef(null);
  const isChangedRef = useRef(false);
  const [fileContent, setFileContent] = useState({});
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    editorApi.getFileContent().then(res => {
      setFileContent(res.data);
      setIsFetching(false);
    });
  }, []);

  const saveDocument = useCallback(async () => {
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
      if (isHotkey('mod+s')(event)) {
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleHotkeySave);
    return () => {
      document.removeEventListener('keydown', handleHotkeySave);
    };
  }, [saveDocument]);

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
  }, [saveDocument]);

  const onContentChanged = useCallback((docContent) => {
    editorRef.current = docContent;
    isChangedRef.current = true;
  }, []);

  const onSave = useCallback(() => {
    saveDocument();
  }, [saveDocument]);

  return (
    <SimpleEditor
      isFetching={isFetching}
      document={fileContent}
      onContentChanged={onContentChanged}
      onSave={onSave}
    />
  );
};

export default TldrawEditor;
