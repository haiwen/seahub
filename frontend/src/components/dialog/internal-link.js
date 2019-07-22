import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import toaster from '../toast';
import copy from '@seafile/seafile-editor/dist/utils/copy-to-clipboard';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
};

class InternalLink extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      smartLink: '',
    };
  }

  componentDidMount() {
    let repoID = this.props.repoID;
    let path = this.props.path;
    seafileAPI.getInternalLink(repoID, path).then(res => {
      this.setState({
        smartLink: res.data.smart_link
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  copyToClipBoard = () => {
    copy(this.state.smartLink);
    let message = gettext('Internal link has been copied to clipboard');
    toaster.success(message), {
      duration: 2
    };
  }

  render() {
    return (
      <div>
        <p className="tip mb-1">
          {gettext('An internal link is a link to a file or folder that can be accessed by users with read permission to the file or folder.')}
        </p>
        <p>
          <a target="_blank" href={this.state.smartLink}>{this.state.smartLink}</a>
        </p>
        <Button onClick={this.copyToClipBoard} color="primary" className="mt-2">{gettext('Copy')}</Button>
      </div>
    );
  }
}

InternalLink.propTypes = propTypes;

export default InternalLink;
