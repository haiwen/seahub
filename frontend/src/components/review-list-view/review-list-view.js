import React from 'react';
import PropTypes from 'prop-types';
import { Nav, NavItem, NavLink } from 'reactstrap';
import classnames from 'classnames';
import { gettext } from '../../utils/constants';
import ReviewListItem from './review-list-item';

const propTypes = {
  isItemFreezed: PropTypes.bool.isRequired,
  itemsList: PropTypes.array.isRequired,
};

class ReviewListView extends React.Component {

    constructor(props) {
      super(props);
  
      this.toggle = this.toggle.bind(this);
      this.state = {
        activeTab: 'open'
      };
    }

  toggle(tab) {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab
      });
    }
  }

  render() {
    let items = this.props.itemsList;
    let { activeTab } = this.state;
    return (
      <div className="table-container">
        <Nav tabs>
          <NavItem>
            <NavLink
              className={classnames({ active: this.state.activeTab === 'open' })}
              onClick={() => { this.toggle('open');}}
              >
              Open
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={classnames({ active: this.state.activeTab === 'finished' })}
              onClick={() => { this.toggle('finished');}}
              >
              Published
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={classnames({ active: this.state.activeTab === 'closed' })}
              onClick={() => { this.toggle('closed');}}
              >
              Closed
            </NavLink>
          </NavItem>
        </Nav>
        <table>
          <thead>
            <tr>
              <th style={{width: '4%'}}>{/*img*/}</th>
              <th style={{width: '26%'}}>{gettext('Name')}</th>
              <th style={{width: '20%'}}>{gettext('Library')}</th>
              <th style={{width: '20%'}}>{gettext('Last Update')}</th>
              <th style={{width: '10%'}}></th>
            </tr>
          </thead>
          <tbody>
            { items && items.map((item) => {
              if(item.status === activeTab) {
                return (
                    <ReviewListItem 
                      key={item.id} 
                      item={item} 
                      isItemFreezed={this.props.isItemFreezed}
                    />
                );
              }
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

ReviewListView.propTypes = propTypes;

export default ReviewListView;
