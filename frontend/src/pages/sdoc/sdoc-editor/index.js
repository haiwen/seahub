import React, { Fragment } from 'react';
import { SimpleEditor } from '@seafile/sdoc-editor';
import ExternalOperations from './external-operations';
import { seafileAPI } from '../../../utils/seafile-api';
import Dirent from '../../../models/dirent';
import { Utils } from '../../../utils/utils';

export default class SdocEditor extends React.Component {

  constructor(props) {
    super(props);
    const { isStarred, isSdocDraft } = window.app.pageOptions;
    this.state = {
      isStarred: isStarred,
      isDraft: isSdocDraft,
      direntList: []
    };
  }

  componentDidMount() {
    this.onSetFavicon();
    this.getDirentList();
  }

  toggleStar = (isStarred) => {
    this.setState({isStarred: isStarred});
  };

  unmarkDraft = () => {
    this.setState({isDraft: false});
  };

  onSetFavicon = (suffix) => {
    let { docName } = window.seafile;
    if (suffix) {
      docName = docName + suffix;
    }
    const fileIcon = Utils.getFileIconUrl(docName, 192);
    document.getElementById('favicon').href = fileIcon;
  };

  onNewNotification = () => {
    this.onSetFavicon('_notification');
  };

  getDirPath = () => {
    const { docPath } = window.seafile;
    const index = docPath.lastIndexOf('/');
    if (index) {
      return docPath.slice(0, index);
    }
    return '/';
  };

  getDirentList = () => {
    const { repoID } = window.seafile;
    const path = this.getDirPath();
    seafileAPI.listDir(repoID, path, {'with_thumbnail': true}).then(res => {
      let direntList = [];
      res.data.dirent_list.forEach(item => {
        let dirent = new Dirent(item);
        direntList.push(dirent);
      });
      this.setState({
        direntList: direntList
      });
    }).catch((err) => {
      Utils.getErrorMsg(err, true);
    });
  };

  render() {
    const { repoID, docPath, docName, docPerm } = window.seafile;
    const { isStarred, isDraft, direntList } = this.state;
    const dirPath = this.getDirPath();
    return (
      <Fragment>
        <SimpleEditor isStarred={isStarred} isDraft={isDraft} />
        <ExternalOperations
          repoID={repoID}
          docPath={docPath}
          docName={docName}
          docPerm={docPerm}
          isStarred={isStarred}
          direntList={direntList}
          dirPath={dirPath}
          toggleStar={this.toggleStar}
          unmarkDraft={this.unmarkDraft}
          onNewNotification={this.onNewNotification}
        />
      </Fragment>
    );
  }
}
