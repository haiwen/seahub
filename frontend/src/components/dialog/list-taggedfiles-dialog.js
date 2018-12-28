import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import moment from 'moment';
import { Utils } from '../../utils/utils';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  currentTag: PropTypes.object.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

class ListTaggedFilesDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      taggedFileList: [],
    };
  }

  componentDidMount() {
    this.getTaggedFiles();
  }

  getTaggedFiles = () => {
    let { repoID, currentTag } = this.props;
    seafileAPI.listTaggedFiles(repoID, currentTag.id).then(res => {
      let taggedFileList = [];
      res.data.tagged_files !== undefined &&
      res.data.tagged_files.forEach(file => {
        let taggedFile = file;
        taggedFileList.push(taggedFile)
      });
      this.setState({
        taggedFileList: taggedFileList,
      })
    });
  }

  render() {
    let taggedFileList = this.state.taggedFileList;
    return (
      <Fragment>
        <ModalHeader toggle={this.props.onClose}>
          <span className="tag-dialog-back fas fa-sm fa-arrow-left" onClick={this.props.toggleCancel} aria-label={gettext('Back')}></span>
          {gettext('Tagged Files')}
        </ModalHeader>
        <ModalBody className="dialog-list-container">
          <table>
            <thead className="table-thead-hidden">
              <tr>
                <th width='50%' className="ellipsis">{gettext('Name')}</th>
                <th width='25%'>{gettext('Size')}</th>
                <th width='25%'>{gettext('Last Update')}</th>
              </tr>
            </thead>
            <tbody>
              {taggedFileList.map((taggedFile, index) => {
                let path = Utils.joinPath(taggedFile.parent_path, taggedFile.filename);
                let href = '';
                if (Utils.isMarkdownFile(path)) {
                  href = siteRoot + 'wiki/lib/' + this.props.repoID + Utils.encodePath(path);
                } else {
                  href = siteRoot + 'lib/' + this.props.repoID + '/file' + Utils.encodePath(path);
                }
                return (
                  <tr key={index}>
                    <td className="name">
                      <a href={href} target='_blank'>{taggedFile.filename}</a>
                    </td>
                    <td>{Utils.bytesToSize(taggedFile.size)}</td>
                    <td>{moment.unix(taggedFile.mtime).fromNow()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleCancel}>{gettext('Close')}</Button>
        </ModalFooter>
      </Fragment>
    );
  }
}

ListTaggedFilesDialog.propTypes = propTypes;

export default ListTaggedFilesDialog;
