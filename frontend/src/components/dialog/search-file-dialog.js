import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Table } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import toaster from '../toast';
import '../../css/manage-members-dialog.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
};

class SearchFileDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      fileList: [],
      fileName: "",
      errMessage: [],
    };
  }

  searchFile = () => {
    seafileAPI.searchFileInRepo(this.props.repoID, this.state.fileName).then((res) => {
      this.setState({
        fileList: res.data.data
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggle = () => {
    this.props.toggleSearchFileDialog();
  }

  handleFileNameInputChange = (e) => {
    this.setState({
      fileName: e.target.value
    });
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Search file by name')}</ModalHeader>

        <ModalBody>
          <div className='add-members'>
            <input className="form-control" id="file-name" type="text" name="file-name" value={this.state.fileName} onChange={this.handleFileNameInputChange} />
            <button type="submit" className="btn btn-outline-primary offset-sm-1"  onClick={this.searchFile}>{gettext('Submit')}</button>
          </div>
          {
            this.state.errMessage.length > 0 &&
            this.state.errMessage.map((item, index = 0) => {
              return (
                <div className="group-error error" key={index}>{item.error_msg}</div>
              );
            })
          }
          <div className="manage-members">
            <Table size="sm" className="manage-members-table">
              <thead>
                <tr>
                  <th width="15%"></th>
                  <th width="45%">{gettext('Name')}</th>
                  <th width="20%">{gettext('Size')}</th>
                  <th width="20%">{gettext('Last Update')}</th>
                </tr>
              </thead>
              <tbody>
                {
                  this.state.fileList.length > 0 &&
                  this.state.fileList.map((item, index = 0) => {
                    return (
                      <React.Fragment key={index}>
                        <FileItem
                          item={item}
                          repoID={this.props.repoID}
                          repoName={this.props.repoName}
                        />
                      </React.Fragment>
                    );
                  })
                }
              </tbody>
            </Table>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SearchFileDialog.propTypes = propTypes;

const FileItemPropTypes = {
  item: PropTypes.object.isRequired,
};

class FileItem extends React.PureComponent {

  constructor(props) {
    super(props);
    this.state = ({
      highlight: false,
    });
  }

  handleMouseLeave = () => {
    if (this.props.isItemFreezed) return;
    this.setState({
      highlight: false,
    });
  }

  render() {
    const { item } = this.props;
    let url = '';

    if (item.type == 'file') {
      url = siteRoot + 'lib/' + this.props.repoID + '/file' + Utils.encodePath(item.path);
    } else {
      url = siteRoot + 'library/' + this.props.repoID + '/' + this.props.repoName + Utils.encodePath(item.path);
    }

    let fileName = item.path.substr(item.path.lastIndexOf('/') + 1);

    return(
      <tr onMouseOver={this.handleMouseOver} onMouseLeave={this.handleMouseLeave} className={this.state.highlight ? 'editing' : ''}>
        <td className="text-center"><img src={item.type == 'file' ? Utils.getFileIconUrl(item.path) : Utils.getFolderIconUrl()} alt="" width="24" /></td>
        <td className="name">
          <a href={url}>{fileName}</a>
        </td>
        <td>{item.type == 'file' ? Utils.bytesToSize(item.size) : ''}</td>
        <td>{moment(item.mtime).fromNow()}</td>
      </tr>
    );
  }
}

FileItem.propTypes = FileItemPropTypes;


export default SearchFileDialog;
