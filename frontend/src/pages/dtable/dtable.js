import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, ModalHeader, ModalBody, ModalFooter, Alert, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot } from '../../utils/constants';
import Loading from '../../components/loading';
import ModalPortal from '../../components/modal-portal';
import CreateWorkSpaceDialog from '../../components/dialog/create-workspace-dialog';

moment.locale(window.app.config.lang);


const itemPropTypes = {
  item: PropTypes.object.isRequired,
  renameWorkSpace: PropTypes.func.isRequired,
  deleteWorkSpace: PropTypes.func.isRequired,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false,
      newName: '',
    };
  }

  onRenameWorkSpace(workspace) {
    let name = this.state.newName;
    this.props.renameWorkSpace(workspace, name);
  }

  onDeleteWorkSpace(workspace) {
    this.props.deleteWorkSpace(workspace);
  }

  dropdownToggle = () => {
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  }

  render() {
    let item = this.props.item;

    return(
      <Fragment>
        <tr>
          <td colSpan='5'>
            {item.name}
            <Dropdown isOpen={this.state.dropdownOpen} toggle={this.dropdownToggle} direction="down">
              <DropdownToggle
                caret={true}
                tag='i'
                title={gettext('More Operations')}
                data-toggle="dropdown" 
                aria-expanded={this.state.dropdownOpen}
              >
              </DropdownToggle>
              <DropdownMenu className="drop-list" right={true}>
                <DropdownItem onClick={this.onRenameWorkSpace.bind(this, item)}>{gettext('Rename')}</DropdownItem>
                <DropdownItem onClick={this.onDeleteWorkSpace.bind(this, item)}>{gettext('Delete')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </td>
        </tr>
        {item.table_list.map((table, index) => {
          let tableHref = siteRoot + 'lib/' + item.repo_id + '/file' + Utils.encodePath(Utils.joinPath('/', table.name));
          return (
            <tr key={index}>
              <td></td>
              <td><a href={tableHref} target="_blank">{table.name}</a></td>
              <td>{table.modifier}</td>
              <td>{moment(table.mtime).fromNow()}</td>
              <td></td>
            </tr>
          );
        })}
        <tr>
          <td><Button className="fa fa-plus"></Button></td>
          <td colSpan='4' >{gettext('Add a table')}</td>
        </tr>
      </Fragment>
    );
  }
}

Item.propTypes = itemPropTypes;


const contentPropTypes = {
  items: PropTypes.array.isRequired,
  renameWorkSpace: PropTypes.func.isRequired,
  deleteWorkSpace: PropTypes.func.isRequired,
};

class Content extends Component {

  render() {
    let items = this.props.items;

    return ( 
      <table width="100%" className="table table-hover table-vcenter">
        <colgroup>
          <col width="5%"/>
          <col width="30%"/>
          <col width="30%"/>
          <col width="30%"/>
          <col width="5%"/>
        </colgroup>
        <tbody>
          {items.map((item, index) => {
            return (
              <Item
                key={index}
                item={item}
                renameWorkSpace={this.props.renameWorkSpace}
                deleteWorkSpace={this.props.deleteWorkSpace}
              />
            );
          })}
        </tbody>
      </table>
    );
  }
}

Content.propTypes = contentPropTypes;


class DTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
      isShowCreateDialog: false,
    };
  }

  onCreateToggle = () => {
    this.setState({
      isShowCreateDialog: !this.state.isShowCreateDialog,
    });
  }

  createWorkSpace = (name) => {
    seafileAPI.addWorkSpace(name).then((res) => {
      this.state.items.push(res.data.workspace);
      this.setState({items: this.state.items});
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      }
    });
    this.onCreateToggle();
  }

  renameWorkSpace = (workspace, name) => {
    seafileAPI.renameWorkSpace(workspace.id, name).then((res) => {
      let items = this.state.items.map((item) => {
        if (item.id === workspace.id) {
          item = res.data;
        }
        return item;
      });
      this.setState({items: items});
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      }
    });
  }

  deleteWorkSpace = (workspace) => {
    seafileAPI.deleteWorkSpace(workspace.id).then(() => {
      let items = this.state.items.filter(item => {
        return item.id !== workspace.id;
      });
      this.setState({items: items});
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      }
    });
  }

  componentDidMount() {
    seafileAPI.listWorkSpaces().then((res) => {
      this.setState({
        loading: false,
        items: res.data.workspace_list,
      });
    }).catch((error) => {
      if (error.response) {
        this.setState({
          loading: false,
          errorMsg: gettext('Error')
        });
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container" id="starred">
          <div className="cur-view-path">
            <h3 className="sf-heading">{gettext('DTable')}</h3>
          </div>
          <div className="cur-view-content">
            {this.state.loading && <Loading />}
            {(!this.state.loading && this.state.errorMsg) && 
              <p className="error text-center">{this.state.errorMsg}</p>
            }
            {!this.state.loading &&
              <Fragment>
                <Content
                  items={this.state.items}
                  renameWorkSpace={this.renameWorkSpace}
                  deleteWorkSpace={this.deleteWorkSpace}
                />
                <br />
                <div>
                  {this.state.isShowCreateDialog &&
                    <CreateWorkSpaceDialog
                      createWorkSpace={this.createWorkSpace}
                      onCreateToggle={this.onCreateToggle}
                    />
                  }
                  <Button onClick={this.onCreateToggle} className="fa fa-plus">
                    {gettext('Add a workspace')}
                  </Button>
                </div>
              </Fragment>
            }
          </div>
        </div>
      </div>
    );
  }
}

export default DTable;
