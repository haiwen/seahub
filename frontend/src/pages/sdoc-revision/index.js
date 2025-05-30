import React from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from 'reactstrap';
import { DiffViewer } from '@seafile/seafile-sdoc-editor';
import { gettext } from '../../utils/constants';
import Loading from '../../components/loading';
import GoBack from '../../components/common/go-back';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../../components/toast';

import '../../css/layout.css';
import '../../css/sdoc-revision.css';

const { serviceURL, avatarURL, siteRoot } = window.app.config;
const { username, name } = window.app.pageOptions;
const { repoID, fileName, filePath, docUuid, assetsUrl, fileDownloadLink, originFileDownloadLink } = window.sdocRevision;

window.seafile = {
  repoID,
  docPath: filePath,
  docName: fileName,
  docUuid,
  isOpenSocket: false,
  serviceUrl: serviceURL,
  name,
  username,
  avatarURL,
  siteRoot,
  assetsUrl,
};

class SdocRevision extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMessage: '',
      revisionContent: '',
      originContent: '',
    };
  }

  componentDidMount() {
    fetch(fileDownloadLink).then(res => {
      return res.json();
    }).then(revisionContent => {
      fetch(originFileDownloadLink).then(res => {
        return res.json();
      }).then(originContent => {
        this.setState({ revisionContent, originContent, isLoading: false, errorMessage: '' });
      }).catch(error => {
        const errorMessage = Utils.getErrorMsg(error, true);
        this.setState({ isLoading: false, errorMessage });
      });
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error, true);
      this.setState({ isLoading: false, errorMessage });
    });
  }

  edit = (event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    window.location.href = `${siteRoot}lib/${repoID}/file${filePath}`;
  };

  publishRevision = (event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    seafileAPI.sdocPublishRevision(docUuid).then(res => {
      const { origin_file_path } = res.data;
      window.location.href = `${siteRoot}lib/${repoID}/file${origin_file_path}`;
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error, false);
      toaster.danger(gettext(errorMessage));
    });
  };

  renderContent = () => {
    const { isLoading, errorMessage, revisionContent, originContent } = this.state;
    if (isLoading) {
      return (
        <div className="sdoc-revision-viewer h-100 d-flex align-items-center justify-content-center">
          <Loading />
        </div>
      );
    }

    if (errorMessage) {
      return (
        <div className="sdoc-revision-viewer h-100 d-flex align-items-center justify-content-center">
          {gettext(errorMessage)}
        </div>
      );
    }

    return (
      <DiffViewer
        currentContent={revisionContent}
        lastContent={originContent}
      />
    );
  };

  render() {
    const { isLoading, errorMessage } = this.state;

    return (
      <div className="sdoc-revision d-flex h-100 w-100 o-hidden">
        <div className="sdoc-revision-container d-flex flex-column">
          <div className="sdoc-revision-header pl-4 pr-4 d-flex justify-content-between w-100 o-hidden">
            <div className='sdoc-revision-header-left h-100 d-flex align-items-center o-hidden'>
              <GoBack />
              <div className="file-name text-truncate">{fileName}</div>
            </div>
            <div className="sdoc-revision-header-right h-100 d-flex align-items-center">
              {(!isLoading && !errorMessage) && (
                <>
                  <Button color="success" className="mr-4" onClick={this.edit}>{gettext('Edit')}</Button>
                  <Button color="success" onClick={this.publishRevision}>{gettext('Publish')}</Button>
                </>
              )}
            </div>
          </div>
          <div className="sdoc-revision-content f-flex">
            {this.renderContent()}
          </div>
        </div>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<SdocRevision />);
