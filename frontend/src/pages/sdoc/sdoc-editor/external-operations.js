import React from 'react';
import PropTypes from 'prop-types';
import { EventBus, EXTERNAL_EVENT } from '@seafile/seafile-sdoc-editor';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import InternalLinkDialog from '../../../components/dialog/internal-link-dialog';
import ShareDialog from '../../../components/dialog/share-dialog';
import CreateFile from '../../../components/dialog/create-file-dialog';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  docPath: PropTypes.string.isRequired,
  docName: PropTypes.string.isRequired,
  docPerm: PropTypes.string.isRequired,
  isStarred: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  dirPath: PropTypes.string.isRequired,
  toggleStar: PropTypes.func.isRequired,
  onNewNotification: PropTypes.func.isRequired,
  onClearNotification: PropTypes.func.isRequired
};

class ExternalOperations extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowInternalLinkDialog: false,
      isShowShareDialog: false,
      internalLink: '',
      isShowCreateFileDialog: false,
      fileType: '.sdoc',
      editor: null,
      insertSdocFileLink: null,
      insertWhiteboard: null,
    };
  }

  componentDidMount() {
    const eventBus = EventBus.getInstance();
    this.unsubscribeInternalLinkEvent = eventBus.subscribe(EXTERNAL_EVENT.INTERNAL_LINK_CLICK, this.onInternalLinkToggle);
    this.unsubscribeStar = eventBus.subscribe(EXTERNAL_EVENT.TOGGLE_STAR, this.toggleStar);
    this.unsubscribeShare = eventBus.subscribe(EXTERNAL_EVENT.SHARE_SDOC, this.onShareToggle);
    this.unsubscribeFreezeDocument = eventBus.subscribe(EXTERNAL_EVENT.FREEZE_DOCUMENT, this.onFreezeDocument);
    this.unsubscribeUnfreeze = eventBus.subscribe(EXTERNAL_EVENT.UNFREEZE, this.unFreeze);
    this.unsubscribeNewNotification = eventBus.subscribe(EXTERNAL_EVENT.NEW_NOTIFICATION, this.onNewNotification);
    this.unsubscribeClearNotification = eventBus.subscribe(EXTERNAL_EVENT.CLEAR_NOTIFICATION, this.onClearNotification);
    this.unsubscribeCreateSdocFile = eventBus.subscribe(EXTERNAL_EVENT.CREATE_SDOC_FILE, this.onCreateSdocFile);
    this.unsubscribeCreateWhiteboardFile = eventBus.subscribe(EXTERNAL_EVENT.CREATE_WHITEBOARD_FILE, this.onCreateWhiteboardFile);
    this.unsubscribeGenerateExdrawReadOnlyLink = eventBus.subscribe(EXTERNAL_EVENT.GENERATE_EXDRAW_READ_ONLY_LINK, this.generateExdrawReadOnlyLink);
  }

  componentWillUnmount() {
    this.unsubscribeInternalLinkEvent();
    this.unsubscribeStar();
    this.unsubscribeUnmark();
    this.unsubscribeShare();
    this.unsubscribeFreezeDocument();
    this.unsubscribeUnfreeze();
    this.unsubscribeNewNotification();
    this.unsubscribeCreateSdocFile();
    this.unsubscribeClearNotification();
    this.unsubscribeCreateWhiteboardFile();
    this.unsubscribeGenerateExdrawReadOnlyLink();
  }

  onInternalLinkToggle = (options) => {
    if (options && options.internalLink) {
      this.setState({ internalLink: options.internalLink });
    }
    this.setState({ isShowInternalLinkDialog: !this.state.isShowInternalLinkDialog });
  };

  toggleStar = () => {
    const { isStarred, repoID, docPath } = this.props;
    if (isStarred) {
      seafileAPI.unstarItem(repoID, docPath).then((res) => {
        this.props.toggleStar(false);
      }).catch((error) => {
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
      });
    } else {
      seafileAPI.starItem(repoID, docPath).then((res) => {
        this.props.toggleStar(true);
      }).catch((error) => {
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
      });
    }
  };

  onShareToggle = () => {
    this.setState({ isShowShareDialog: !this.state.isShowShareDialog });
  };

  onFreezeDocument = () => {
    const { repoID, docPath } = this.props;
    seafileAPI.lockfile(repoID, docPath, -1).then((res) => {
      const eventBus = EventBus.getInstance();
      eventBus.dispatch(EXTERNAL_EVENT.REFRESH_DOCUMENT);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  unFreeze = () => {
    const { repoID, docPath } = this.props;
    seafileAPI.unlockfile(repoID, docPath).then((res) => {
      const eventBus = EventBus.getInstance();
      eventBus.dispatch(EXTERNAL_EVENT.REFRESH_DOCUMENT);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onNewNotification = () => {
    this.props.onNewNotification();
  };

  onClearNotification = () => {
    this.props.onClearNotification();
  };

  onCreateSdocFile = (params) => {
    if (params?.noShowDialog) {
      this.setState({
        insertSdocFileLink: params.insertSdocFileLink,
        editor: params.editor,
      }, () => {
        const filePath = `${this.props.dirPath}/${params.newFileName}.sdoc`;
        this.onAddFile(filePath);
      });
      return;
    }

    if (params?.editor && params?.insertSdocFileLink) {
      this.setState({ editor: params.editor, insertSdocFileLink: params.insertSdocFileLink });
    }
    if (params?.newFileName) {
      this.setState({ fileType: `${params.newFileName}.sdoc` });
    }
    this.setState({
      isShowCreateFileDialog: !this.state.isShowCreateFileDialog
    });
  };

  onCreateWhiteboardFile = (params) => {
    if (params?.editor && params?.insertWhiteboard) {
      this.setState({ editor: params.editor, insertWhiteboard: params.insertWhiteboard });
    }
    if (params?.fileType) {
      this.setState({ fileType: '.exdraw' });
    }
    this.setState({
      isShowCreateFileDialog: !this.state.isShowCreateFileDialog
    });
  };

  generateExdrawReadOnlyLink = (params) => {
    if (!params?.repoID || !params?.filePath) return;

    seafileAPI.getInternalLink(params.repoID, params?.filePath).then((res) => {
      const url = new URL(res.data.smart_link);
      url.searchParams.set('readonly', 'true');
      url.searchParams.set('filetype', 'Excalidraw');
      const link = url.toString();
      if (params?.onSuccess) {
        params?.onSuccess(link);
      }
    });
  };

  checkDuplicatedName = (newName) => {
    let direntList = this.props.direntList;
    let isDuplicated = direntList.some(object => {
      return object.name === newName;
    });
    return isDuplicated;
  };

  onAddFile = (filePath) => {
    let repoID = this.props.repoID;
    const { insertWhiteboard, insertSdocFileLink, editor } = this.state;
    seafileAPI.createFile(repoID, filePath).then((res) => {
      if (insertSdocFileLink && editor) {
        insertSdocFileLink(editor, res.data.obj_name, res.data.doc_uuid);
      }
      if (insertWhiteboard && editor) {
        const whiteboardFilePath = '/' + res.data.obj_name;
        insertWhiteboard(editor, res.data.obj_name, whiteboardFilePath);
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { repoID, docPath, docName, docPerm, dirPath } = this.props;
    const { isShowInternalLinkDialog, isShowShareDialog, internalLink, isShowCreateFileDialog, fileType } = this.state;
    return (
      <>
        {isShowInternalLinkDialog && (
          <InternalLinkDialog
            repoID={repoID}
            path={docPath}
            internalLink={internalLink}
            onInternalLinkDialogToggle={this.onInternalLinkToggle}
          />
        )}
        {isShowShareDialog && (
          <ShareDialog
            itemType={'file'}
            itemPath={docPath}
            itemName={docName}
            repoID={repoID}
            userPerm={docPerm}
            toggleDialog={this.onShareToggle}
          />
        )}
        {isShowCreateFileDialog && (
          <CreateFile
            parentPath={dirPath}
            fileType={fileType}
            onAddFile={this.onAddFile}
            checkDuplicatedName={this.checkDuplicatedName}
            toggleDialog={this.onCreateSdocFile || this.onCreateWhiteboardFile}
          />
        )}
      </>
    );
  }
}

ExternalOperations.propTypes = propTypes;

export default ExternalOperations;
