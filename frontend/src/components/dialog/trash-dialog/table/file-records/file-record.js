import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Utils, isMobile } from '../../../../../utils/utils';
import { gettext, siteRoot } from '../../../../../utils/constants';
import { seafileAPI } from '../../../../../utils/seafile-api';
import toaster from '../../../../toast';

class FileRecord extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      restored: false,
      isIconShown: false
    };
  }

  handleMouseOver = () => {
    this.setState({ isIconShown: true });
  };

  handleMouseOut = () => {
    this.setState({ isIconShown: false });
  };

  restoreItem = (e) => {
    e.preventDefault();
    const { record } = this.props;
    const { commit_id, parent_dir, obj_name, is_dir } = record;
    const path = parent_dir + obj_name;
    const request = is_dir ?
      seafileAPI.restoreFolder(this.props.repoID, commit_id, path) :
      seafileAPI.restoreFile(this.props.repoID, commit_id, path);
    request.then((res) => {
      this.setState({
        restored: true
      });
      toaster.success(gettext('Restored 1 item'));
    }).catch((error) => {
      let errorMsg = '';
      if (error.response) {
        errorMsg = error.response.data.error_msg || gettext('Error');
      } else {
        errorMsg = gettext('Please check the network.');
      }
      toaster.danger(errorMsg);
    });
  };

  renderFolder = (e) => {
    e.preventDefault();
    const { record } = this.props;
    this.props.renderFolder(record.commit_id, record.parent_dir, Utils.joinPath('/', record.obj_name));
  };

  render() {
    const { record } = this.props;
    const { restored, isIconShown } = this.state;

    if (restored) return null;

    return record.is_dir ? (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
        <td className="pl-2 pr-2"><img src={Utils.getFolderIconUrl()} alt={gettext('Folder')} width="24" /></td>
        <td><a href="#" onClick={this.renderFolder}>{record.obj_name}</a></td>
        <td>{record.parent_dir}</td>
        <td title={dayjs(record.deleted_time).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(record.deleted_time).format('YYYY-MM-DD')}</td>
        <td></td>
        <td>
          <a href="#" className={(isIconShown || isMobile) ? '' : 'invisible'} onClick={this.restoreItem} role="button">{gettext('Restore')}</a>
        </td>
      </tr>
    ) : (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
        <td className="pl-2 pr-2"><img src={Utils.getFileIconUrl(record.obj_name)} alt={gettext('File')} width="24" /></td>
        <td>
          <a href={`${siteRoot}repo/${this.props.repoID}/trash/files/?obj_id=${record.obj_id}&commit_id=${record.commit_id}&base=${encodeURIComponent(record.parent_dir)}&p=${encodeURIComponent('/' + record.obj_name)}`} target="_blank" rel="noreferrer">
            {record.obj_name}
          </a>
        </td>
        <td>{record.parent_dir}</td>
        <td title={dayjs(record.deleted_time).format('dddd, MMMM D, YYYY h:mm:ss A')}>
          {dayjs(record.deleted_time).format('YYYY-MM-DD')}
        </td>
        <td>{Utils.bytesToSize(record.size)}</td>
        <td>
          <a href="#" className={(isIconShown || isMobile) ? '' : 'invisible'} onClick={this.restoreItem} role="button">{gettext('Restore')}</a>
        </td>
      </tr>
    );
  }
}

FileRecord.propTypes = {
  record: PropTypes.object.isRequired,
  repoID: PropTypes.string.isRequired,
  renderFolder: PropTypes.func.isRequired,
};

export default FileRecord;
