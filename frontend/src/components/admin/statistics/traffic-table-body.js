import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';

const propTypes = {
  type: PropTypes.string.isRequired,
  userTrafficItem: PropTypes.object.isRequired,
  renderTrafficName: PropTypes.func.isRequired,
};

class TrafficTableBody extends React.Component {

  render() {
    const { userTrafficItem } = this.props;
    const syncUploadSize = Utils.bytesToSize(userTrafficItem.sync_file_upload);
    const syncDownloadSize = Utils.bytesToSize(userTrafficItem.sync_file_download);
    const webUploadSize = Utils.bytesToSize(userTrafficItem.web_file_upload);
    const webDownloadSize = Utils.bytesToSize(userTrafficItem.web_file_download);
    const linkUploadSize = Utils.bytesToSize(userTrafficItem.link_file_upload);
    const linkDownloadSize = Utils.bytesToSize(userTrafficItem.link_file_download);

    return (
      <tr>
        <td>{this.props.renderTrafficName(this.props)}</td>
        <td>{syncUploadSize}</td>
        <td>{syncDownloadSize}</td>
        <td>{webUploadSize}</td>
        <td>{webDownloadSize}</td>
        <td>{linkUploadSize}</td>
        <td>{linkDownloadSize}</td>
      </tr>
    );
  }
}

TrafficTableBody.propTypes = propTypes;

export default TrafficTableBody;
