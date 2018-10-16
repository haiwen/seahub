import { seafileAPI } from '../utils/seafile-api';

var mxRectangle = window.mxRectangle;
var mxGraph = window.mxGraph;
var mxCodec = window.mxCodec;
var mxUtils = window.mxUtils;

class DrawViewer {

  constructor(graph) {
    this.graph = graph;
    graph.setEnabled(false);
  }

  loadFile() {
    seafileAPI.getFileContent(window.app.config.rawPath).then((res) => {
      var doc = mxUtils.parseXml(res.data);
      /* eslint-disable */
      console.log(doc.documentElement);
      /* eslint-enable */
      this.setGraphXml(doc.documentElement);
    });
  }

  readGraphState(node) {
    this.graph.gridEnabled = false;
    this.graph.gridSize = parseFloat(node.getAttribute('gridSize')) || window.mxGraph.prototype.gridSize;
    this.graph.graphHandler.guidesEnabled = node.getAttribute('guides') != '0';
    this.graph.setTooltips(node.getAttribute('tooltips') != '0');
    this.graph.setConnectable(node.getAttribute('connect') != '0');
    this.graph.connectionArrowsEnabled = node.getAttribute('arrows') != '0';
    this.graph.foldingEnabled = node.getAttribute('fold') != '0';

    if (this.graph.foldingEnabled)
    {
      this.graph.foldingEnabled = false;
      this.graph.cellRenderer.forceControlClickHandler = this.graph.foldingEnabled;
    }

    var ps = node.getAttribute('pageScale');

    if (ps != null)
    {
      this.graph.pageScale = ps;
    }
    else
    {
      this.graph.pageScale = window.mxGraph.prototype.pageScale;
    }


    this.graph.pageVisible = false;
    this.graph.pageBreaksVisible = this.graph.pageVisible;
    this.graph.preferPageSize = this.graph.pageBreaksVisible;

    var pw = node.getAttribute('pageWidth');
    var ph = node.getAttribute('pageHeight');

    if (pw != null && ph != null)
    {
      this.graph.pageFormat = new mxRectangle(0, 0, parseFloat(pw), parseFloat(ph));
    }

    // Loads the persistent state settings
    var bg = node.getAttribute('background');

    if (bg != null && bg.length > 0)
    {
      this.graph.background = bg;
    }
    else
    {
      this.graph.background = this.graph.defaultGraphBackground;
    }
  }

  /**
   * Sets the XML node for the current diagram.
   */
  setGraphXml(node) {
    if (node != null)
    {
      var dec = new mxCodec(node.ownerDocument);

      if (node.nodeName == 'mxGraphModel')
      {
        this.graph.model.beginUpdate();

        try
        {
          this.graph.model.clear();
          this.graph.view.scale = 1;
          this.readGraphState(node);
          this.updateGraphComponents();
          dec.decode(node, this.graph.getModel());
        }
        finally
        {
          this.graph.model.endUpdate();
        }
      }
    }
    else
    {
      this.resetGraph();
      this.graph.model.clear();
    }
  }

  /**
  * Keeps the graph container in sync with the persistent graph state
  */
  updateGraphComponents() {
    var graph = this.graph;

    if (graph.container != null)
    {
      graph.view.validateBackground();
      graph.container.style.overflow = (graph.scrollbars) ? 'auto' : 'hidden';
    }
  }

  /**
  * Sets the XML node for the current diagram.
  */
  resetGraph() {
    this.graph.gridEnabled = false;
    this.graph.graphHandler.guidesEnabled = true;
    this.graph.setTooltips(true);
    this.graph.setConnectable(true);
    this.graph.foldingEnabled = true;
    this.graph.scrollbars = this.graph.defaultScrollbars;
    this.graph.pageVisible = this.graph.defaultPageVisible;
    this.graph.pageBreaksVisible = this.graph.pageVisible;
    this.graph.preferPageSize = this.graph.pageBreaksVisible;
    this.graph.background = this.graph.defaultGraphBackground;
    this.graph.pageScale = mxGraph.prototype.pageScale;
    this.graph.pageFormat = mxGraph.prototype.pageFormat;
    this.graph.currentScale = 1;
    this.graph.currentTranslate.x = 0;
    this.graph.currentTranslate.y = 0;
    this.updateGraphComponents();
    this.graph.view.setScale(1);
  }
}

export default DrawViewer;
