import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Alert } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api.js';
import { gettext, siteRoot } from '../../utils/constants';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class SearchFileDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isSubmitDisabled: true,
      isSubmitting: false,
      q: '',
      errMessage: '',
      fileList: null
    };
  }

  searchFile = () => {
    const { q } = this.state;
    if (!q.trim()) {
      return false;
    }
    this.setState({
      isSubmitDisabled: true,
      isSubmitting: true
    });
    seafileAPI.searchFileInRepo(this.props.repoID, q).then((res) => {
      this.setState({
        fileList: res.data.data,
        errMessage: '',
        isSubmitDisabled: false,
        isSubmitting: false
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      this.setState({
        errMessage: errMessage,
        isSubmitDisabled: false,
        isSubmitting: false
      });
    });
  }

  handleKeyDown = (e) => {
    if (e.key == 'Enter') {
      e.preventDefault();
      this.searchFile();
    }
  }

  toggle = () => {
    this.props.toggleDialog();
  }

  handleInputChange = (e) => {
    const q = e.target.value;
    this.setState({
      q: q,
      isSubmitDisabled: !q.trim()
    });
  }

  render() {
    const { q, errMessage, fileList, isSubmitDisabled, isSubmitting } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle} autoFocus={false}>
        <ModalHeader toggle={this.toggle}>{gettext('Search')}</ModalHeader>
        <ModalBody style={{height: '250px'}} className="o-auto">
          <div className="d-flex">
            <input className="form-control mr-2" type="text" placeholder={gettext('Search files in this library')} value={q} onChange={this.handleInputChange} onKeyDown={this.handleKeyDown} autoFocus={true} />
            <button type="submit" className={`btn btn-primary flex-shrink-0 ${isSubmitting ? 'btn-loading' : ''}`} onClick={this.searchFile} disabled={isSubmitDisabled}>{gettext('Search')}</button>
          </div>
          {errMessage && <Alert color="danger" className="mt-2">{errMessage}</Alert>}
          <div className="mt-2">
            {!fileList ?
              null :
              fileList.length == 0 ?
                <p>{gettext('No result')}</p> :
                <table className="table-hover">
                  <thead>
                    <tr>
                      <th width="8%"></th>
                      <th width="42%">{gettext('Name')}</th>
                      <th width="25%">{gettext('Size')}</th>
                      <th width="25%">{gettext('Last Update')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileList.map((item, index) => {
                      return (
                        <FileItem
                          key={index}
                          item={item}
                          repoID={this.props.repoID}
                          repoName={this.props.repoName}
                        />
                      );
                    })
                    }
                  </tbody>
                </table>}
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
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired
};

class FileItem extends React.PureComponent {

  render() {
    const { item, repoID, repoName } = this.props;
    const name = item.path.substr(item.path.lastIndexOf('/') + 1);
    const url = item.type == 'file' ?
      `${siteRoot}lib/${repoID}/file${Utils.encodePath(item.path)}` :
      `${siteRoot}library/${repoID}/${Utils.encodePath(repoName + item.path)}`;

    return(
      <tr>
        <td className="text-center"><img src={item.type == 'file' ? Utils.getFileIconUrl(item.path) : Utils.getFolderIconUrl()} alt="" width="24" /></td>
        <td>
          <a href={url}>{name}</a>
        </td>
        <td>{item.type == 'file' ? Utils.bytesToSize(item.size) : ''}</td>
        <td>{moment(item.mtime).fromNow()}</td>
      </tr>
    );
  }
}

FileItem.propTypes = FileItemPropTypes;


export default SearchFileDialog;
