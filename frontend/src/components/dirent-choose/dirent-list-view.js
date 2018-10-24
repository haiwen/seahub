import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import Dirent from '../../models/dirent';
import DirentListItem from './dirent-list-item';

const propTypes = {
  moveToPath: PropTypes.string,
  repo: PropTypes.object.isRequired,
  isShowChildren: PropTypes.bool.isRequired,
  onDirentItemClick: PropTypes.func.isRequired
};

class DirentListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      direntList: [],
    };
  }

  componentDidMount() {
    let repo = this.props.repo;
    seafileAPI.listDir(repo.repo_id, '/').then(res => {
      let direntList = [];
      res.data.forEach(item => {
        if (item.type === 'dir') {
          let dirent = new Dirent(item);
          direntList.push(dirent);
        }
        this.setState({
          direntList: direntList,
        });
      });
    });
  }

  render() {
    let { direntList } = this.state;
    return (
      <ul className={`list-view-content ${this.props.isShowChildren ? '' : 'hide'}`}>
        { direntList.map((dirent, index) => {
          return (
            <DirentListItem 
              key={index} 
              repo={this.props.repo} 
              dirent={dirent}
              onDirentItemClick={this.props.onDirentItemClick}
              moveToPath={this.props.moveToPath}
            />
          );
        })}
      </ul>
    );
  }
}

DirentListView.propTypes = propTypes;

export default DirentListView;
