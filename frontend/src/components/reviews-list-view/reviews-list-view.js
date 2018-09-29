import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../constants';
import ListItem from './list-item';

const propTypes = {
  isItemFreezed: PropTypes.bool.isRequired,
  itemsList: PropTypes.array.isRequired,
  onMenuToggleClick: PropTypes.func.isRequired,
};

class ReviewsListView extends React.Component {

  render() {
    let items = this.props.itemsList;
    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{width: '4%'}}>{/*img*/}</th>
              <th style={{width: '46%'}}>{gettext('Name')}</th>
              <th style={{width: '20%'}}>{gettext('Status')}</th>
              <th style={{width: '20%'}}>{gettext('Last Update')}</th>
              <th style={{width: '10%'}}></th>
            </tr>
          </thead>
          <tbody>
            { items && items.map((item) => {
              return (
                <ListItem 
                  key={item.id} 
                  item={item} 
                  onMenuToggleClick={this.props.onMenuToggleClick} 
                  isItemFreezed={this.props.isItemFreezed}
                />
              );
            })}
          </tbody>
        </table>
     </div>
    );
  }
}

ReviewsListView.propTypes = propTypes;

export default ReviewsListView;
