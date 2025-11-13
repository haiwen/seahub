import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import InternalLinkDialog from '../dialog/internal-link-dialog';
import OpIcon from '../op-icon';

import './internal-link-operation.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
};

class InternalLinkOperation extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowInternalLinkDialog: false
    };
  }

  onInternalLinkDialogToggle = () => {
    this.setState({ isShowInternalLinkDialog: !this.state.isShowInternalLinkDialog });
  };

  render() {
    const { repoID, path } = this.props;
    const { isShowInternalLinkDialog } = this.state;
    const title = gettext('Internal Link');
    return (
      <Fragment>
        <OpIcon
          className="op-icon file-internal-link"
          symbol="link1"
          title={title}
          op={this.onInternalLinkDialogToggle}
        />
        {isShowInternalLinkDialog && (
          <InternalLinkDialog
            repoID={repoID}
            path={path}
            onInternalLinkDialogToggle={this.onInternalLinkDialogToggle}
          />
        )}
      </Fragment>
    );
  }

}

InternalLinkOperation.propTypes = propTypes;

export default InternalLinkOperation;
