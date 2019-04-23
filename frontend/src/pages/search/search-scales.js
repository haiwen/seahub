import React from 'react';
import {Button, Col, Collapse, CustomInput, FormGroup, Input, Label, Row} from 'reactstrap';
import {gettext} from '../../utils/constants';
import PropTypes from 'prop-types';

class SearchScales extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="search-scales">
        <Collapse isOpen={this.props.stateAndValues.isCollapseOpen}>

          <div className='search-repo' style={{padding: '5px'}}>
            <Row>
              <Col md={5}>
                <FormGroup check>
                  <Label check>
                    <Input type="radio" name="repo"
                      checked={this.props.stateAndValues.isAllRepoCheck}
                      onChange={() => this.props.handlerRepo(true)}
                    />{gettext('In all libraries')}
                  </Label>
                </FormGroup>
              </Col>
              <Col md={5}>
                {this.props.repoID &&
                <FormGroup check>
                  <Label check>
                    <Input type="radio" name="repo"
                      checked={!this.props.stateAndValues.isAllRepoCheck}
                      onChange={() => this.props.handlerRepo(false)}
                    />{this.props.repoName}
                  </Label>
                </FormGroup>
                }
              </Col>
            </Row>
          </div>

          <div className='search-file-types' style={{padding: '5px'}}>
            <Row>
              <Col md={5}>
                <FormGroup check>
                  <Label check>
                    <Input type="radio" name="types"
                      checked={!this.props.stateAndValues.isFileTypeCollapseOpen}
                      onChange={this.props.closeFileTypeCollapse}
                    />{gettext('All file types')}
                  </Label>
                </FormGroup>
              </Col>
              <Col md={5}>
                <FormGroup check>
                  <Label check>
                    <Input type="radio" name="types"
                      checked={this.props.stateAndValues.isFileTypeCollapseOpen}
                      onChange={this.props.openFileTypeCollapse}
                    />{gettext('Custom file types')}
                  </Label>
                </FormGroup>
              </Col>
            </Row>

            <Collapse isOpen={this.props.stateAndValues.isFileTypeCollapseOpen}>
              <FormGroup style={{top: '10px'}}>
                <div>
                  <CustomInput
                    type="checkbox" id="checkTextFiles" label={gettext('Text files')} inline
                    onChange={() => this.props.handlerFileTypes(0)}
                    checked={this.props.stateAndValues.fileTypeItemsStatus[0]}/>
                  <CustomInput
                    type="checkbox" id="checkDocuments" label={gettext('Documents')} inline
                    onChange={() => this.props.handlerFileTypes(1)}
                    checked={this.props.stateAndValues.fileTypeItemsStatus[1]}/>
                  <CustomInput
                    type="checkbox" id="checkImages" label={gettext('Images')} inline
                    onChange={() => this.props.handlerFileTypes(2)}
                    checked={this.props.stateAndValues.fileTypeItemsStatus[2]}/>
                  <CustomInput
                    type="checkbox" id="checkVideo" label={gettext('Video')} inline
                    onChange={() => this.props.handlerFileTypes(3)}
                    checked={this.props.stateAndValues.fileTypeItemsStatus[3]}/>
                  <CustomInput
                    type="checkbox" id="checkAudio" label={gettext('Audio')} inline
                    onChange={() => this.props.handlerFileTypes(4)}
                    checked={this.props.stateAndValues.fileTypeItemsStatus[4]}/>
                  <CustomInput
                    type="checkbox" id="checkPdf" label={gettext('pdf')} inline
                    onChange={() => this.props.handlerFileTypes(5)}
                    checked={this.props.stateAndValues.fileTypeItemsStatus[5]}/>
                  <CustomInput
                    type="checkbox" id="checkMarkdown" label={gettext('markdown')} inline
                    onChange={() => this.props.handlerFileTypes(6)}
                    checked={this.props.stateAndValues.fileTypeItemsStatus[6]}/>
                </div>
              </FormGroup>
              <input
                type="text"
                className="form-control search-input"
                name="query"
                autoComplete="off"
                style={{paddingLeft: '0.5rem', width: '30rem',}}
                placeholder={gettext("Input file extensions here, separate with ','")}
                onChange={this.props.handlerFileTypesInput}
                value={this.props.stateAndValues.input_fexts}
                onKeyDown={this.props.handleKeyDown}
              />
            </Collapse>
          </div>

          <div className='search-date' style={{left: '5px'}}>
            <span>{gettext('Last Update')}</span>
            <Row>
              <Col md={5}>
                <FormGroup>
                  <Input
                    type="date" name="time_from"
                    onKeyDown={this.props.handleKeyDown}
                    onChange={this.props.handleTimeFromInput}
                    value={this.props.stateAndValues.time_from}
                  />
                </FormGroup>
              </Col>
              <Col md={5}>
                <FormGroup>
                  <Input
                    type="date" name="time_to"
                    onKeyDown={this.props.handleKeyDown}
                    onChange={this.props.handleTimeToInput}
                    value={this.props.stateAndValues.time_to}
                  />
                </FormGroup>
              </Col>
            </Row>
          </div>

          <div className='search-size' style={{left: '5px'}}>
            <span>{gettext('Size')}</span>
            <Row>
              <Col md={5}>
                <FormGroup>
                  <Input
                    type="tel" name="size_from"
                    onKeyDown={this.props.handleKeyDown}
                    onChange={this.props.handleSizeFromInput}
                    value={this.props.stateAndValues.size_from}
                  />
                </FormGroup>
              </Col>
              <Col md={5}>
                <FormGroup>
                  <Input
                    type="tel" name="size_to"
                    onKeyDown={this.props.handleKeyDown}
                    onChange={this.props.handleSizeToInput}
                    value={this.props.stateAndValues.size_to}
                  />MB
                </FormGroup>
              </Col>
            </Row>
          </div>
          <div>
            <Button onClick={this.props.handleSubmit}>{gettext('Submit')}</Button>
          </div>

        </Collapse>
      </div>
    );
  }
}

const searchScalesPropTypes = {
  toggleCollapse: PropTypes.func.isRequired,
  openFileTypeCollapse: PropTypes.func.isRequired,
  closeFileTypeCollapse: PropTypes.func.isRequired,
  handlerFileTypes: PropTypes.func.isRequired,
  handlerFileTypesInput: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  handlerRepo: PropTypes.func.isRequired,
  handleKeyDown: PropTypes.func.isRequired,
  handleTimeFromInput: PropTypes.func.isRequired,
  handleTimeToInput: PropTypes.func.isRequired,
  handleSizeFromInput: PropTypes.func.isRequired,
  handleSizeToInput: PropTypes.func.isRequired,
  repoName: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  stateAndValues: PropTypes.object.isRequired,
};

SearchScales.propTypes = searchScalesPropTypes;

export default SearchScales;
