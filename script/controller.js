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
 * @fileoverview Controls app flow.
 */

/**
 * The Controller class controls the app flow. It ensures that OAuth
 * is complete and the project ID is set before displaying the charts.
 * @constructor
 * @param {Object} api A Monitoring API object.
 * @param {Object} chartDisplay A ChartDisplay object.
 */
var Controller = function(api, chartDisplay) {
  /**
   * Interval at which to update the charts in milliseconds.
   * @type {number}
   */
  this.chartInterval = 20000;

  /**
   * MonitoringApi object.
   * @type {Object}
   * @private
   */
  this.api_ = api;

  /**
   * ChartDisplay object.
   * @type {Object}
   * @private
   */
  this.chartDisplay_ = chartDisplay;

  /**
   * Interval which updates charts with new data.
   * @type {Object}
   * @private
   */
  this.interval_ = null;
};

/**
 * Start OAuth 2.0 flow and initialize events on HTML elements. Initiate the
 * update interval.
 */
Controller.prototype.init = function() {
  var self = this;

  // Initialize OAuth 2.0 flow.
  window.setTimeout(this.api_.auth(this.checkProjectId_()), 1);

  // Initialize the buttons.
  $('#project-button').click(this.setProjectId_());
  $('#project-id').click(this.resetProjectId_());

  // Initialize the slider and slider text.
  $('#timespan-value').text(this.chartDisplay_.timespanValues[
      this.chartDisplay_.defaultTimespanIndex]);
  $('#slider').slider({
    min: 0,
    max: this.chartDisplay_.timespanValues.length - 1,
    value: this.chartDisplay_.defaultTimespanIndex,
    change: function(event, ui) {
      var sliderSelection = $(this).slider('value');
      var timespan = self.chartDisplay_.timespanValues[sliderSelection];
      $('#timespan-value').text(timespan);
      self.chartDisplay_.rangeUpdater(timespan);

      // Reset the interval so that it doesn't update right after the
      // new range is set.
      window.clearInterval(self.interval_);
      self.interval_ = window.setInterval(
          self.chartDisplay_.intervalUpdater(), self.chartInterval);
    }
  });

  // Start an interval to update the charts every X milliseconds.
  this.interval_ = window.setInterval(
      this.chartDisplay_.intervalUpdater(), this.chartInterval);
};

/**
 * Check whether the project ID has already been set in local storage. If
 * it has, show the project ID and charts on the page. If not, display
 * the project form.
 * @return {Function} A function to test if project ID is set.
 * @private
 */
Controller.prototype.checkProjectId_ = function() {
  var self = this;

  return function() {
    if (typeof(Storage) !== 'undefined') {
      var projectId = localStorage.getItem('project-id');
      if (projectId) {
        self.api_.projectId = projectId;
        self.displayCharts_()();
        return;
      }
    }

    $('#project-form').css('display', 'inline');
  };
};

/**
 * Store the project ID in local storage and set the api project ID. This
 * method is called when project form button is clicked.
 * @return {Function} A function to store project ID.
 * @private
 */
Controller.prototype.setProjectId_ = function() {
  var self = this;

  return function() {
    // Get the value of the project ID from the form.
    var projectId = $('#project-id-field').val();

    if (projectId) {
      // If storage exists, store the project ID locally so the user
      // doesn't have to keep entering it every time they visit the page.
      if (typeof(Storage) !== 'undefined') {
        localStorage.setItem('project-id', projectId);
      }

      self.api_.projectId = projectId;
      self.displayCharts_()();

    } else {
      alert('Project ID required!');
    }
  }
};

/**
 * Allow the user to reset the project ID by showing the project ID form.
 * This method is called when the user clicks on the project ID.
 * @return {Function} A function to display the project ID form.
 * @private
 */
Controller.prototype.resetProjectId_ = function() {
  var self = this;
  return function() {
    $('#project-form').css('display', 'inline');
    $('#project-id-field').val(self.api_.projectId);
    $('#project-display').css('display', 'none');
  };
};

/**
 * Display the project ID on the page, hide the project form, and show charts.
 * @return {Function} A function to display the charts.
 * @private
 */
Controller.prototype.displayCharts_ = function() {
  var self = this;
  return function() {
    $('#project-form').css('display', 'none');
    $('#time-selector').css('display', 'inline');
    $('#project-display').css('display', 'inline');
    $('#project-id').text(self.api_.projectId);
    self.api_.getMetrics(self.chartDisplay_.displayDefaultCharts());
  };
};
