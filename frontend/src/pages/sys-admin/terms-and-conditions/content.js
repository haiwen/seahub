import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Item from './item';

const propTypes = {
  loading: PropTypes.bool.isRequired,
  items: PropTypes.array.isRequired,
  errorMsg: PropTypes.string,
  deleteTerm: PropTypes.func.isRequired,
  updateTerm: PropTypes.func.isRequired,
};

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No terms and conditions')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="20%">{gettext('Name')}</th>
                <th width="10%">{gettext('Version')}</th>
                <th width="25%">{gettext('Text')}</th>
                <th width="20%">{gettext('Created')}</th>
                <th width="20%">{gettext('Activated')}</th>
                <th width="5%">{/* operation */}</th>
              </tr>
            </thead>
            {items &&
              <tbody>
                {items.map((item, index) => {
                  return (<Item
                    key={index}
                    item={item}
                    isItemFreezed={this.state.isItemFreezed}
                    onFreezedItem={this.onFreezedItem}
                    onUnfreezedItem={this.onUnfreezedItem}
                    deleteTerm={this.props.deleteTerm}
                    updateTerm={this.props.updateTerm}
                  />);
                })}
              </tbody>
            }
          </table>
        </Fragment>
      );
      return items.length ? table : emptyTip;
    }
  }
}

Content.propTypes = propTypes;

export default Content;

