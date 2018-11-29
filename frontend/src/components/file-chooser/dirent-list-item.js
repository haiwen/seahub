import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import Dirent from '../../models/dirent';

const propTypes = {
  isShowFile: PropTypes.bool,
  filePath: PropTypes.string,
  selectedPath: PropTypes.string,
  dirent: PropTypes.object.isRequired,
  repo: PropTypes.object.isRequired,
  onDirentItemClick: PropTypes.func.isRequired,
};

class DirentListItem extends React.Component {

  constructor(props) {
    super(props);

    let filePath = this.props.filePath ?  this.props.filePath +  '/' + this.props.dirent.name : '/' + this.props.dirent.name;
    
    this.state = {
      isShowChildren: false,
      hasRequest: false,
      hasChildren: true,
      filePath: filePath,
      direntList: [],
    };
  }

  onItemClick = () => {
    let { isShowFile, dirent } = this.props;
    if (isShowFile === true) {
      if (dirent.type === 'file') {
        this.props.onDirentItemClick(this.state.filePath);
      }
    }
    else {
      this.props.onDirentItemClick(this.state.filePath);
    }
  }

  onToggleClick = () => {
    if (!this.state.hasRequest) {
      seafileAPI.listDir(this.props.repo.repo_id, this.state.filePath).then(res => {
        let direntList = [];
        if (this.props.isShowFile === true) {
          res.data.forEach(item => {
            let dirent = new Dirent(item);
            direntList.push(dirent);
            this.setState({
              hasRequest: true,
              direntList: direntList,
            });
          });
        }
        else {
          res.data.forEach(item => {
            if (item.type === 'dir') {
              let dirent = new Dirent(item);
              direntList.push(dirent);
            }
            this.setState({
              hasRequest: true,
              direntList: direntList,
            });
          });
        }

        if (res.data.length === 0 || direntList.length === 0) {
          this.setState({
            hasRequest: true,
            direntList: [],
            hasChildren: false
          });
        }
      });
    }
    
    this.setState({isShowChildren: !this.state.isShowChildren});
  }

  renderChildren = () => {
    return (
      <ul className="list-view-content">
        {this.state.direntList.map((dirent, index) => {
          return (
            <DirentListItem 
              key={index} 
              dirent={dirent}
              repo={this.props.repo}
              filePath={this.state.filePath}
              onItemClick={this.onItemClick}
              selectedPath={this.props.selectedPath}
              onDirentItemClick={this.props.onDirentItemClick}
              isShowFile={this.props.isShowFile}
            />
          );
        })}
      </ul>
    );
  }

  render() {
    return (
      <li className="file-chooser-item">
        {
          this.state.hasChildren && this.props.dirent.type !== 'file' &&
          <span className={`item-toggle fa ${this.state.isShowChildren ? 'fa-caret-down' : 'fa-caret-right'}`} onClick={this.onToggleClick}></span>
        }
        <span className={`item-info ${this.state.filePath === this.props.selectedPath ? 'item-active' : ''}`} onClick={this.onItemClick}>
          <span className={`icon far ${this.props.dirent.type === 'dir' ? 'fa-folder' : 'fa-file'}`}></span>
          <span className="name">{this.props.dirent && this.props.dirent.name}</span>
        </span>
        {this.state.isShowChildren && this.renderChildren()}
      </li>
    );
  }
}

DirentListItem.propTypes = propTypes;

export default DirentListItem;
