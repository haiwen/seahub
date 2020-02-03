import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import toaster from '../toast';
import copy from '../copy-to-clipboard';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Loading from '../loading';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  direntType: PropTypes.string
};

class InternalLink extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      smartLink: '',
      isInternalLoding: true,
    };
  }

  componentDidMount() {
    let { repoID, path, direntType } = this.props;
    seafileAPI.getInternalLink(repoID, path, direntType).then(res => {
      this.setState({
        smartLink: res.data.smart_link,
        isInternalLoding: false
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
    if (this.state.isInternalLoding) {
      return(<Loading />);
    }
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
