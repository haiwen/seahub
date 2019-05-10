import React, { Fragment } from 'react';
import { Button, Col, Collapse, CustomInput, FormGroup, Input, Label, Row, InputGroupAddon, InputGroup } from 'reactstrap';
import { gettext, lang } from '../../utils/constants';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import SelectDate from '@seafile/seafile-editor/dist/components/calander';

class SearchScales extends React.Component {

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

  render() {
    const { stateAndValues } = this.props;

    if (stateAndValues.isShowSearchFilter) {
      const { size_from, size_to, time_from, time_to, search_repo, fileTypeItemsStatus } = stateAndValues;
      const fileTypes = this.getFileTypesList(fileTypeItemsStatus);
      const typesLength = fileTypes.length;
      return (
        <div className="search-filters">
          {search_repo &&
            <span className="mr-4">{gettext('Libraries')}{': '}{search_repo}</span>
          }
          {typesLength > 0 &&
            <span className="mr-4">{gettext('File types')}{': '}
              {fileTypes.map((type, index) => {
                return <span key={index}>{type}{index !== (typesLength - 1) && ','}{' '}</span>;
              })}
            </span>
          }
          {(time_from && time_to ) &&
            <span className="mr-4">{gettext('Last Update')}{': '}{time_from}{' '}{gettext('to')}{' '}{time_to}</span>
          }
          {(size_from && size_to) &&
            <span className="mr-4">{gettext('Size')}{': '}{size_from}{'MB - '}{size_to}{'MB'}</span>
          }
        </div>
      );
    }
    else {
      return (
        <div className="search-scales">
          <Collapse isOpen={stateAndValues.isCollapseOpen}>

            {this.props.repoID &&
              <div className='search-repo search-catalog'>
                <Row>
                  <Col md="2" lg="2">{gettext('Libraries')}{': '}</Col>
                  <Col md="4" lg="4">
                    <FormGroup check>
                      <Label check>
                        <Input type="radio" name="repo"
                          checked={stateAndValues.isAllRepoCheck}
                          onChange={() => this.props.handlerRepo(true)}
                        />{gettext('In all libraries')}
                      </Label>
                    </FormGroup>
                  </Col>
                  <Col md="4" lg="4">
                    <FormGroup check>
                      <Label check>
                        <Input type="radio" name="repo"
                          checked={!stateAndValues.isAllRepoCheck}
                          onChange={() => this.props.handlerRepo(false)}
                        />{this.props.repoName}
                      </Label>
                    </FormGroup>
                  </Col>
                </Row>
              </div>
            }

            <div className='search-file-types search-catalog'>
              <Row>
                <Col md="2" lg="2">{gettext('File types')}{': '}</Col>
                <Col md="4" lg="4">
                  <FormGroup check>
                    <Label check>
                      <Input type="radio" name="types"
                        checked={!stateAndValues.isFileTypeCollapseOpen}
                        onChange={this.props.closeFileTypeCollapse}
                      />{gettext('All file types')}
                    </Label>
                  </FormGroup>
                </Col>
                <Col md="4" lg="4">
                  <FormGroup check>
                    <Label check>
                      <Input type="radio" name="types"
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
                          type="checkbox" id="checkPdf" label={gettext('pdf')} inline
                          onChange={() => this.props.handlerFileTypes(5)}
                          checked={stateAndValues.fileTypeItemsStatus[5]}/>
                        <CustomInput
                          type="checkbox" id="checkMarkdown" label={gettext('markdown')} inline
                          onChange={() => this.props.handlerFileTypes(6)}
                          checked={stateAndValues.fileTypeItemsStatus[6]}/>
                      </Fragment>
                    </FormGroup>
                    <input
                      type="text"
                      className="form-control search-input"
                      name="query"
                      autoComplete="off"
                      placeholder={gettext("Input file extensions here, separate with ','")}
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
                <Col md="4" lg="4" sm="4" xs="5">
                  <SelectDate
                    onDateChange={this.props.handleTimeFromInput}
                    value={stateAndValues.time_from}
                    locale={lang}
                  />
                </Col>
                <div className="mt-2">-</div>
                <Col md="4" lg="4" sm="4" xs="5">
                  <SelectDate
                    onDateChange={this.props.handleTimeToInput}
                    value={stateAndValues.time_to}
                    locale={lang}
                  />
                </Col>
              </Row>
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
            <MediaQuery query="(max-width: 768px)">
              <Button className="ml-3" color="primary" onClick={this.props.handleSubmit}>{gettext('Submit')}</Button>
              <Button className="ml-2" onClick={this.props.handleReset}>{gettext('Reset')}</Button>
            </MediaQuery>
          </Collapse>
        </div>
      );
    }
  }
}

const searchScalesPropTypes = {
  toggleCollapse: PropTypes.func.isRequired,
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
  repoName: PropTypes.string,
  repoID: PropTypes.string,
  stateAndValues: PropTypes.object.isRequired,
};

SearchScales.propTypes = searchScalesPropTypes;

export default SearchScales;
