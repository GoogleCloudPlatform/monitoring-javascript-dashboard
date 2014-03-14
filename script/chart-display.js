/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @fileoverview Graphs data from the Monitoring API using Rickshaw.
 */

/**
 * The ChartDisplay controls the display of the charts.
 * @constructor
 * @param {Object} api The Monitoring API object.
 */
var ChartDisplay = function(api) {
  /**
   * The Monitoring API object.
   * @type {Object}
   * @private
   */
  this.api_ = api;

  /**
   * A list of objects representing the visible charts, their data, and
   * their queries.
   * @type {Array.<Object>}
   * @private
   */
  this.charts_ = [];

  /**
   * Values for the range selector.
   * @type {Array.<string>}
   * @private
   */
  this.timespanValues = ['5m', '10m', '20m', '30m','40m', '50m', '1h', '2h',
                         '3h', '4h', '5h', '6h', '7h', '8h', '9h', '10h', '11h',
                         '12h', '1d', '2d', '3d', '4d', '5d', '6d', '1w'];

  /**
   * The default timespan to select on page load.
   * @type {Object}
   * @private
   */
  this.defaultTimespanIndex = 6;

  /**
   * Object with data formatting methods for various charts.
   * @type {Object}
   * @private
   */
  this.formatters_ = {
    byteConverter: function(dataPoint) {
      return dataPoint / 1024;
    },
    timeConverter: function(dataPoint) {
      return dataPoint / 3600;
    }
  };

  /**
   * Options for each chart, including the chart type, labels, and
   * data formatter.
   * @type {Object}
   * @private
   */
  this.chartDisplayOptions_ = {
    'compute.googleapis.com': {
      'instance': {
        'metrics': {
          'uptime': {
            default: true,
            type: 'line',
            title: 'Uptime (Hours)',
            formatter: this.formatDataSimple_(this.formatters_.timeConverter)
          }
        },
        'labels': null
      },
      'instance/disk': {
        'metrics': {
          'read_ops_count': {
            default: false,
            type: 'line',
            title: 'Read Operations Count',
            formatter: this.formatDataSimple_()
          },
          'write_ops_count': {
            default: true,
            type: 'line',
            title: 'Write Operations Count',
            formatter: this.formatDataSimple_()
          },
          'read_bytes_count': {
            default: false,
            type: 'line',
            title: 'Read Bytes Count (KB)',
            formatter: this.formatDataSimple_(this.formatters_.byteConverter)
          },
          'write_bytes_count': {
            default: false,
            type: 'line',
            title: 'Write Bytes Count (KB)',
            formatter: this.formatDataSimple_(this.formatters_.byteConverter)
          },
          'read_latencies': {
            default: false,
            type: 'line',
            title: 'Read Bytes Count (KB)',
            formatter: this.formatDataSimple_(this.formatters_.byteConverter)
          },
          'write_latencies': {
            default: false,
            type: 'line',
            title: 'Write Bytes Count (KB)',
            formatter: this.formatDataSimple_(this.formatters_.byteConverter)
          }
        },
        'labels': {
          'compute.googleapis.com/device_name': 'Device Name',
          'compute.googleapis.com/device_type': 'Device Type'
        }
      },
      'instance/network': {
        'metrics': {
          'received_bytes_count': {
            default: true,
            type: 'line',
            title: 'Received Bytes Count',
            formatter: this.formatDataSimple_(this.formatters_.byteConverter)
          },
          'sent_bytes_count': {
            default: true,
            type: 'line',
            title: 'Sent Bytes Count',
            formatter: this.formatDataSimple_(this.formatters_.byteConverter)
          },
          'received_packets_count': {
            default: false,
            type: 'line',
            title: 'Received Packets Count',
            formatter: this.formatDataSimple_()
          },
          'sent_packets_count': {
            default: false,
            type: 'line',
            title: 'Sent Packets Count',
            formatter: this.formatDataSimple_()
          },
        },
        'labels': {
          'compute.googleapis.com/loadbalanced': 'Loadbalanced',
        }
      },
      'instance/cpu': {
        'metrics': {
          'usage_time': {
            default: true,
            type: 'line',
            title: 'CPU Usage (Hours)',
            formatter: this.formatDataSimple_(this.formatters_.timeConverter)
          },
          'reserved_cores': {
            default: false,
            type: 'line',
            title: 'Reserved Cores',
            formatter: this.formatDataSimple_()
          }
        },
        'labels': null
      },
      'firewall': {
        'metrics': {
          'dropped_bytes_count': {
            default: false,
            type: 'line',
            title: 'Dropped Bytes Count (KB)',
            formatter: this.formatDataSimple_(this.formatters_.byteConverter)
          },
          'dropped_packets_count': {
            default: true,
            type: 'line',
            title: 'Dropped Packets Count',
            formatter: this.formatDataSimple_()
          }
        },
        'labels': null
      }
    },
    'appengine.googleapis.com': null
  };

  /**
   * Labels available to all metrics.
   * @type {Object}
   * @private
   */
  this.defaultLabels_ = {
    'location': 'Location',
    'resource_id': 'Resource ID'
  };

};

/**
 * Add the chart based on the domain and metric.
 * @param {string} domain The domain of the metric (ex, compute.googleapis.com).
 * @param {string} metric The metric name (ex, /instance/uptime).
 */
ChartDisplay.prototype.display = function(domain, resource, metric) {

  var chartNumber = this.charts_.length;
  var displayOptions = this.chartDisplayOptions_[
      domain][resource].metrics[metric];

  // Create a container to hold all chart elements.
  var chartContainer = this.createChartContainer_(chartNumber);

  // Add a title for the chart.
  var chartTitle = this.createChartTitle_(displayOptions.title);
  $(chartContainer).append(chartTitle);

  // Create an element in which to display the chart.
  var chartElement = this.createChartElement_(chartNumber);
  $(chartContainer).append(chartElement);

  // Create a chart legend and form container.
  var legendFormContainer = this.createLegendFormContainer_();

  // Create the chart legend.
  var chartLegend = this.createChartLegend_(chartNumber, chart);
  $(legendFormContainer).append(chartLegend);

  // Create the actual chart.
  var query = {
    metric: domain + '/' + resource + '/' + metric,
    project: this.api_.projectId,
    timespan: this.timespanValues[this.defaultTimespanIndex]
  };
  var chart = new Chart(
      chartElement, chartLegend, displayOptions, this.api_, query);

  // Create the label form.
  var chartLabelForm = this.createChartLabelForm_(
      chartNumber, domain, this.chartDisplayOptions_[domain][resource].labels);
  $(legendFormContainer).append(chartLabelForm);
  $(chartContainer).append(legendFormContainer);

  // Add the container to the charts HTML element.
  $('#charts').append(chartContainer);

  // Add the chart object to the list of charts.
  this.charts_.push(chart);
};

/**
 * Displays default charts.
 * @param {string} domain The domain for which to display the charts
 *     (ex, compute.googleapis.com).
 */
ChartDisplay.prototype.displayDefaultCharts = function(domain) {
  $('#charts').empty();
  for (var resource in this.chartDisplayOptions_[domain]) {
    for (var metric in this.chartDisplayOptions_[domain][resource].metrics) {
      if (this.chartDisplayOptions_[domain][resource].metrics[metric].default) {
        this.display(domain, resource, metric);
      }
    }
  }
};

/**
 * Update all the charts at a given interval. The interval is set by the
 * controller.
 */
ChartDisplay.prototype.intervalUpdater = function() {
  var self = this;
  return function() {
    for (var chart in self.charts_) {
      self.charts_[chart].update();
    }
  }
};

/**
 * Update the timespan of the query.
 * @param {string} timespan The new timespan to use.
 */
ChartDisplay.prototype.rangeUpdater = function(timespan) {
  // Get new timespan from range selector.
  for (var chart in this.charts_) {
    this.charts_[chart].update({'timespan': timespan});
  };
};

/**
 * Update the chart with the given labels in the chart form.
 * @param {number} chartNumber The chart number to update.
 */
ChartDisplay.prototype.labelUpdater = function(chartNumber) {
  var self = this;

  return function() {
    // Get query parameters from label form.
    var query = {};
    query['labels'] = [];
    $('input[name="' + chartNumber + '"]').each(function() {
      if ($(this).val()) {
        var label = $(this).data('label') + '==' + $(this).val();
        query['labels'].push(label);
      }
    });
    self.charts_[chartNumber].update(query);
  };
};

/**
 * Create a container for the chart and corresponding elements.
 * @param {number} chartNumber The number of the chart.
 * @return An HTML Element.
 * @private
 */
ChartDisplay.prototype.createChartContainer_ = function(chartNumber) {
  // Add the chart container.
  var chartContainer = document.createElement('div');
  $(chartContainer).attr('id', 'chartContainer' + chartNumber);
  $(chartContainer).addClass('chartContainer');
  return chartContainer;
};

/**
 * Create a title for the chart.
 * @param {string} title The title of the chart.
 * @return An HTML Element.
 * @private
 */
ChartDisplay.prototype.createChartTitle_ = function(title) {
  // Add the chart title.
  var chartTitle = document.createElement('h4');
  $(chartTitle).text(title);
  return chartTitle;
};

/**
 * Create the HTML element for the actual chart.
 * @param {number} chartNumber The number of the chart.
 * @return An HTML Element.
 * @private
 */
ChartDisplay.prototype.createChartElement_ = function(chartNumber) {
  // Add the chart.
  var chart = document.createElement('div');
  $(chart).attr('id', 'chart' + chartNumber);
  $(chart).addClass('chart');
  return chart;
};

/**
 * Create a container for the chart and corresponding elements.
 * @return An HTML Element.
 * @private
 */
ChartDisplay.prototype.createLegendFormContainer_ = function() {
  // Add the chart container.
  var legendFormContainer = document.createElement('div');
  $(legendFormContainer).addClass('legendFormContainer');
  return legendFormContainer;
};

/**
 * Create the the HTML Element for the legend.
 * @param {number} chartNumber The number of the chart.
 * @return An HTML Element.
 * @private
 */
ChartDisplay.prototype.createChartLegend_ = function(chartNumber) {
  // Add the chart legend.
  var chartLegend = document.createElement('div');
  $(chartLegend).attr('id', 'legend' + chartNumber);
  $(chartLegend).addClass('legend');
  return chartLegend;
};

/**
 * Create the label form.
 * @param {number} chartNumber The number of the chart.
 * @param {string} domain The domain (example, compute.googleapis.com).
 * @param {Object} Object mapping the API label to a display name.
 * @return An HTML Element.
 * @private
 */
ChartDisplay.prototype.createChartLabelForm_ = function(
    chartNumber, domain, labels) {
  // Add the label form.
  var formContainer = document.createElement('form');
  $(formContainer).addClass('labelForm');

  for (var label in this.defaultLabels_) {
    this.addLabelInput_(
        formContainer,
        chartNumber,
        this.defaultLabels_[label],
        'cloud.googleapis.com/' + label);
  }
  for (var label in labels) {
    this.addLabelInput_(
        formContainer, chartNumber, labels[label], domain + '/' + label);
  }
  var button = document.createElement('input');
  $(button).attr('type', 'button');
  $(button).val('Go');
  $(button).click(this.labelUpdater(chartNumber));
  $(formContainer).append(button);
  return formContainer;
};

/**
 * Add a form label and text input for a given API label.
 * @param {Element} formContainer The container for the form elements.
 * @param {number} chartNumber The chart number.
 * @param {string} labelText The text to display in the form label.
 * @param {string} label The API label.
 * @private
 */
ChartDisplay.prototype.addLabelInput_ = function(
    formContainer, chartNumber, labelText, label) {
  var formLabel = document.createElement('label');
  $(formLabel).text(labelText + ': ');
  $(formContainer).append(formLabel);

  var inputLabel = document.createElement('input');
  $(inputLabel).attr('type', 'text');
  $(inputLabel).attr('name',  chartNumber);
  $(inputLabel).data('label', label);
  $(formContainer).append(inputLabel);

  var lineBreak = document.createElement('br');
  $(formContainer).append(lineBreak);
};

/**
 * Format the data for display in the chart.
 * @param {Function} valueFormatFunction Function to format the data for
 *     the specific metric.
 * @return A function for formatting the data.
 * @private
 */
ChartDisplay.prototype.formatDataSimple_ = function(valueFormatFunction) {
  return function(data) {
    var formattedData = [];
    var palette = new Rickshaw.Color.Palette({scheme: 'munin'});

    for (var timeseries in data) {
      // Create a series of data formatted for the chart.
      var formattedSeries = {};

      // Format the data as [{x: <x-value, y: <y-value>},...].
      formattedSeries.data = [];
      for (var point in data[timeseries].points) {
        var formattedDataPoint = {};
        if (valueFormatFunction) {
          formattedDataPoint.y = valueFormatFunction(
              data[timeseries].points[point].singularValue);
        } else {
          formattedDataPoint.y = data[timeseries].points[point].singularValue;
        }
        formattedDataPoint.x = new Date(
              data[timeseries].points[point].end).getTime();
        formattedSeries.data.push(formattedDataPoint);
      }
      //Reverse the data so it's in ascending order. Required for Rickshaw.
      formattedSeries.data.reverse();

      // Add a name to the series.
      var resourceType = data[timeseries].timeseriesDesc.labels[
          'cloud.googleapis.com/resource_type'];
      if (resourceType == 'instance') {
        formattedSeries.name = data[timeseries].timeseriesDesc.labels[
          'compute.googleapis.com/instance_name'];
      } else {
        formattedSeries.name = data[timeseries].timeseriesDesc.labels[
          'cloud.googleapis.com/resource_id'];
      }

      // Add a color to the data.
      formattedSeries.color = palette.color();

      formattedData.push(formattedSeries);
    }
    return formattedData;
  };
};
