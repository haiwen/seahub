import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext, username } from '../../utils/constants';
import WikiCardItem from './wiki-card-item';

const propTypes = {
  wikis: PropTypes.array.isRequired,
  deleteWiki: PropTypes.func.isRequired,
  owner: PropTypes.string.isRequired,
};

class WikiCardGroup extends Component {
  render() {
    let { wikis, owner } = this.props;
    return (
      <div className='wiki-card-group'>
        <h4 className="sf-heading my-4">
          <span className={`sf3-font nav-icon sf3-font-${username === owner ? 'mine' : 'department'}`} aria-hidden="true"></span>
          {username === owner ? gettext('My Wikis') : wikis[0].owner_nickname}
        </h4>
        <div className='wiki-card-group-items'>
          {wikis.map((wiki, index) => {
            return (
              <WikiCardItem
                key={index}
                wiki={wiki}
                deleteWiki={this.props.deleteWiki}
                owner={owner}
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
