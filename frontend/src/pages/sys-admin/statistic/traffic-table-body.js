import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';
import { siteRoot } from '../../../utils/constants';

const propTypes = {
  type: PropTypes.string.isRequired,
  userTrafficItem: PropTypes.object.isRequired,
};

class TrafficTableBody extends React.Component {

  trafficName = () => {
    let { userTrafficItem, type } = this.props;
    switch(type) {
      case 'user':
        if (userTrafficItem.name) {
          return (
            <a href={siteRoot + 'useradmin/info/' + userTrafficItem.email + '/'}>{userTrafficItem.name}</a>
          );
        }
        return(<span>{'--'}</span>);
      case 'org':
        return(<span>{userTrafficItem.org_name}</span>);
    }
  }

  render() {
    let { userTrafficItem } = this.props;

    let syncUploadSize = Utils.bytesToSize(userTrafficItem.sync_file_upload);
    let syncDownloadSize = Utils.bytesToSize(userTrafficItem.sync_file_download);
    let webUploadSize = Utils.bytesToSize(userTrafficItem.web_file_upload);
    let webDownloadSize = Utils.bytesToSize(userTrafficItem.web_file_download);
    let linkUploadSize = Utils.bytesToSize(userTrafficItem.link_file_upload);
    let linkDownloadSize = Utils.bytesToSize(userTrafficItem.link_file_download);

    return(
      <tr>
        <td>{this.trafficName()}</td>
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
