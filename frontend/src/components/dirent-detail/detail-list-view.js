import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import EditFileTagDialog from '../dialog/edit-filetag-dialog';

const propTypes = {
  repo: PropTypes.object.isRequired,
  direntType: PropTypes.string.isRequired,
  direntDetail: PropTypes.object.isRequired,
  direntPath: PropTypes.string.isRequired,
  fileTagList: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
};

class DetailListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isEditFileTagShow: false,
    };
  }

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

  onEditFileTagToggle = () => {
    this.setState({
      isEditFileTagShow: !this.state.isEditFileTagShow
    });
  }

  render() {
    let { direntType, direntDetail, fileTagList } = this.props;
    let position = this.getDirentPostion();
    if (direntType === 'dir') {
      return (
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
      );
    } else {
      return (
        <Fragment>
          <table>
            <tbody>
              <tr><th width="35%"></th><td width="65%"></td></tr>
              <tr><th>{gettext('Size')}</th><td>{direntDetail.size}</td></tr>
              <tr><th>{gettext('Position')}</th><td>{position}</td></tr>
              <tr><th>{gettext('Last Update')}</th><td>{moment(direntDetail.mtime).format('YYYY-MM-DD')}</td></tr>
              <tr className="file-tag-container"><th>{gettext('Tags')}</th>
                <td>
                  <ul className="file-tag-list">
                    {fileTagList.map((fileTag) => {
                      return (
                        <li key={fileTag.id}>
                          <span className={`file-tag bg-${fileTag.color}`}></span>
                          <span className="tag-name">{fileTag.name}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <i className='fa fa-pencil' onClick={this.onEditFileTagToggle}></i>
                </td>
              </tr>
            </tbody>
          </table>
          {
            this.state.isEditFileTagShow &&
            <EditFileTagDialog
              fileTagList={fileTagList}
              filePath={this.props.direntPath}
              toggleCancel={this.onEditFileTagToggle}
              onFileTagChanged={this.props.onFileTagChanged}
            />
          }
        </Fragment>
      );
    }
  }
}

DetailListView.propTypes = propTypes;

export default DetailListView;
