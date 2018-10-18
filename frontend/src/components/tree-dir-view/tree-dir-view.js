import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import TreeDirList from './tree-dir-list';

const propTypes = {
  node: PropTypes.object.isRequired,
  onMainNodeClick: PropTypes.func.isRequired,
};

class TreeDirView extends React.Component {

  render() {
    let node = this.props.node;
    let children = node.hasChildren() ? node.children : null;

    return (
      <div className="table-container">
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
            {children && children.map((node, index) => {
              return (
                <TreeDirList key={index} node={node} onMainNodeClick={this.props.onMainNodeClick}/>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

TreeDirView.propTypes = propTypes;

export default TreeDirView;