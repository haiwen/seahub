import React, { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import isHotkey from 'is-hotkey';
import PropTypes from 'prop-types';
import { processorWithMath } from '@seafile/seafile-editor';
import SeafileCodeMirror from './code-mirror';
import HeaderToolbar from '../markdown-editor/header-toolbar/header-toolbar';
import editorApi from '../markdown-editor/editor-api';
import { getPlainOptions } from './helper';
import { gettext } from '../../utils/constants';
import toaster from '../../components/toast';
import CodeMirrorLoading from '../../components/code-mirror-loading';

import './style.css';
import '../markdown-editor/css/markdown-editor.css';

const propTypes = {
  autoFocus: PropTypes.bool,
  value: PropTypes.string,
  onSave: PropTypes.func,
  onContentChanged: PropTypes.func,
};

const { repoID, filePath, fileName, isLocked, lockedByMe } = window.app.pageOptions;
const userInfo = window.app.userInfo;

const initOptions = {
  markdownContent: '',
  loading: true,
  mode: 'editor',
  fileInfo: {
    repoID: repoID,
    name: fileName,
    path: filePath,
    mtime: null,
    size: 0,
    starred: false,
    permission: '',
    lastModifier: '',
    id: '',
  },
  editorMode: 'plain',
  showMarkdownEditorDialog: false,
  showShareLinkDialog: false,
  showInsertFileDialog: false,
  collabUsers: userInfo ? [{ user: userInfo, is_editing: false }] : [],
  value: null,
  isShowHistory: false,
  readOnly: true,
  contentChanged: false,
  saving: false,
  isLocked: isLocked,
  lockedByMe: lockedByMe,
  fileTagList: [],
  participants: [],
};

const PlainMarkdownEditor = (props) => {
  const [editorValue, setEditorValue] = useState('');
  const [previewValue, setPreviewValue] = useState('');
  const [isMouseInLeftSide, setIsMouseInLeftSide] = useState(false);
  const [isMouseInRightSide, setIsMouseInRightSide] = useState(false);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const [options, setOptions] = useState(initOptions);
  const [saving, setSaving] = useState(false);

  const setContent = useCallback((markdownContent) => {
    setEditorValue(markdownContent);
    processorWithMath.process(markdownContent, (error, vfile) => {
      var html = String(vfile);
      setPreviewValue(html);
    });
  }, []);

  const updateOptions = useCallback(async ({ fileName, filePath, repoID }) => {
    const { markdownContent, hasPermission, fileInfo } = await getPlainOptions({ fileName, filePath, repoID });
    setContent(markdownContent);
    setOptions({
      ...options,
      loading: false,
      fileInfo: { ...options.fileInfo, ...fileInfo },
      markdownContent,
      value: '',
      readOnly: !hasPermission,
    });
  }, [options, setContent]);

  useLayoutEffect(() => {
    updateOptions({ fileName, filePath, repoID });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUnload = useCallback((event) => {
    const { contentChanged } = options;
    if (!contentChanged) return;

    const confirmationMessage = gettext('Leave this page? The system may not save your changes.');
    event.returnValue = confirmationMessage;
    return confirmationMessage;
  }, [options]);

  useEffect(() => {
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [onUnload]);

  const updateCode = useCallback((newCode) => {
    setContent(String(newCode));
    !options.onContentChanged && setOptions({ ...options, contentChanged: true });
  }, [options, setContent]);

  const onEnterLeftPanel = useCallback(() => {
    setIsMouseInLeftSide(true);
    setIsMouseInRightSide(false);
  }, []);

  const onLeaveLeftPanel = useCallback(() => {
    setIsMouseInLeftSide(false);
  }, []);

  const onLeftScroll = useCallback((e) => {
    if (!isMouseInLeftSide) return;
    let srcElement = leftPanelRef.current;
    const rightPanelElm = rightPanelRef.current;
    const scrolledPercentage = srcElement.scrollTop / srcElement.scrollHeight;
    setScrollPercentage(scrolledPercentage);
    rightPanelElm.scrollTop = scrolledPercentage * rightPanelElm.scrollHeight;
  }, [isMouseInLeftSide]);

  const onEnterRightPanel = useCallback(() => {
    setIsMouseInRightSide(true);
    setIsMouseInLeftSide(false);
  }, []);

  const onLeaveRightPanel = useCallback(() => {
    setIsMouseInRightSide(false);
  }, []);

  const onRightScroll = useCallback((e) => {
    if (!isMouseInRightSide) return;
    let srcElement = rightPanelRef.current;
    const leftPanelElm = leftPanelRef.current;
    setScrollPercentage(srcElement.scrollTop / srcElement.scrollHeight);
    leftPanelElm.scrollTop = scrollPercentage * leftPanelElm.scrollHeight;
  }, [isMouseInRightSide, scrollPercentage]);

  const updateFileInfoMtime = useCallback((fileInfo) => {
    const { fileInfo: oldFileInfo } = options;
    const newFileInfo = Object.assign({}, oldFileInfo, { mtime: fileInfo.mtime, id: fileInfo.id, lastModifier: fileInfo.last_modifier_name });
    return newFileInfo;
  }, [options]);

  const onSaveEditorContent = useCallback(() => {
    setSaving(true);
    let fileInfo = options.fileInfo;

    editorApi.saveContent(editorValue).then(() => {
      editorApi.getFileInfo().then((res) => {
        fileInfo = updateFileInfoMtime(res.data);
        setOptions({
          ...options,
          fileInfo,
          contentChanged: false,
        });
        setSaving(() => false);
        const message = gettext('Successfully saved');
        toaster.success(message, { duration: 2, });
      });
    }, () => {
      setSaving(false);
      const message = gettext('Failed to save');
      toaster.danger(message, { duration: 2 });
    });
  }, [editorValue, options, setOptions, updateFileInfoMtime]);

  const onHotKey = useCallback((event) => {
    if (isHotkey('mod+s', event)) {
      event.preventDefault();
      onSaveEditorContent(editorValue);
      return true;
    }
  }, [editorValue, onSaveEditorContent]);

  const toggleStar = useCallback(() => {
    const starred = options.fileInfo.starred;
    const newFileInfo = Object.assign({}, options.fileInfo, { starred: !starred });
    if (starred) {
      editorApi.unstarItem().then((response) => {
        setOptions({ ...options, fileInfo: newFileInfo });
      });
      return;
    }

    editorApi.starItem().then((response) => {
      setOptions({ ...options, fileInfo: newFileInfo });
    });
  }, [options]);

  const setEditorMode = useCallback(() => {
    const { origin, pathname } = window.location;
    window.location.href = origin + pathname;
  }, []);

  const ignoreCallBack = useCallback(() => void 0, []);

  if (options.loading) return <CodeMirrorLoading />;

  return (
    <>
      <HeaderToolbar
        editorApi={editorApi}
        collabUsers={options.collabUsers}
        fileInfo={options.fileInfo}
        toggleStar={toggleStar}
        openDialogs={ignoreCallBack}
        toggleShareLinkDialog={ignoreCallBack}
        onEdit={setEditorMode}
        showFileHistory={false}
        toggleHistory={ignoreCallBack}
        readOnly={options.readOnly}
        contentChanged={options.contentChanged}
        saving={saving}
        onSaveEditorContent={onSaveEditorContent}
        isLocked={options.isLocked}
        lockedByMe={options.lockedByMe}
        toggleLockFile={ignoreCallBack}
        editorMode="plain"
      />
      <div className='sf-plain-editor'>
        <div className="sf-plain-editor-main d-flex" onKeyDown={onHotKey}>
          <div
            className="sf-plain-editor-left-panel"
            ref={leftPanelRef}
            onMouseLeave={onLeaveLeftPanel}
            onMouseEnter={onEnterLeftPanel}
            onScroll={onLeftScroll}
          >
            <SeafileCodeMirror autoFocus={true} initialValue={editorValue} onChange={updateCode} />
          </div>
          <div
            className="sf-plain-editor-right-panel"
            ref={rightPanelRef}
            onMouseEnter={onEnterRightPanel}
            onMouseLeave={onLeaveRightPanel}
            onScroll={onRightScroll}
          >
            <div className="preview">
              <div className="rendered-markdown article" dangerouslySetInnerHTML={{ __html: previewValue }}></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

PlainMarkdownEditor.propTypes = propTypes;

export default PlainMarkdownEditor;

const root = createRoot(document.getElementById('root'));
root.render(<PlainMarkdownEditor />);
