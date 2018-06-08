import React from 'react'
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Tooltip } from 'reactstrap'
import { translate } from "react-i18next";

class DropDownBox extends React.Component {
  constructor(props) {
    super(props);
    this.state= {
      dropdownOpen:false
    }
  }

  toggle= () => {
    this.setState({
      dropdownOpen:!this.state.dropdownOpen
    });
  }

  render() {
    return (
      <Dropdown isOpen={this.state.dropdownOpen} toggle={this.toggle}>
        <DropdownToggle caret>
        {this.props.t('set_align')}
        </DropdownToggle>
        <DropdownMenu className={'drop-list'}>
          <DropdownItem onMouseDown={e => this.props.onSetAlign(e, 'left')}>{this.props.t('left')}</DropdownItem>
          <DropdownItem onMouseDown={e => this.props.onSetAlign(e, 'center')}>{this.props.t('center')}</DropdownItem>
          <DropdownItem onMouseDown={e => this.props.onSetAlign(e, 'right')}>{this.props.t('right')}</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    )
  }
}

let TransDropDownBox = translate("translations")(DropDownBox);

class MoreMenu extends React.Component {

  constructor(props) {
    super(props);
    this.DropDowntoggle = this.DropDowntoggle.bind(this);
    this.ToolTipToggle = this.ToolTipToggle.bind(this);
    this.state = {
      tooltipOpen: false,
      dropdownOpen:false
    }
  }

  ToolTipToggle() {
    this.setState({
      tooltipOpen: !this.state.tooltipOpen
    })
  }

  DropDowntoggle= () => {
    this.setState({
      dropdownOpen:!this.state.dropdownOpen
    });
  }

  render() {

    return (
      <Dropdown isOpen={this.state.dropdownOpen} toggle={this.DropDowntoggle}>
        <DropdownToggle id={this.props.id}>
          <i className="fa fa-ellipsis-v"/>
          <Tooltip toggle={this.ToolTipToggle} delay={{show: 0, hide: 0}} target={this.props.id}  placement='bottom'  isOpen={this.state.tooltipOpen}>
            {this.props.text}
          </Tooltip>
        </DropdownToggle>
        <DropdownMenu className={'drop-list'}>
          <DropdownItem onMouseDown={this.props.switchToPlainTextEditor}>{this.props.t('switch_to_plain_text_editor')}</DropdownItem>
          <DropdownItem onMouseDown={this.props.switchToMarkDownViewer}>{this.props.t('switch_to_viewer')}</DropdownItem>
          <DropdownItem onMouseDown={this.props.showHelpDialog}>{this.props.t('help')}</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    )
  }
}

class ButtonGroup extends React.Component {
  render() {
    return (
      <div className={"btn-group"} role={"group"}>
        {this.props.children}
      </div>
    )
  }
}

class Button extends React.Component {
  render() {
    return (
      <button type={"button"} onMouseDown={this.props.onMouseDown}
        className={"btn btn-secondary btn-active"}>
        { this.props.children }
      </button>
    )
  }
}

class IconButton extends React.Component {

  constructor(props) {
    super(props);

    this.toggle = this.toggle.bind(this);
    this.state = {
      tooltipOpen: false
    }
  }

  toggle() {
    this.setState({
      tooltipOpen: !this.state.tooltipOpen
    })
  }

  render() {
    return (
      <button id={this.props.id} type={"button"} onMouseDown={this.props.onMouseDown}
              className={"btn btn-icon btn-secondary btn-active"}
              data-active={ this.props.isActive || false }
              disabled={this.props.disabled}>
        <i className={this.props.icon}/>
        <Tooltip toggle={this.toggle} delay={{show: 0, hide: 0}} target={this.props.id}  placement='bottom'  isOpen={this.state.tooltipOpen}>
          {this.props.text}
        </Tooltip>
      </button>
    )
  }
}

class CollabUsersButton extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      dropdownOpen: false,
      tooltipOpen: false,
    }
  }

  dropdownToggle = () => {
    this.setState({
      dropdownOpen: !this.state.dropdownOpen
    });
  }

  tooltipToggle = () => {
    this.setState({
      tooltipOpen: !this.state.tooltipOpen && !this.state.dropdownOpen
    })
  }

  render() {
    return (
      <Dropdown isOpen={this.state.dropdownOpen} toggle={this.dropdownToggle}>
        <DropdownToggle id={this.props.id}>
          <i className="fa fa-users"></i> {this.props.users.length}
          <Tooltip toggle={this.tooltipToggle} delay={{show: 0, hide: 0}} target={this.props.id} placement='bottom' isOpen={this.state.tooltipOpen}>
            {this.props.tooltip}
          </Tooltip>
        </DropdownToggle>
        <DropdownMenu className={'drop-list'}>
          {
            this.props.users.map((user, idx) => (
              <DropdownItem key={idx}><i className="fa fa-user"></i> {user.name}</DropdownItem>
            ))
          }
      </DropdownMenu>
        </Dropdown>
    )
  }
  
}


class TableToolBar extends React.Component {
  render() {
    return (
      <div className={'tableToolBar'}>
        <ButtonGroup>
        <Button onMouseDown={this.props.onRemoveTable}>{this.props.t('remove_table')}</Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button onMouseDown={this.props.onInsertColumn}>+</Button>
          <Button>{this.props.t('column')}</Button>
          <Button onMouseDown={this.props.onRemoveColumn}>-</Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button onMouseDown={this.props.onInsertRow}>+</Button>
          <Button>{this.props.t('row')}</Button>
          <Button onMouseDown={this.props.onRemoveRow}>-</Button>
        </ButtonGroup>
        <TransDropDownBox onSetAlign={this.props.onSetAlign}/>
      </div>
    )
  }
}

<<<<<<< HEAD
class HeaderList extends React.Component {
  constructor(props) {
    super(props);
    this.state= {
      dropdownOpen:false,
    }
  }

  toggle= () => {
    this.setState({
      dropdownOpen:!this.state.dropdownOpen
    });
  }

  render() {
    return (
      <Dropdown isOpen={this.state.dropdownOpen} toggle={this.toggle}>
        <DropdownToggle caret>
          {this.props.t(this.props.headerType)}
        </DropdownToggle>
        <DropdownMenu className={'drop-list'}>
          <DropdownItem onMouseDown={event => {this.props.onClickBlock(event, "paragraph")}}>{this.props.t('paragraph')}</DropdownItem>
          <DropdownItem onMouseDown={event => {this.props.onClickBlock(event, "header_one")}}>{this.props.t('header_one')}</DropdownItem>
          <DropdownItem onMouseDown={event => {this.props.onClickBlock(event, "header_two")}}>{this.props.t('header_two')}</DropdownItem>
          <DropdownItem onMouseDown={event => {this.props.onClickBlock(event, "header_three")}}>{this.props.t('header_three')}</DropdownItem>
          <DropdownItem onMouseDown={event => {this.props.onClickBlock(event, "header_four")}}>{this.props.t('header_four')}</DropdownItem>
          <DropdownItem onMouseDown={event => {this.props.onClickBlock(event, "header_five")}}>{this.props.t('header_five')}</DropdownItem>
          <DropdownItem onMouseDown={event => {this.props.onClickBlock(event, "header_six")}}>{this.props.t('header_six')}</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    )
  }
}

TableToolBar = translate("translations")(TableToolBar);
MoreMenu = translate("translations")(MoreMenu);
HeaderList = translate("translations")(HeaderList);

export { IconButton, TableToolBar, Button, ButtonGroup, MoreMenu, HeaderList }
=======
export { IconButton, CollabUsersButton, TableToolBar, Button, ButtonGroup, MoreMenu }
>>>>>>> [frontend/editor] Using socket.io to show online/editing users
