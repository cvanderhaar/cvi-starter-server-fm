/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var htmlClient = angular.module('htmlClient', ['ui.router']);

htmlClient.config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
	$stateProvider
		.state('home', {
			url: '/home?vehicleId&serial_number&vendor&driverId&siteId&clientId',
			template: '<client-drive></client-drive>',
			controller: function ($stateParams, $q, simulatedVehicle) {
				simulatedVehicle.init($stateParams.clientId, $stateParams.vehicleId, $stateParams.siteId);
			}
		})
		.state('profile', {
			url: '/profile',
			template: '<client-profile></client-profile>',
		})
		.state('trips', {
			url: '/trips',
			template: '<client-trip></client-trip>',  // need to show trip list before showing particular trip
		})
		.state('settings', {
			url: '/settings',
			template: '<client-settings></client-settings>',
		});
	$urlRouterProvider.otherwise('/home');
}])
	;
htmlClient.controller('header', ['$scope', function ($scope) {
	$scope.hideHeader = true;
}]);

htmlClient.controller('footer', ['$scope', function ($scope) {
	$scope.hideFooter = true;
}]);