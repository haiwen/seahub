import React, { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import isHotkey from 'is-hotkey';
import PropTypes from 'prop-types';
import { processor } from '@seafile/seafile-editor';
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
  // 编辑器的值
  const [editorValue, setEditorValue] = useState('');
  // 预览组件的值
  const [previewValue, setPreviewValue] = useState('');

  // 判断鼠标在左侧还是在右侧面板内（决定其他快捷键交互等）
  const [isMouseInLeftSide, setIsMouseInLeftSide] = useState(false);
  const [isMouseInRightSide, setIsMouseInRightSide] = useState(false);

  // 滚动位置（左右两个面板同步滚动）
  const [scrollPercentage, setScrollPercentage] = useState(0);

  // 获取左右两个滚动面板的 DOM，进一步获取位置信息
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);

  // 编辑器属性（包括文档信息，编辑器模式等信息）
  const [options, setOptions] = useState(initOptions);

  // 设置保存状态
  const [saving, setSaving] = useState(false);

  // 保存时，设置编辑器信息（markdown格式），以及转换成 HTML 信息
  const setContent = useCallback((markdownContent) => {
    setEditorValue(markdownContent);
    processor.process(markdownContent, (error, vfile) => {
      var html = String(vfile);
      setPreviewValue(html);
    });
  }, []);

  // 更新编辑器属性（界面初始化后，用全局变量更新具体的文档信息-获取文档信息，用户权限，文档下载链接等 API 操作，然后更新到当前状态）
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

  // 注意：useLayoutEffect 在浏览器绘制 DOM 之后执行，而 useEffect 在浏览器绘制 DOM 之前执行。
  // 这里确定首先加载编辑器基本骨架，然后网络请求获取内容，避免全部白屏Loading情况
  useLayoutEffect(() => {
    updateOptions({ fileName, filePath, repoID });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 离开页面前，询问是否保存
  const onUnload = useCallback((event) => {
    const { contentChanged } = options;
    if (!contentChanged) return;

    const confirmationMessage = gettext('Leave this page? The system may not save your changes.');
    event.returnValue = confirmationMessage;
    return confirmationMessage;
  }, [options]);

  // 离开页面前，询问是否保存
  useEffect(() => {
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [onUnload]);

  // 在代码编辑器中，更新编辑器内容，这里是回调函数
  const updateCode = useCallback((newCode) => {
    setContent(String(newCode));
    !options.onContentChanged && setOptions({ ...options, contentChanged: true });
  }, [options, setContent]);

  // 鼠标事件，滚动事件处理
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

  // 更新文件信息
  const updateFileInfoMtime = useCallback((fileInfo) => {
    const { fileInfo: oldFileInfo } = options;
    const newFileInfo = Object.assign({}, oldFileInfo, { mtime: fileInfo.mtime, id: fileInfo.id, lastModifier: fileInfo.last_modifier_name });
    return newFileInfo;
  }, [options]);

  // 保存编辑器内容
  const onSaveEditorContent = useCallback(() => {
    setSaving(true);
    let fileInfo = options.fileInfo;

    // 先保存内容
    editorApi.saveContent(editorValue).then(() => {
      // 重新获取文件信息（例如上次保存事件）
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

  // 快捷键
  const onHotKey = useCallback((event) => {
    if (isHotkey('mod+s', event)) {
      event.preventDefault();
      onSaveEditorContent(editorValue);
      return true;
    }
  }, [editorValue, onSaveEditorContent]);

  // 切换收藏
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

  // 切换到纯文本编辑器
  const setEditorMode = useCallback(() => {
    const { origin, pathname } = window.location;
    window.location.href = origin + pathname;
  }, []);

  // 空回调函数
  const ignoreCallBack = useCallback(() => void 0, []);

  if (options.loading) return <CodeMirrorLoading />;

  return (
    <>
      {/* 普通文本和富文本，公共的工具栏，包括保存，星标，历史入口，分享，锁定等功能 */}
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
          {/* 编辑器内部，左侧是编辑器，右侧是预览 */}
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
              {/* 预览 previewValue */}
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
