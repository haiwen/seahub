import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import DraftListItem from './draft-list-item';

const propTypes = {
  draftList: PropTypes.array.isRequired,
  onDeleteHandler: PropTypes.func.isRequired,
  onPublishHandler: PropTypes.func.isRequired,
};

class DraftListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  render() {
    let drafts = this.props.draftList;
    return (
      <table>
        <thead>
          <tr>
            <th style={{width: '4%'}}>{/*img*/}</th>
            <th style={{width: '46%'}}>{gettext('Name')}</th>
            <th style={{width: '30%'}}>{gettext('Library')}</th>
            <th style={{width: '10%'}}>{gettext('Last Update')}</th>
            <th style={{width: '10%'}}></th>
          </tr>
        </thead>
        <tbody>
          { drafts && drafts.map((draft) => {
            return (
              <DraftListItem
                key={draft.id}
                draft={draft}
                isItemFreezed={this.state.isItemFreezed}
                onFreezedItem={this.onFreezedItem}
                onUnfreezedItem={this.onUnfreezedItem}
                onDeleteHandler={this.props.onDeleteHandler}
                onPublishHandler={this.props.onPublishHandler}
              />
            );
          })}
        </tbody>
      </table>
    );
  }
}

DraftListView.propTypes = propTypes;

export default DraftListView;
