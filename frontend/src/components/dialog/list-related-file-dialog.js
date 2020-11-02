import React ,{ Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, ModalHeader, ModalBody, ModalFooter, Table } from 'reactstrap';
import Dirent from '../../models/dirent';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import '../../css/list-related-file-dialog.css';

const propTypes = {
  relatedFiles: PropTypes.array.isRequired,
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  addRelatedFileToggle: PropTypes.func.isRequired,
  onRelatedFileChange: PropTypes.func.isRequired,
};

class ListRelatedFileDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = ({
      direntList: [],
    });
  }

  onDeleteRelatedFile = (item) => {
    let filePath = this.props.filePath;
    let repoID = this.props.repoID;
    let relatedID = item.related_id;
    seafileAPI.deleteRelatedFile(repoID, filePath, relatedID).then((res) => {
      this.props.onRelatedFileChange();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggle = () => {
    this.props.toggleCancel();
  }

  getDirentList = (relatedFiles) => {
    if (relatedFiles.length === 0) {
      this.setState({
        direntList: [],
      });
      return;
    }
    let direntList = [];
    relatedFiles.map((item) => {
      seafileAPI.getFileInfo(item.repo_id, item.path).then(res => {
        let dirent = new Dirent(res.data);
        dirent['repo_name'] = item.repo_name;
        dirent['related_id'] = item.related_id;
        dirent['link'] = siteRoot + 'lib/' + item.repo_id + '/file' + Utils.encodePath(item.path);
        direntList.push(dirent);
      });
    });
    this.setState({direntList: direntList});
  }

  componentWillMount() {
    this.getDirentList(this.props.relatedFiles);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.relatedFiles.length !== this.props.relatedFiles.length) {
      this.getDirentList(nextProps.relatedFiles);
    }
  }

  render() {
    return (
      <Fragment>
        <ModalHeader toggle={this.toggle}>{gettext('Related Files')}</ModalHeader>
        <ModalBody className={this.state.direntList.length > 0 ? 'list-related-file-body' : ''}>
          <Table hover size="sm" className="list-related-file-table">
            <thead>
              <tr>
                <th width='40%'>{gettext('Name')}</th>
                <th width='20%'>{gettext('Library Name')}</th>
                <th width='13%'>{gettext('Size')}</th>
                <th width='20%'>{gettext('Last Update')}</th>
                <th width='5%'></th>
                <th width='2%'></th>
              </tr>
            </thead>
            <tbody>
              {
                this.state.direntList.map((relatedFile, index) => {
                  return (
                    <React.Fragment key={index}>
                      <RelatedFile relatedFile={relatedFile} onDeleteRelatedFile={this.onDeleteRelatedFile}/>
                    </React.Fragment>
                  );
                })
              }
            </tbody>
          </Table>
          <a href="#" className="add-related-file-link" onClick={this.props.addRelatedFileToggle}>{gettext('Add File')}</a>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
        </ModalFooter>
      </Fragment>
    );
  }
}

ListRelatedFileDialog.propTypes = propTypes;

const RelatedFilePropTypes = {
  relatedFile: PropTypes.object,
  onDeleteRelatedFile: PropTypes.func.isRequired,
};

class RelatedFile extends React.Component {

  constructor(props) {
    super(props);
    this.state = ({
      active: false,
    });
  }

  onMouseEnter = () => {
    this.setState({
      active: true
    });
  }

  onMouseLeave = () => {
    this.setState({
      active: false
    });
  }

  render() {
    let className = this.state.active ? 'action-icon sf2-icon-x3' : 'action-icon vh sf2-icon-x3';
    const relatedFile = this.props.relatedFile;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><a href={relatedFile.link} target='_blank'>{relatedFile.name}</a></td>
        <td>{relatedFile.repo_name}</td>
        <td>{relatedFile.size}</td>
        <td>{relatedFile.mtime_relative}</td>
        <td><i className={className} onClick={this.props.onDeleteRelatedFile.bind(this, relatedFile)}></i></td>
        <td></td>
      </tr>
    );
  }
}

RelatedFile.propTypes = RelatedFilePropTypes;

export default ListRelatedFileDialog;
