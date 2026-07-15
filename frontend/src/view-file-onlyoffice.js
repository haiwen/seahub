import React from 'react';
import { createRoot } from 'react-dom/client';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';

const {
  err
} = window.app.pageOptions;

const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);

const initOnlyofficeEditor = () => {
  if (!isSafari || err || window.docEditor || !window.DocsAPI) {
    return false;
  }

  const placeholder = document.getElementById('placeholder');
  if (!placeholder) {
    return false;
  }

  window.docEditor = new window.DocsAPI.DocEditor('placeholder', window.onlyofficeConfig);
  return true;
};

if (isSafari) {
  window.initOnlyofficeEditor = initOnlyofficeEditor;
}

class ViewFileOnlyoffice extends React.Component {
  render() {
    return (
      <FileView content={<FileContent />} isOnlyofficeFile={true} documentVendor={'onlyOffice'} />
    );
  }
}

class FileContent extends React.Component {

  componentDidMount() {
    if (isSafari) {
      window.requestAnimationFrame(() => {
        initOnlyofficeEditor();
      });
    }
  }

  render() {
    if (err) {
      return <FileViewTip />;
    }

    return (
      <div className={`file-view-content flex-1 p-0 border-0 ${isSafari ? 'h-100' : ''}`}>
        <div id="placeholder" className={isSafari ? 'h-100' : ''}></div>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<ViewFileOnlyoffice />);
