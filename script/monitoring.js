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
 * @fileoverview Monitoring API demo.
 */

/**
 * The MonitoringApi class performs authorization and retrieves
 * data from the Monitoring API.
 * @constructor
 */
var MonitoringApi = function() {
  /**
   * User's project ID. Set via the UI.
   * @type {string}
   */
  this.projectId = null;

  /**
   * API name.
   * @type {String}
   * @private
   */
  this.apiName_ = 'cloudmonitoring';

  /**
   * API version.
   * @type {String}
   * @private
   */
  this.apiVersion_ = 'v2beta1';

  /**
   * Google API Key.
   * @type {String}
   * @private
   */
  this.apiKey_ = '<your-api-key>';

  /**
   * Google Client ID.
   * @type {String}
   * @private
   */
  this.clientId_ = '<your-client-id>';

  /**
   * Google API scope.
   * @type {String}
   * @private
   */
  this.scopes_ = 'https://www.googleapis.com/auth/monitoring.readonly';
};

/**
 * Initialize the HTML page and authorization settings.
 * @param {Function} authComplete Function to call when authorization is done.
 */
MonitoringApi.prototype.auth = function(authComplete) {
  gapi.client.setApiKey(this.apiKey_);
  gapi.auth.authorize({
    client_id: this.clientId_,
    scope: this.scopes_,
    immediate: true}, this.handleAuthResult(authComplete));
};

/**
 * Handle the response from Google's authorization server.
 * @param {Function} authComplete Function to call when authorization is done.
 * @return {Function} A function to handle response from Google's authorization
 *     server.
 */
MonitoringApi.prototype.handleAuthResult = function(authComplete) {
  var self = this;

  return function(authResult) {
    if (authResult && authResult.name != 'TypeError') {
      $('#authorize-button').css('visibility', 'hidden');
      authComplete();
    } else {
      $('#authorize-button').css('visibility', '');
      $('#authorize-button').click(function(event) {
        gapi.auth.authorize({
          client_id: self.clientId_,
          scope: self.scopes_,
          immediate: false}, self.handleAuthResult(authComplete));
        return false;
      });
    }
  };
};

/**
 * Make a call to the Monitoring API timeseries.list endpoint. Pass
 * the returned data to the provided callback function.
 * @param {Object} query Query parameters for the call to the API. For example:
 *     {
 *       timespan: '2d',
 *       labels: ['label==value',...]
 *     }
 * @param {function} callback Method to call when API returns.
 */
MonitoringApi.prototype.getData = function(query, callback) {
  var self = this;
  var timeseries = [];

  // Make a copy of the query in case the pageToken needs to be added.
  // We don't want the pageToken added to the query object.
  var localQuery = $.extend({}, query);
  localQuery.youngest = new Date().toISOString();

  var makeCall = function() {
    gapi.client.load(self.apiName_, self.apiVersion_, function() {
      var request = gapi.client.cloudmonitoring.timeseries.list(localQuery);
      request.execute(function(response) {
        if (response.timeseries) {
          $.merge(timeseries, response.timeseries);
          if (response.nextPageToken) {
            $.extend(localQuery, {'pageToken': response.nextPageToken});
            makeCall();
          } else {
            callback(timeseries);
          }
        } else {
          // If there's no timeseries data, there was a problem. Return the
          // response to display in the error message.
          callback(timeseries, response);
        }
      });
    });
  };
  makeCall();
};

/**
 * Make a call to the Monitoring API metricDescriptors.list endpoint.
 * @param {function} callback Method to call when API returns.
 */
MonitoringApi.prototype.getMetrics = function(callback) {
  var self = this;
  gapi.client.load(this.apiName_, this.apiVersion_, function() {
    var request = gapi.client.cloudmonitoring.metricDescriptors.list({
      'project': self.projectId
    });
    request.execute(function(response) {
      callback(response.metrics);
    });
  });
};

/**
 * Make a call to the Monitoring API timeseriesDescriptors.list endpoint.
 * @param {string} metric String metric name (ex:
 *     compute.googleapis.com/instance/disk/read_latencies)
 * @param {function} callback Method to call when API returns.
 */
MonitoringApi.prototype.getDescriptors = function(metric, callback) {
  var self = this;
  gapi.client.load(this.apiName_, this.apiVersion_, function() {
    var request = gapi.client.cloudmonitoring.timeseriesDescriptors.list({
      'metric': metric,
      'project': self.projectId
    });
    request.execute(function(response) {
      callback(response.timeseries);
    });
  });
};
