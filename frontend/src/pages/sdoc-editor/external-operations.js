import React from 'react';
import PropTypes from 'prop-types';
import { EventBus, EXTERNAL_EVENT } from '@seafile/sdoc-editor';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import InternalLinkDialog from '../../components/dialog/internal-link-dialog';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  docPath: PropTypes.string.isRequired,
  isStarred: PropTypes.bool.isRequired,
  toggleStar: PropTypes.func.isRequired
};

class ExternalOperations extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowInternalLinkDialog: false,
    };
  }

  componentDidMount() {
    const eventBus = EventBus.getInstance();
    this.unsubscribeInternalLinkEvent = eventBus.subscribe(EXTERNAL_EVENT.INTERNAL_LINK_CLICK, this.onInternalLinkToggle);
    this.unsubscribeStar = eventBus.subscribe(EXTERNAL_EVENT.TOGGLE_STAR, this.toggleStar);
  }

  componentWillUnmount() {
    this.unsubscribeInternalLinkEvent();
    this.unsubscribeStar();
  }

  onInternalLinkToggle = () => {
    this.setState({isShowInternalLinkDialog: !this.state.isShowInternalLinkDialog});
  }

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
  }

  render() {
    const { repoID, docPath } = this.props;
    const { isShowInternalLinkDialog } = this.state;
    return (
      <>
        {isShowInternalLinkDialog && (
          <InternalLinkDialog
            repoID={repoID}
            path={docPath}
            onInternalLinkDialogToggle={this.onInternalLinkToggle}
          />
        )}
      </>
    );
  }
}

ExternalOperations.propTypes = propTypes;

export default ExternalOperations;
