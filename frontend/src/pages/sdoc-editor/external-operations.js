import React from 'react';
import PropTypes from 'prop-types';
import { EventBus } from '@seafile/sdoc-editor';
import InternalLinkDialog from '../../components/dialog/internal-link-dialog';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  docPath: PropTypes.string.isRequired,
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
    this.unsubscribeInternalLinkEvent = eventBus.subscribe('internal_link', this.onInternalLinkToggle);
  }

  componentWillUnmount() {
    this.unsubscribeInternalLinkEvent();
  }

  onInternalLinkToggle = () => {
    this.setState({isShowInternalLinkDialog: !this.state.isShowInternalLinkDialog});
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