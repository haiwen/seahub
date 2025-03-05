import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { MarkdownViewer } from '@seafile/seafile-editor';
import WechatViewer from './wechat-viewer';

// Windows old Wechat (3.0 or earlier) inner core is chrome 53 and don't support ECMA6, can't use seafile-editor markdownViewer
// Windows new Wechat (lastest version 3.3.5) support seafile-editor markdownViewer
// so use dangerouslySetInnerHTML to preview
const Viewer = React.memo(({ value, showTOC }) => {

  const isWindowsWechat = useMemo(() => {
    if (!window.chrome) return false;
    const appVersion = navigator.appVersion;
    const appVersionList = appVersion.split(' ');
    const index = appVersionList.findIndex((version) => version.indexOf('Chrome') >= 0);
    if (index === -1) return false;
    let chromeVersion = appVersionList[index];
    chromeVersion = parseInt(chromeVersion.slice(chromeVersion.indexOf('/') + 1));
    if (chromeVersion === 53 && navigator.appVersion && navigator.appVersion.includes('WindowsWechat')) return true;
    return false;
  }, []);

  if (isWindowsWechat) return (<WechatViewer value={value} />);
  return (<MarkdownViewer value={value} isShowOutline={showTOC}/>);
});

Viewer.propTypes = {
  value: PropTypes.string.isRequired,
  showTOC: PropTypes.bool,
};

export default Viewer;
