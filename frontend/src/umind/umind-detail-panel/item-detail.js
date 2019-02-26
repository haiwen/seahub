import React from 'react';
import PropTypes from 'prop-types';
import { withPropsAPI } from 'gg-editor';

const propTypes = {

};

class ItemDetail extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      label: '',
    }
  }

  componentDidMount() {
    let { propsAPI } = this.props;
    let { getSelected } = propsAPI;
    let item = getSelected()[0];
    let { label } = item.getModel();

    this.setState({label: label});
  }

  componentWillReceiveProps(nextProps) {
    let { propsAPI } = this.props;
    let { getSelected } = propsAPI;
    let item = getSelected()[0];
    let { label } = item.getModel();

    this.setState({label: label});
  }

  onChangeHandler = (e) => {
    let value = e.target.value;
    this.setState({
      label: value
    });
  }

  onUpdateItem = () => {
    let { propsAPI } = this.props;
    let { getSelected, executeCommand, update } = propsAPI;
    let item = getSelected()[0];

    executeCommand(() => {
      update(item, {label: this.state.label});
    });
  }

  render() {

    return (
      <div className="item-detail">
        <div className="item-title"></div>
        <div className="item-properties">
          <label>标签</label>
          <input id="name" type="text" value={this.state.label} onChange={this.onChangeHandler} onBlur={this.onUpdateItem}></input>
        </div>
      </div>
    );
  }
}

ItemDetail.propTypes = propTypes;

export default withPropsAPI(ItemDetail);
