import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../../../../utils/utils';
import { gettext, siteRoot } from '../../../../../utils/constants';

class FolderRecord extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isIconShown: false
    };
  }

  handleMouseOver = () => {
    this.setState({ isIconShown: true });
  };

  handleMouseOut = () => {
    this.setState({ isIconShown: false });
  };

  renderFolder = (e) => {
    e.preventDefault();
    const { commitID, baseDir, folderPath, record } = this.props;
    this.props.renderFolder(commitID, baseDir, Utils.joinPath(folderPath, record.name));
  };

  render() {
    const { commitID, baseDir, folderPath, record, isDesktop } = this.props;

    if (isDesktop) {
      return record.type == 'dir' ? (
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td className="pl-2 pr-2"><img src={Utils.getFolderIconUrl()} alt={gettext('Folder')} width="24" /></td>
          <td><a href="#" onClick={this.renderFolder}>{record.name}</a></td>
          <td>{record.parent_dir}</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      ) : (
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td className="pl-2 pr-2">
            <img src={Utils.getFileIconUrl(record.name)} alt={gettext('File')} width="24" />
          </td>
          <td>
            <a href={`${siteRoot}repo/${this.props.repoID}/trash/files/?obj_id=${record.obj_id}&commit_id=${commitID}&base=${encodeURIComponent(baseDir)}&p=${encodeURIComponent(Utils.joinPath(folderPath, record.name))}`} target="_blank" rel="noreferrer">
              {record.name}
            </a>
          </td>
          <td>{record.parent_dir}</td>
          <td></td>
          <td>{Utils.bytesToSize(record.size)}</td>
          <td></td>
        </tr>
      );
    } else { // for mobile
      return record.type == 'dir' ? (
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td
            className="text-center"
            onClick={this.renderFolder}
          >
            <img src={Utils.getFolderIconUrl()} alt={gettext('Folder')} width="24" />
          </td>
          <td onClick={this.renderFolder}>
            <a href="#" onClick={this.renderFolder}>{record.name}</a>
            <br />
            <span className="item-meta-info">{record.parent_dir}</span>
          </td>
          <td></td>
        </tr>
      ) : (
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td className="text-center">
            <img src={Utils.getFileIconUrl(record.name)} alt={gettext('File')} width="24" />
          </td>
          <td>
            <a href={`${siteRoot}repo/${this.props.repoID}/trash/files/?obj_id=${record.obj_id}&commit_id=${commitID}&base=${encodeURIComponent(baseDir)}&p=${encodeURIComponent(Utils.joinPath(folderPath, record.name))}`} target="_blank" rel="noreferrer">
              {record.name}
            </a>
            <br />
            <span className="item-meta-info">{record.parent_dir}</span>
            <br />
            <span className="item-meta-info">{Utils.bytesToSize(record.size)}</span>
          </td>
          <td></td>
        </tr>
      );
    }
  }
}

FolderRecord.propTypes = {
  record: PropTypes.object.isRequired,
  commitID: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  baseDir: PropTypes.string.isRequired,
  folderPath: PropTypes.string.isRequired,
  renderFolder: PropTypes.func.isRequired,
};

export default FolderRecord;
