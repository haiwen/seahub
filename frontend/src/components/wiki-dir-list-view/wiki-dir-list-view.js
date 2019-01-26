import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import WikiDirListItem from './wiki-dir-list-item';

const propTypes = {
  path: PropTypes.string.isRequired,
  direntList: PropTypes.array.isRequired,
  onDirentClick: PropTypes.func.isRequired,
};

class WikiDirListView extends React.Component {

  render() {
    return (
      <table>
        <thead>
          <tr>
            <th style={{width: '4%'}}></th>
            <th style={{width: '66%'}}>{gettext('Name')}</th>
            <th style={{width: '15%'}}>{gettext('Size')}</th>
            <th style={{width: '15%'}}>{gettext('Last Update')}</th>
          </tr>
        </thead>
        <tbody>
          {this.props.direntList.length !== 0 && this.props.direntList.map((dirent, index) => {
            return (
              <WikiDirListItem key={index} path={this.props.path} dirent={dirent} onDirentClick={this.props.onDirentClick}/>
            );
          })}
        </tbody>
      </table>
    );
  }
}

WikiDirListView.propTypes = propTypes;

export default WikiDirListView;
