import React, { Component } from 'react';


const tableHeader = (
  <thead>
    <tr>
      <th className="text-center w-1"><i className="icon-people"></i></th>
      <th>USER</th>
      <th>TIME</th>
      <th>LIBRARIES</th>
      <th>OPERATIONS</th>
    </tr>
  </thead>
);

function TableBody(props) {
  let listFilesActivities = props.items.map((events, index) =>
    <tr key={index}>
          <td className="text-center"><div className="avatar d-block" style={{backgroundImage: `url(${events.avatar_url})`}}></div></td>
          <td><div>{events.name}</div><div className="small text-muted">{events.author}</div></td>
          <td>{events.date}</td>
          <td>{events.repo_name}</td>
          <td>{events.operation}</td>
    </tr>
  );

  return (
    <tbody>{listFilesActivities}</tbody>
  );
}

class FilesActivities extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      items: [],
      offset:0
    };
    this.handleClickMore = this.handleClickMore.bind(this);
  }

  componentDidMount() {
    const url = '/api2/events/?start=' + this.state.offset
    fetch(url, {credentials: 'same-origin'})
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({
            isLoaded: true,
            items: this.state.items.concat(result.events),
            offset: result.more_offset,
          });
        },
        (error) => {
          this.setState({
            isLoaded: true,
            error
          });
        }
      )
  }
  
  handleClickMore(){
    this.setState({}, () => {
      this.componentDidMount();
    });
  }

  render() {
    const { error, isLoaded, items, pageCount} = this.state;
    if (error) {
      return <div className='offset-md-2'>Error: {error.message}</div>;
    } else if (!isLoaded) {
      return <div className='dimmer'><div className="loader"></div></div>
    } else {
      return ( 
        <div className='card'>
          <div className='card-header'>
              <h3 className='card-title'>Activities</h3>
          </div>
          <div className='table-responsive' style={{ height: "25rem" }}>
            <table className='table table-hover table-vcenter text-nowrap card-table'>
              {tableHeader}
              <TableBody items={items} />
            </table>
            <button className={`full-width-btn ${ this.state.offset % 15 == 0? '': 'hide' }`} onClick={this.handleClickMore}>More</button>
          </div>
        </div>
      ); 
    }
  }
}

export default FilesActivities;
