import React from 'react';
import { createRoot } from 'react-dom/client';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';

const {
  err,
  fileName,
  actionURL,
  accessToken,
  accessTokenTtl,
} = window.app.pageOptions;

class ViewFileCollaboraOnline extends React.Component {
  render() {
    return (
      <FileView content={<FileContent />} isOnlyofficeFile={true} />
    );
  }
}

class FileContent extends React.Component {

  componentDidMount() {
    if (!err) {
      document.getElementById('office-form').submit();
      document.getElementById('office-frame').className = 'd-block w-100 h-100 border-0';
    }
  }

  render() {
    if (err) {
      return <FileViewTip />;
    }

    return (
      <div className="file-view-content flex-1 p-0 border-0">
        <iframe title={fileName} id="office-frame" name="office_frame" className="d-none" allowFullScreen></iframe>
        <form id="office-form" name="office_form" target="office_frame" action={actionURL} method="post">
          <input name="access_token" value={accessToken} type="hidden" />
          <input name="access_token_ttl" value={accessTokenTtl} type="hidden" />
        </form>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<ViewFileCollaboraOnline />);
