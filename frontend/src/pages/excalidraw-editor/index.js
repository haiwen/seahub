import React, { useCallback, useState, useEffect, useRef } from 'react';
import SimpleEditor from './editor';
import { gettext } from '../../utils/constants';
import toaster from '../../components/toast';
import { SAVE_INTERVAL_TIME } from './constants';
import { updateAppIcon } from './utils/common-utils';
import context from './context';

import './index.css';

const ExcaliEditor = () => {
  const editorRef = useRef(null);
  const isChangedRef = useRef(false);
  const [isFetching, setIsFetching] = useState(true);
  const [fileContent, setFileContent] = useState(null);

  // saved file interval
  useEffect(() => {
    updateAppIcon();
    const saveInterval = setInterval(() => {
      if (isChangedRef.current) {
        context.saveSceneContent(JSON.stringify(editorRef.current)).then(res => {
          isChangedRef.current = false;
        });
      }
    }, SAVE_INTERVAL_TIME);

    return () => {
      clearInterval(saveInterval);
    };
  }, []);

  // tips before refresh current page
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isChangedRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    async function loadFileContent() {
      await context.initSettings();
      context.getSceneContent().then(res => {
        setFileContent(res.data);
        setIsFetching(false);
      });
    }
    loadFileContent();
  }, []);

  const saveSceneContent = useCallback(async () => {
    if (isChangedRef.current) {
      context.saveSceneContent(JSON.stringify(editorRef.current)).then(res => {
        isChangedRef.current = false;
        toaster.success(gettext('Successfully saved'), { duration: 2 });
      }).catch(error => {
        toaster.danger(gettext('Failed to save'), { duration: 2 });
      });
    }
  }, []);

  const onChangeContent = useCallback((elements) => {
    editorRef.current = { elements };
    isChangedRef.current = true;
  }, []);

  return (
    <div className="file-view-content flex-1 p-0 border-0">
      <SimpleEditor
        isFetching={isFetching}
        sceneContent={fileContent}
        onSaveContent={saveSceneContent}
        onChangeContent={onChangeContent}
      />
    </div>
  );
};

export default ExcaliEditor;
