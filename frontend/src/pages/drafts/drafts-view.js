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
      <div className="main-panel-center">
        <div className="cur-view-container">
          <div className="cur-view-path draft-review-nav">
            <ul className="nav">
              <li className="nav-item"  onClick={() => this.tabItemClick('drafts')}>
                <Link className={`nav-link ${this.props.currentTab === 'drafts' ? 'active': ''}`} to={siteRoot + 'drafts/'} title={gettext('Drafts')}>{gettext('Drafts')}</Link>
              </li>
              <li className="nav-item" onClick={() => this.tabItemClick('reviews')}>
                <Link className={`nav-link ${this.props.currentTab === 'reviews' ? 'active': ''}`} to={siteRoot + 'drafts/reviews/'} title={gettext('Reviews')}>{gettext('Reviews')}</Link>
              </li>
            </ul>
          </div>
          {this.props.children}
        </div>
      </div>
    );
  }
}

DraftsView.propTypes = propTypes;

export default DraftsView;
