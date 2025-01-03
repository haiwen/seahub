import React, { Fragment, useCallback, useState, useEffect, useRef } from 'react';
import SimpleEditor from '@seafile/stldraw-editor';
import editorApi from './tldraw-editor-api';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import toaster from '../../components/toast';
import HotkeySave from '../../components/tldraw-menu/tldraw-save';
import { saveIntervalTime } from './constants';

const TldrawEditor = () => {
  const editorRef = useRef();
  const [tldrawDoc, setTldrawDoc] = useState();

  const saveDocument = useCallback(async () => {
    if (!editorRef.current) return;
    const document = editorRef.current.saveTldrawDoc();
    try {
      await editorApi.saveContent(JSON.stringify(document));
      toaster.success(gettext('Successfully saved'), { duration: 2 });
    } catch {
      toaster.danger(gettext('Failed to save'), { duration: 2 });
    }
  }, []);

  useEffect(() => {
    const saveInterval = setInterval(() => {
      saveDocument();
    }, saveIntervalTime);

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
      saveDocument();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(saveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveDocument]);

  useEffect(() => {
    const fetchTldrawDoc = async () => {
      try {
        const { rawPath } = window.app.pageOptions;
        const fileContentRes = await seafileAPI.getFileContent(rawPath);
        const tldrawContent = fileContentRes.data || null;
        if (tldrawContent) {
          setTldrawDoc(tldrawContent);
        } else {
          setTldrawDoc(null);
        }
      } catch (error) {
        setTldrawDoc(null);
      }
    };

    fetchTldrawDoc();
  }, []);

  return (
    <Fragment>
      <SimpleEditor ref={editorRef} initialDocument={tldrawDoc} />
      <HotkeySave onSave={saveDocument} />
    </Fragment>
  );
};

export default TldrawEditor;
