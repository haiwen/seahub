import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import moment from 'moment';
import { Button, Col, Collapse, CustomInput, FormGroup, Input, Label, Row, InputGroupAddon, InputGroup } from 'reactstrap';
import { gettext } from '../../utils/constants';
import DateTimePicker from '../../components/date-and-time-picker';

const { repo_name, search_repo } = window.search.pageOptions;

class AdvancedSearch extends React.Component {

  constructor(props) {
    super(props);
  }

  getFileTypesList = (fileTypes) => {
    const fileTypeItems = [gettext('Text'), gettext('Document'), gettext('Image'), gettext('Video'), gettext('Audio'), 'PDF', 'Markdown'];
    let ftype = [];
    for (let i = 0, len = fileTypes.length; i < len; i++) {
      if (fileTypes[i]) {
        ftype.push(fileTypeItems[i]);
      }
    }
    return ftype;
  };

  disabledStartDate = (startValue) => {
    if (!startValue) {
      return false;
    }

    const isAfterToday = startValue.isAfter(moment(), 'day');
    const { time_to } = this.props.stateAndValues;
    const endValue = time_to;
    if (!endValue) {
      return isAfterToday;
    }
    return startValue.isAfter(endValue) || isAfterToday;
  }

  disabledEndDate = (endValue) => {
    if (!endValue) {
      return false;
    }

    const isAfterToday = endValue.isAfter(moment(), 'day');
    const { time_from } = this.props.stateAndValues;
    const startValue = time_from;
    if (!startValue) {
      return isAfterToday;
    }
    return endValue.isBefore(startValue) || isAfterToday;
  }

  render() {
    const { stateAndValues } = this.props;
    const { errorDateMsg, errorSizeMsg } = stateAndValues;

    if (stateAndValues.isShowSearchFilter) {
      const { size_from, size_to, time_from, time_to, search_repo, fileTypeItemsStatus } = stateAndValues;
      const fileTypes = this.getFileTypesList(fileTypeItemsStatus);
      const typesLength = fileTypes.length;
      return (
        <div className="search-filters">
          {search_repo && <span className="mr-4">{gettext('Libraries')}{': '}{search_repo == 'all'? gettext('All') : repo_name}</span>}
          {typesLength > 0 &&
            <span className="mr-4">{gettext('File Types')}{': '}
              {fileTypes.map((type, index) => {
                return <span key={index}>{type}{index !== (typesLength - 1) && ','}{' '}</span>;
              })}
            </span>
          }
          {(time_from && time_to ) &&
            <span className="mr-4">{gettext('Last Update')}{': '}{time_from.format('YYYY-MM-DD')}{' '}{gettext('to')}{' '}{time_to.format('YYYY-MM-DD')}</span>
          }
          {(size_from && size_to) &&
            <span className="mr-4">{gettext('Size')}{': '}{size_from}{'MB - '}{size_to}{'MB'}</span>
          }
        </div>
      );
    }
    else {
      return (
        <div className="advanced-search">
          <Collapse isOpen={stateAndValues.isCollapseOpen}>

            {search_repo !== 'all' &&
              <div className='search-repo search-catalog'>
                <Row>
                  <Col md="2" lg="2">{gettext('Libraries')}{': '}</Col>
                  <Col md="4" lg="4">
                    <FormGroup check>
                      <Label check>
                        <Input
                          type="radio" name="repo"
                          checked={stateAndValues.isAllRepoCheck}
                          onChange={() => this.props.handlerRepo(true)}
                        />{gettext('In all libraries')}
                      </Label>
                    </FormGroup>
                  </Col>
                  <Col md="4" lg="4">
                    <FormGroup check>
                      <Label check>
                        <Input
                          type="radio" name="repo"
                          checked={!stateAndValues.isAllRepoCheck}
                          onChange={() => this.props.handlerRepo(false)}
                        />{repo_name}
                      </Label>
                    </FormGroup>
                  </Col>
                </Row>
              </div>
            }

            <div className='search-file-types search-catalog'>
              <Row>
                <Col md="2" lg="2">{gettext('File Types')}{': '}</Col>
                <Col md="4" lg="4">
                  <FormGroup check>
                    <Label check>
                      <Input
                        type="radio" name="types"
                        checked={!stateAndValues.isFileTypeCollapseOpen}
                        onChange={this.props.closeFileTypeCollapse}
                      />{gettext('All file types')}
                    </Label>
                  </FormGroup>
                </Col>
                <Col md="4" lg="4">
                  <FormGroup check>
                    <Label check>
                      <Input
                        type="radio" name="types"
                        checked={stateAndValues.isFileTypeCollapseOpen}
                        onChange={this.props.openFileTypeCollapse}
                      />{gettext('Custom file types')}
                    </Label>
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md="2" lg="2"></Col>
                <Col md="10" lg="10">
                  <Collapse isOpen={stateAndValues.isFileTypeCollapseOpen}>
                    <FormGroup className="search-file-types-form">
                      <Fragment>
                        <CustomInput
                          type="checkbox" id="checkTextFiles" label={gettext('Text files')} inline
                          onChange={() => this.props.handlerFileTypes(0)}
                          checked={stateAndValues.fileTypeItemsStatus[0]}/>
                        <CustomInput
                          type="checkbox" id="checkDocuments" label={gettext('Documents')} inline
                          onChange={() => this.props.handlerFileTypes(1)}
                          checked={stateAndValues.fileTypeItemsStatus[1]}/>
                        <CustomInput
                          type="checkbox" id="checkImages" label={gettext('Images')} inline
                          onChange={() => this.props.handlerFileTypes(2)}
                          checked={stateAndValues.fileTypeItemsStatus[2]}/>
                        <CustomInput
                          type="checkbox" id="checkVideo" label={gettext('Video')} inline
                          onChange={() => this.props.handlerFileTypes(3)}
                          checked={stateAndValues.fileTypeItemsStatus[3]}/>
                        <CustomInput
                          type="checkbox" id="checkAudio" label={gettext('Audio')} inline
                          onChange={() => this.props.handlerFileTypes(4)}
                          checked={stateAndValues.fileTypeItemsStatus[4]}/>
                        <CustomInput
                          type="checkbox" id="checkPdf" label="PDF" inline
                          onChange={() => this.props.handlerFileTypes(5)}
                          checked={stateAndValues.fileTypeItemsStatus[5]}/>
                        <CustomInput
                          type="checkbox" id="checkMarkdown" label="Markdown" inline
                          onChange={() => this.props.handlerFileTypes(6)}
                          checked={stateAndValues.fileTypeItemsStatus[6]}/>
                      </Fragment>
                    </FormGroup>
                    <input
                      type="text"
                      className="form-control search-input"
                      name="query"
                      autoComplete="off"
                      placeholder={gettext('Input file extensions here, separate with \',\'')}
                      onChange={this.props.handlerFileTypesInput}
                      value={stateAndValues.input_fexts}
                      onKeyDown={this.props.handleKeyDown}
                    />
                  </Collapse>
                </Col>
              </Row>
            </div>

            <div className='search-date search-catalog'>
              <Row>
                <Col md="2" lg="2" className="mt-2">{gettext('Last Update')}{': '}</Col>
                <Col md="4" lg="4" sm="4" xs="5" className="position-relative">
                  <DateTimePicker
                    inputWidth={'100%'}
                    disabledDate={this.disabledStartDate}
                    value={stateAndValues.time_from}
                    onChange={this.props.handleTimeFromInput}
                    showHourAndMinute={false}
                  />
                  <span className="select-data-icon"><i className="fa fa-calendar-alt"></i></span>
                </Col>
                <div className="mt-2">-</div>
                <Col md="4" lg="4" sm="4" xs="5" className="position-relative">
                  <DateTimePicker
                    inputWidth={'100%'}
                    disabledDate={this.disabledEndDate}
                    value={stateAndValues.time_to}
                    onChange={this.props.handleTimeToInput}
                    showHourAndMinute={false}
                  />
                  <span className="select-data-icon"><i className="fa fa-calendar-alt"></i></span>
                </Col>
              </Row>
              {errorDateMsg && <Row><Col md="2" lg="2"></Col><Col md="8" className="error mt-2">{errorDateMsg}</Col></Row>}
            </div>

            <div className='search-size search-catalog'>
              <Row>
                <Col md="2" lg="2" className="mt-2">{gettext('Size')}{': '}</Col>
                <Col md="4" lg="4" sm="4" xs="5">
                  <FormGroup>
                    <InputGroup>
                      <Input
                        type="tel" name="size_from"
                        onKeyDown={this.props.handleKeyDown}
                        onChange={this.props.handleSizeFromInput}
                        value={stateAndValues.size_from}
                      />
                      <InputGroupAddon addonType="append">{'MB'}</InputGroupAddon>
                    </InputGroup>
                  </FormGroup>
                  <MediaQuery query="(min-width: 768px)">
                    {errorSizeMsg && <div className="error mb-4">{errorSizeMsg}</div>}
                    <Button color="primary" onClick={this.props.handleSubmit}>{gettext('Submit')}</Button>
                    <Button className="ml-2" onClick={this.props.handleReset}>{gettext('Reset')}</Button>
                  </MediaQuery>
                </Col>
                <div className="mt-2">-</div>
                <Col md="4" lg="4" sm="4" xs="5">
                  <FormGroup>
                    <InputGroup>
                      <Input
                        type="tel" name="size_to"
                        onKeyDown={this.props.handleKeyDown}
                        onChange={this.props.handleSizeToInput}
                        value={stateAndValues.size_to}
                      />
                      <InputGroupAddon addonType="append">{'MB'}</InputGroupAddon>
                    </InputGroup>
                  </FormGroup>
                </Col>
              </Row>
            </div>
            <MediaQuery query="(max-width: 767.8px)">
              {errorSizeMsg && <div className="error mb-4">{errorSizeMsg}</div>}
              <Button color="primary" onClick={this.props.handleSubmit}>{gettext('Submit')}</Button>
              <Button className="ml-2" onClick={this.props.handleReset}>{gettext('Reset')}</Button>
            </MediaQuery>
          </Collapse>
        </div>
      );
    }
  }
}

const advancedSearchPropTypes = {
  openFileTypeCollapse: PropTypes.func.isRequired,
  closeFileTypeCollapse: PropTypes.func.isRequired,
  handlerFileTypes: PropTypes.func.isRequired,
  handlerFileTypesInput: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  handleReset: PropTypes.func.isRequired,
  handlerRepo: PropTypes.func.isRequired,
  handleKeyDown: PropTypes.func.isRequired,
  handleTimeFromInput: PropTypes.func.isRequired,
  handleTimeToInput: PropTypes.func.isRequired,
  handleSizeFromInput: PropTypes.func.isRequired,
  handleSizeToInput: PropTypes.func.isRequired,
  stateAndValues: PropTypes.object.isRequired,
};

AdvancedSearch.propTypes = advancedSearchPropTypes;

export default AdvancedSearch;
