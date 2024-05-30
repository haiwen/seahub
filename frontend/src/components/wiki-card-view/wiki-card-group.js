import React, { Component } from 'react';
import PropTypes from 'prop-types';
import WikiCardItem from './wiki-card-item';

const propTypes = {
  wikis: PropTypes.array.isRequired,
  deleteWiki: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  isDepartment: PropTypes.bool.isRequired,
};

class WikiCardGroup extends Component {
  render() {
    let { wikis, title, isDepartment } = this.props;
    return (
      <div className='wiki-card-group mb-4'>
        <h4 className="sf-heading">
          <span className={`sf3-font nav-icon sf3-font-${isDepartment ? 'department' : 'mine'}`} aria-hidden="true"></span>
          {title}
        </h4>
        <div className='wiki-card-group-items'>
          {wikis.map((wiki, index) => {
            return (
              <WikiCardItem
                key={index}
                wiki={wiki}
                deleteWiki={this.props.deleteWiki}
              />
            );
          })}
        </div>
      </div>
    );
  }
}

WikiCardGroup.propTypes = propTypes;

export default WikiCardGroup;
