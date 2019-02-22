import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Nav, NavItem, NavLink } from 'reactstrap';
import classnames from 'classnames';
import { gettext } from '../../utils/constants';
import ReviewListItem from './review-list-item';

const propTypes = {
  isItemFreezed: PropTypes.bool.isRequired,
  itemsList: PropTypes.array.isRequired,
  getReviewList: PropTypes.func.isRequired,
  activeTab: PropTypes.string.isRequired,
};

class ReviewListView extends React.Component {

  constructor(props) {
    super(props);
    this.toggle = this.toggle.bind(this);
  }

  toggle(tab) {
    if (this.props.activeTab !== tab) {
      this.props.getReviewList(tab);
    }
  }

  render() {
    let items = this.props.itemsList;
    return (
      <Fragment>
        <Nav pills>
          <NavItem className="pt-4">
            <NavLink
              className={classnames({ active: this.props.activeTab === 'open' })}
              onClick={() => { this.toggle('open');}}
            >
              {gettext('Open')}
            </NavLink>
          </NavItem>
          <NavItem className="pt-4">
            <NavLink
              className={classnames({ active: this.props.activeTab === 'finished' })}
              onClick={() => { this.toggle('finished');}}
            >
              {gettext('Published')}
            </NavLink>
          </NavItem>
          <NavItem className="pt-4">
            <NavLink
              className={classnames({ active: this.props.activeTab === 'closed' })}
              onClick={() => { this.toggle('closed');}}
            >
              {gettext('Closed')}
            </NavLink>
          </NavItem>
        </Nav>
        <table>
          <thead>
            <tr>
              <th style={{width: '4%'}}>{/*img*/}</th>
              <th style={{width: '26%'}}>{gettext('Name')}</th>
              <th style={{width: '25%'}}>{gettext('Library')}</th>
              <th style={{width: '20%'}}>{gettext('Last Update')}</th>
              <th style={{width: '10%'}}>{gettext('Author')}</th>
              <th style={{width: '15%'}}>{gettext('Reviewers')}</th>
            </tr>
          </thead>
          <tbody>
            { items && items.map((item) => {
              return (
                <ReviewListItem 
                  key={item.id} 
                  item={item} 
                  isItemFreezed={this.props.isItemFreezed}
                />
              );
            })}
          </tbody>
        </table>
      </Fragment>
    );
  }
}

ReviewListView.propTypes = propTypes;

export default ReviewListView;
