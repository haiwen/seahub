import React, { Fragment } from 'react';
import ReactDom from 'react-dom';
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
    const { name, size } = direntObject;
    seafileAPI.shareLinksUploadDone(token, Utils.joinPath(path, name));
  }

  render() {
    return (
      <div className="h-100 d-flex flex-column">
        <div className="top-header d-flex justify-content-between">
          <Logo />
          {loggedUser && <Account />}
        </div>
        <div className="o-auto">
          <div className="py-4 px-6 mx-auto rounded" id="upload-link-panel">
            <h3 className="h5" dangerouslySetInnerHTML={{__html: gettext('Upload files to {folder_name_placeholder}')
              .replace('{folder_name_placeholder}', `<span class="op-target">${Utils.HTMLescape(dirName)}</span>`)}}></h3>
            <p className="small shared-by" dangerouslySetInnerHTML={{__html: `${gettext('shared by:')} ${sharedBy.avatar} ${sharedBy.name}`}}></p>
            {noQuota ? (
              <div className="py-6 text-center">
                <span className="sf3-font sf3-font-tips warning-icon"></span>
                <p>{gettext('The owner of this library has run out of space.')}</p>
              </div>
            ) : (
              <Fragment>
                <ol className="small text-gray">
                  <li className="tip-list-item">{gettext('Folder upload is limited to Chrome, Firefox 50+, and Microsoft Edge.')}</li>
                  {maxUploadFileSize && <li className="tip-list-item">{gettext('File size should be smaller than {max_size_placeholder}.').replace('{max_size_placeholder}', Utils.bytesToSize(maxUploadFileSize * 1000 * 1000))}</li>}
                </ol>
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

ReactDom.render(<SharedUploadLink />, document.getElementById('wrapper'));
