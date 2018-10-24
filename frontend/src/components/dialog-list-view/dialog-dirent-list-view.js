import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import Dirent from '../../models/dirent';
import DialogDirentListItem from './dialog-dirent-list-item';

const propTypes = {
  repo: PropTypes.object.isRequired,
  isShowChildren: PropTypes.bool.isRequired,
};
class DialogDirentListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      direntList: [],
      isShowChildren: this.props.initToShow,
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
      })
    });
  }

  render() {
    let { direntList } = this.state;
    return (
      <ul className={`list-view-content ${this.props.isShowChildren ? '' : 'hide'}`}>
        { direntList.map((dirent, index) => {
          return (
            <DialogDirentListItem 
              key={index} 
              repo={this.props.repo} 
              dirent={dirent} 
              onItemClick={this.props.onItemClick}
              moveToPath={this.props.moveToPath}
            />
          );
        })}
      </ul>
    );
  }
}

DialogDirentListView.propTypes = propTypes;

export default DialogDirentListView;
