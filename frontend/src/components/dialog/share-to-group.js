import React from 'react';
import PropTypes from 'prop-types';
import { Button, Input, Table } from 'reactstrap';
import Select from 'react-select';
import makeAnimated from 'react-select/lib/animated';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api.js';

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired
};

class ShareToGroup extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errorMsg: [],
      permission: 'rw',
      sharedItems: []
    };
    this.options = [];
  }

  handleSelectChange = (option) => {
    this.setState({
      selectedOption: option,
    });
  }

  componentDidMount() {
    this.loadOptions();
    this.listSharedGroups();
  }

  loadOptions = () => {
    seafileAPI.shareableGroups().then((res) => {
      this.options = [];
      for (let i = 0 ; i < res.data.length; i++) {
        let obj = {};
        obj.value = res.data[i].name;
        obj.id = res.data[i].id;
        obj.label = res.data[i].name;
        this.options.push(obj);
      }
    });
  }

  listSharedGroups = () => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID; 
    seafileAPI.listSharedItems(repoID, path, 'group').then((res) => {
      if(res.data.length !== 0) {
        this.setState({
          sharedItems: res.data
        });
      }
    });
  }

  setPermission = (e) => {
    if (e.target.value == 'Read-Write') {
      this.setState({
        permission: 'rw',
      })
    } else if (e.target.value == 'Read-Only') {
      this.setState({
        permission: 'r',
      })
    } else if (e.target.value == 'Preview-Edit-on-Cloud') {
      this.setState({
        permission: 'clod-edit',
      })
    } else if (e.target.value == 'Preview-on-Cloud') {
      this.setState({
        permission: 'preview',
      })
    } 
  }

  shareToGroup = () => {
    let groups = [];
    let path = this.props.itemPath;
    let repoID = this.props.repoID; 
    if (this.state.selectedOption.length > 0 ) {
      for (let i = 0; i < this.state.selectedOption.length; i ++) {
        groups[i] = this.state.selectedOption[i].id;
      }
    }
    seafileAPI.shareFolder(repoID, path, 'group', this.state.permission, groups).then(res => {
      if (res.data.failed.length > 0) {
        let errorMsg = [];
        for (let i = 0 ; i < res.data.failed.length ; i++) {
          errorMsg[i] = res.data.failed[i];
        }
        this.setState({
          errorMsg: errorMsg
        });
      }

      this.setState({
        sharedItems: this.state.sharedItems.concat(res.data.success)
      });
    });
  }

  deleteShareItem = (e, groupID) => {
    e.preventDefault();
    let path = this.props.itemPath;
    let repoID = this.props.repoID; 
    seafileAPI.deleteShareToGroupItem(repoID, path, 'group', groupID).then(() => {
      this.setState({
        sharedItems: this.state.sharedItems.filter(item => { return item.group_info.id !== groupID }) 
      });
    });
  }

  render() {
    return (
      <Table>
        <thead>
          <tr>
            <th style={{'width': '50%'}}>{gettext('Group')}</th>
            <th style={{'width': '30%'}}>{gettext('Permission')}</th>
            <th></th>
          </tr>
          <tr>
          <td>
            <Select
              isMulti
              onChange={this.handleSelectChange}
              options={this.options}
              components={makeAnimated()}
              inputId={"react-select-2-input"}
            />
          </td>
          <td>
            <Input type="select" name="select" onChange={this.setPermission}>
              <option>{gettext('Read-Write')}</option>
              <option>{gettext('Read-Only')}</option>
              <option>{gettext('Preview-Edit-on-Cloud')}</option>
              <option>{gettext('Preview-on-Cloud')}</option>
            </Input>
          </td>
          <td>
           <Button onClick={this.shareToGroup}>{gettext('Submit')}</Button>
          </td>
          </tr>
          <tr>
            {this.state.errorMsg.length > 0 &&                  
              this.state.errorMsg.map((item, index = 0, arr) => {
                return (                                        
                  <p className="error" key={index}>{this.state.errorMsg[index].group_name}
                    {': '}{this.state.errorMsg[index].error_msg}</p>
                );                                               
              })                                                
            }
          </tr>
        </thead>
        <GroupList items={this.state.sharedItems} deleteShareItem={this.deleteShareItem} />
      </Table>
    );
  }
}

function GroupList(props) {
  return (
    <tbody>
      {props.items.map((item, index) => (
        <tr key={index}>
          <td>{item.group_info.name}</td>
          <td>{Utils.sharePerms[item.permission]}</td>
          <td><i onClick={(e) => {props.deleteShareItem(e, item.group_info.id)}} className="sf2-icon-delete" title="Delete"></i></td>
        </tr>
      ))}
    </tbody>
  );
}

ShareToGroup.propTypes = propTypes;

export default ShareToGroup;
