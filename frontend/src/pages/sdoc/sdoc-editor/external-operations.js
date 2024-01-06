import React from 'react';
import PropTypes from 'prop-types';
import { EventBus, EXTERNAL_EVENT } from '@seafile/sdoc-editor';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import InternalLinkDialog from '../../../components/dialog/internal-link-dialog';
import ShareDialog from '../../../components/dialog/share-dialog';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  docPath: PropTypes.string.isRequired,
  docName: PropTypes.string.isRequired,
  docPerm: PropTypes.string.isRequired,
  isStarred: PropTypes.bool.isRequired,
  toggleStar: PropTypes.func.isRequired,
  unmarkDraft: PropTypes.func.isRequired,
  onNewNotification: PropTypes.func.isRequired
};

class ExternalOperations extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowInternalLinkDialog: false,
      isShowShareDialog: false,
      internalLink: '',
    };
  }

  componentDidMount() {
    const eventBus = EventBus.getInstance();
    this.unsubscribeInternalLinkEvent = eventBus.subscribe(EXTERNAL_EVENT.INTERNAL_LINK_CLICK, this.onInternalLinkToggle);
    this.unsubscribeStar = eventBus.subscribe(EXTERNAL_EVENT.TOGGLE_STAR, this.toggleStar);
    this.unsubscribeUnmark = eventBus.subscribe(EXTERNAL_EVENT.UNMARK_AS_DRAFT, this.unmark);
    this.unsubscribeShare = eventBus.subscribe(EXTERNAL_EVENT.SHARE_SDOC, this.onShareToggle);
    this.unsubscribeFreezeDocument = eventBus.subscribe(EXTERNAL_EVENT.FREEZE_DOCUMENT, this.onFreezeDocument);
    this.unsubscribeUnfreeze = eventBus.subscribe(EXTERNAL_EVENT.UNFREEZE, this.unFreeze);
    this.unsubscribeNewNotification = eventBus.subscribe(EXTERNAL_EVENT.NEW_NOTIFICATION, this.onNewNotification);
  }

  componentWillUnmount() {
    this.unsubscribeInternalLinkEvent();
    this.unsubscribeStar();
    this.unsubscribeUnmark();
    this.unsubscribeShare();
    this.unsubscribeFreezeDocument();
    this.unsubscribeUnfreeze();
    this.unsubscribeNewNotification();
  }

  onInternalLinkToggle = (options) => {
    if (options && options.internalLink) {
      this.setState({internalLink: options.internalLink});
    }
    this.setState({isShowInternalLinkDialog: !this.state.isShowInternalLinkDialog});
  };

  unmark = () => {
    const { repoID, docPath } = this.props;
    seafileAPI.sdocUnmarkAsDraft(repoID, docPath).then((res) => {
      this.props.unmarkDraft();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleStar = () => {
    const { isStarred, repoID, docPath  } = this.props;
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
    this.setState({isShowShareDialog: !this.state.isShowShareDialog});
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

  render() {
    const { repoID, docPath, docName, docPerm } = this.props;
    const { isShowInternalLinkDialog, isShowShareDialog, internalLink } = this.state;
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
      </>
    );
  }
}

ExternalOperations.propTypes = propTypes;

export default ExternalOperations;
