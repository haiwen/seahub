import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  direntType: PropTypes.string.isRequired,
  direntDetail: PropTypes.object.isRequired,
};

class DetailListView extends React.Component {

  render() {
    let { direntType, direntDetail } = this.props;
    if (direntType === 'dir') {
      return (
        <div className="dirent-table-container">
          <table>
            <tbody>
              <tr><th width="35%"></th><td width="65%"></td></tr>
              <tr><th>{gettext('Folder')}</th><td>{direntDetail.dir_count}</td></tr>
              <tr><th>{gettext('File')}</th><td>{direntDetail.file_count}</td></tr>
              <tr><th>{gettext('Size')}</th><td>{Utils.bytesToSize(direntDetail.size)}</td></tr>
              <tr><th>{gettext('Position')}</th><td>{direntDetail.path}</td></tr>
              <tr><th>{gettext('Last Update')}</th><td>{moment(direntDetail.mtime).format('YYYY-MM-DD')}</td></tr>
              <tr><th>{gettext('Tags')}</th><td></td>{}</tr>
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
              <tr><th>{gettext('Position')}</th><td>{}</td></tr>
              <tr><th>{gettext('Last Update')}</th><td>{moment(direntDetail.mtime).format('YYYY-MM-DD')}</td></tr>
              <tr><th>{gettext('Tags')}</th><td></td>{}</tr>
            </tbody>
          </table>
        </div>
      );
    }
  }
}

DetailListView.propTypes = propTypes;

export default DetailListView;
