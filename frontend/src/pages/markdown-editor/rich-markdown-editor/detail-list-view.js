import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import EditFileTagDialog from '../../../components/dialog/edit-filetag-dialog';

import '../../../css/dirent-detail.css';
import '../css/detail-list-view.css';

const { repoID, filePath } = window.app.pageOptions;

const propTypes = {
  fileInfo: PropTypes.object.isRequired,
  fileTagList: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired
};

class DetailListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isEditFileTagShow: false
    };
  }

  onEditFileTagToggle = () => {
    this.setState({isEditFileTagShow: !this.state.isEditFileTagShow});
  }

  render() {
    const { fileTagList, fileInfo } = this.props;
    return (
      <Fragment>
        <div className="dirent-table-container p-2">
          <table className="table-thead-hidden">
            <thead>
              <tr><th width="35%"></th><th width="65%"></th></tr>
            </thead>
            <tbody>
              <tr><th>{gettext('Size')}</th><td>{Utils.bytesToSize(fileInfo.size)}</td></tr>
              <tr><th>{gettext('Location')}</th><td>{filePath}</td></tr>
              <tr><th>{gettext('Last Update')}</th><td>{moment(fileInfo.mtime * 1000).fromNow()}</td></tr>
              <tr className="file-tag-container">
                <th>{gettext('Tags')}</th>
                <td>
                  <ul className="file-tag-list">
                    {fileTagList.map((fileTag) => {
                      return (
                        <li key={fileTag.id} className="file-tag-item">
                          <span className="file-tag" style={{backgroundColor: fileTag.tag_color}}></span>
                          <span className="tag-name" title={fileTag.tag_name}>{fileTag.tag_name}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <i className='fa fa-pencil-alt attr-action-icon' onClick={this.onEditFileTagToggle}></i>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {this.state.isEditFileTagShow &&
          <EditFileTagDialog
            repoID={repoID}
            filePath={filePath}
            fileTagList={fileTagList}
            toggleCancel={this.onEditFileTagToggle}
            onFileTagChanged={this.props.onFileTagChanged}
          />
        }
      </Fragment>
    );
  }
}

DetailListView.propTypes = propTypes;

export default DetailListView;
