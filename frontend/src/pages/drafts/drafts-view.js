import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot, gettext } from '../../utils/constants';
import { Link } from '@reach/router';

const propTypes = {
  currentTab: PropTypes.string.isRequired,
  children: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object
  ]).isRequired,
  tabItemClick: PropTypes.func.isRequired,
};

class DraftsView extends React.Component {

  tabItemClick = (param) => {
    this.props.tabItemClick(param);
  }
  
  render() {
    return (
      <div className="cur-view-container">
        <div className="cur-view-path">
          <ul className="tab-tabs-nav">
            <li className={`tab ${this.props.currentTab === 'drafts' ? 'ui-state-active': ''}`} onClick={() => this.tabItemClick('drafts')}>
              <Link  className='a' to={siteRoot + 'drafts/'} title={gettext('Drafts')}>
                {gettext('Drafts')}
              </Link>
            </li>
            <li className={`tab ${this.props.currentTab === 'reviews' ? 'ui-state-active': ''}`} onClick={() => this.tabItemClick('reviews')}>
              <Link  className='a' to={siteRoot + 'drafts/reviews/'} title={gettext('reviews')}>
                {gettext('Reviews')}
              </Link>
            </li>
          </ul>
        </div>
        {this.props.children}
      </div>
    );
  }
}

DraftsView.propTypes = propTypes;

export default DraftsView;
