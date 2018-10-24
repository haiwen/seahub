import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  repo: PropTypes.object.isRequired,
  direntType: PropTypes.string.isRequired,
  direntDetail: PropTypes.object.isRequired,
  direntPath: PropTypes.string.isRequired,
};

class DetailListView extends React.Component {

  getDirentPostion = () => {
    let { repo, direntPath } = this.props;
    let position = repo.repo_name + '/';
    if (direntPath !== '/') {
      let index = direntPath.lastIndexOf('/');
      let path = direntPath.slice(0, index);
      position = position + path;
    }
    return position;
  }

  render() {
    let { direntType, direntDetail } = this.props;
    let position = this.getDirentPostion();
    if (direntType === 'dir') {
      return (
        <div className="dirent-table-container">
          <table>
            <tbody>
              <tr><th width="35%"></th><td width="65%"></td></tr>
              <tr><th>{gettext('Folder')}</th><td>{direntDetail.dir_count}</td></tr>
              <tr><th>{gettext('File')}</th><td>{direntDetail.file_count}</td></tr>
              <tr><th>{gettext('Size')}</th><td>{Utils.bytesToSize(direntDetail.size)}</td></tr>
              <tr><th>{gettext('Position')}</th><td>{position}</td></tr>
              <tr><th>{gettext('Last Update')}</th><td>{moment(direntDetail.mtime).format('YYYY-MM-DD')}</td></tr>
            </tbody>
          </table>
        </div>
      );
    } else {
      return (
        <div className="dirent-table-container">
          <table>
            <tbody>
              <tr><th width="35%"></th><td width="65%"></td></tr>
              <tr><th>{gettext('Size')}</th><td>{direntDetail.size}</td></tr>
              <tr><th>{gettext('Position')}</th><td>{position}</td></tr>
              <tr><th>{gettext('Last Update')}</th><td>{moment(direntDetail.mtime).format('YYYY-MM-DD')}</td></tr>
            </tbody>
          </table>
        </div>
      );
    }
  }
}

DetailListView.propTypes = propTypes;

export default DetailListView;
