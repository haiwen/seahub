import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

import '../../../css/dirent-detail.css';
import '../css/detail-list-view.css';

dayjs.extend(relativeTime);

const { filePath } = window.app.pageOptions;

const propTypes = {
  fileInfo: PropTypes.object.isRequired,
};

class DetailListView extends React.Component {
  render() {
    const { fileInfo } = this.props;
    return (
      <div className="dirent-table-container p-2">
        <table className="table-thead-hidden">
          <thead>
            <tr><th width="35%"></th><th width="65%"></th></tr>
          </thead>
          <tbody>
            <tr><th>{gettext('Size')}</th><td>{Utils.bytesToSize(fileInfo.size)}</td></tr>
            <tr><th>{gettext('Location')}</th><td>{filePath}</td></tr>
            <tr><th>{gettext('Last Update')}</th><td>{dayjs(fileInfo.mtime * 1000).fromNow()}</td></tr>
          </tbody>
        </table>
      </div>
    );
  }
}

DetailListView.propTypes = propTypes;

export default DetailListView;
