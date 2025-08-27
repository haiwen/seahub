import React, { Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import Logo from '../../components/logo';
import Account from '../../components/common/account';
import FileUploader from './file-uploader';

import '../../css/upload-link.css';

const loggedUser = window.app.pageOptions.username;
const {
  dirName,
  sharedBy,
  noQuota,
  maxUploadFileSize,
  token,
  repoID,
  path
} = window.uploadLink;


class SharedUploadLink extends React.Component {

  onFileUploadSuccess = (direntObject) => {
    const { name } = direntObject;
    const isDir = direntObject.type === 'dir';
    seafileAPI.shareLinksUploadDone(token, Utils.joinPath(path, name), isDir);
  };

  render() {
    return (
      <div className="h-100 d-flex flex-column">
        <div className="top-header d-flex justify-content-between">
          <Logo />
          {loggedUser && <Account />}
        </div>
        <div className="o-auto">
          <div className="py-4 px-6 mx-auto rounded" id="upload-link-panel">
            <h3 className="h5 d-flex text-nowrap" dangerouslySetInnerHTML={{ __html: gettext('Upload files to {folder_name_placeholder}')
              .replace('{folder_name_placeholder}', `<span class="op-target text-truncate mx-1">${Utils.HTMLescape(dirName)}</span>`) }}>
            </h3>
            <p className="small shared-by" dangerouslySetInnerHTML={{ __html: `${gettext('shared by:')} ${sharedBy.avatar} ${Utils.HTMLescape(sharedBy.name)}` }}></p>
            {noQuota ? (
              <div className="py-6 text-center">
                <span className="sf3-font sf3-font-tips warning-icon"></span>
                <p>{gettext('The owner of this library has run out of space.')}</p>
              </div>
            ) : (
              <Fragment>
                {maxUploadFileSize && <p className="small text-gray m-0">{gettext('File size should be smaller than {max_size_placeholder}.').replace('{max_size_placeholder}', Utils.bytesToSize(maxUploadFileSize * 1000 * 1000))}</p>}
                <div id="upload-link-drop-zone" className="text-center mt-2 mb-4">
                  <span className="sf3-font sf3-font-upload upload-icon"></span>
                  <p className="small text-gray mb-0">{gettext('Drag and drop files or folders here.')}</p>
                </div>
                <FileUploader
                  ref={uploader => this.uploader = uploader}
                  dragAndDrop={true}
                  token={token}
                  repoID={repoID}
                  path={path}
                  onFileUploadSuccess={this.onFileUploadSuccess}
                />
              </Fragment>
            )}
          </div>
        </div>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<SharedUploadLink />);
