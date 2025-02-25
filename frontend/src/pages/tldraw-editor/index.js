import React, { useCallback, useState, useEffect, useRef } from 'react';
import { SimpleEditor } from '@seafile/stldraw-editor';
import isHotkey from 'is-hotkey';
import editorApi from './editor-api';
import { gettext } from '../../utils/constants';
import toaster from '../../components/toast';
import { SAVE_INTERVAL_TIME } from './constants';
import { Utils } from '../../utils/utils';

import './index.css';

const TldrawEditor = () => {
  const editorRef = useRef(null);
  const isChangedRef = useRef(false);
  const [fileContent, setFileContent] = useState({});
  const [isFetching, setIsFetching] = useState(true);

  // 根据不同的文件名，获取不同的 favacion，然后设置到页面
  const onSetFavicon = useCallback((suffix) => {
    let { docName } = window.app.pageOptions;
    const fileIcon = Utils.getFileIconUrl(docName);
    document.getElementById('favicon').href = fileIcon;
  }, []);

  // 获取文件内容，更新 favicon
  useEffect(() => {
    editorApi.getFileContent().then(res => {
      setFileContent(res.data);
      setIsFetching(false);
    });
    onSetFavicon();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 函数：保存文档内容
  const saveDocument = useCallback(async () => {
    // 如果文档内容发生了变化
    if (isChangedRef.current) {
      try {
        // 调用 API 保存，并设置保存 = false
        await editorApi.saveContent(JSON.stringify(editorRef.current));
        isChangedRef.current = false;
        toaster.success(gettext('Successfully saved'), { duration: 2 });
      } catch {
        toaster.danger(gettext('Failed to save'), { duration: 2 });
      }
    }
  }, []);

  // 处理保存快捷键
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

  // 保存文档内容的 interval
  useEffect(() => {
    const saveInterval = setInterval(() => {
      // 如果文档内容发生了变化
      if (isChangedRef.current) {
        // 保存文档，并设置保存 = false
        editorApi.saveContent(JSON.stringify(editorRef.current)).then(res => {
          isChangedRef.current = false;
        });
      }
    }, SAVE_INTERVAL_TIME);

    // 在浏览器窗口关闭时，保存文档
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

  // 内部内容变化后，回调函数，设置 isChanged 为 true
  const onContentChanged = useCallback((docContent) => {
    editorRef.current = docContent;
    isChangedRef.current = true;
  }, []);

  // 内部点击保存按钮，回调函数
  const onSave = useCallback(() => {
    saveDocument();
  }, [saveDocument]);

  return (
    <SimpleEditor
      isFetching={isFetching}
      document={fileContent || { document: null }}
      onContentChanged={onContentChanged}
      onSave={onSave}
    />
  );
};

export default TldrawEditor;
