/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var _ = require("underscore");
var Q = new require('q');
var debug = require('debug')('asset');
debug.log = console.log.bind(console);

var assetApiFactory = require("./assetApi/assetApiFactory.js");

var driverInsightsAsset = {
	_assetApi: null,
	
	_init: function(){
		this._assetApi = assetApiFactory.getAssetApi();
		if (!this._assetApi) {
			throw new Exception("!!! no provided credentials for Asset Data Management. using shared one !!!");
		}
	},

	_mergeObject: function(obj1, obj2) {
		for (var key in obj1) {
			if (key in obj2) {
				if (typeof(obj1[key]) === 'object') {
					this._mergeObject(obj1[key], obj2[key]);
				} else {
					obj1[key] = obj2[key];
				}
			}
		}
		for (var key in obj2) {
			if (!(key in obj1)) {
				obj1[key] = obj2[key];
			}
		}
		return obj1;
	},
	/*
	 * Vehicle apis
	 */
	getVehicleList: function(params){
		return this._getAssetList("vehicle", params || {num_rec_in_page: 50, num_page: 1});
	},
	getVehicle: function(mo_id){
		return this._getAsset("vehicle", mo_id);
	},
	addVehicle: function(vehicle, noRefresh){
		vehicle = this._mergeObject({
					status:"inactive",
					properties: {
						fueltank: 60
					}
				}, vehicle||{});
		return this._addAsset("vehicle", vehicle, !noRefresh);
	},
	updateVehicle: function(id, vehicle, overwrite, noRefresh){
		return this._updateAsset("vehicle", id || vehicle.mo_id, vehicle, overwrite, !noRefresh);
	},
	refreshVehicle: function(){
		return this._refreshAsset("vehicle");
	},
	deleteVehicle: function(mo_id, noRefresh){
		return this._deleteAsset("vehicle", mo_id, !noRefresh);
	},

	/*
	 * Driver apis
	 */
	getDriverList: function(params){
		return this._getAssetList("driver", params);
	},
	getDriver: function(driver_id){
		return this._getAsset("driver", driver_id);
	},
	addDriver: function(driver, noRefresh){
		driver = _.extend({"status":"active"}, driver||{});
		return this._addAsset("driver", driver, !noRefresh);
	},
	updateDriver: function(id, driver, overwrite, noRefresh){
		return this._updateAsset("driver", id || driver.driver_id, driver, overwrite, !noRefresh);
	},
	refreshDriver: function(){
		return this._refreshAsset("driver");
	},
	deleteDriver: function(driver_id, noRefresh){
		return this._deleteAsset("driver", driver_id, !noRefresh);
	},

	/*
	 * Vendor api
	 */
	getVendorList: function(params){
		return this._getAssetList("vendor", params);
	},
	getVendor: function(vendor){
		return this._getAsset("vendor", vendor);
	},
	addVendor: function(vendor){
		vendor = _.extend({"status":"active"}, vendor||{});
		return this._addAsset("vendor", vendor, false);
	},
	updateVendor: function(id, vendor, overwrite){
		return this._updateAsset("vendor", id || vendor.vendor, vendor, overwrite, false);
	},
	deleteVendor: function(vendor){
		return this._deleteAsset("vendor", vendor);
	},

	/*
	 * EventType api
	 */
	getEventTypeList: function(params){
		return this._getAssetList("eventtype", params);
	},
	getEventType: function(id){
		return this._getAsset("eventtype", id);
	},
	addEventType: function(event_type, noRefresh){
		return this._addAsset("eventtype", event_type, !noRefresh);
	},
	updateEventType: function(id, event_type, overwrite, noRefresh) {
		return this._updateAsset("eventtype", id || event_type.event_type, event_type, overwrite, !noRefresh);
	},
	refreshEventType: function(){
		return this._refreshAsset("eventtype");
	},
	deleteEventType: function(id, noRefresh){
		return this._deleteAsset("eventtype", id, !noRefresh);
	},

	/*
	 * Rule api
	 */
	getRuleList: function(params){
		return this._getAssetList("rule", params);
	},
	getRule: function(id){
		return this._getAsset("rule", id);
	},
	getRuleXML: function(id){
		return this._assetApi.getRuleXML(id);
	},
	addRule: function(rule, ruleXML){
		return this._assetApi.addRule(rule, ruleXML);
	},
	updateRule: function(id, rule, ruleXML, overwrite) {
		var deferred = Q.defer();
		var self = this;
		if (overwrite) {
			Q.when(this._assetApi.updateRule(id, rule, ruleXML), function(response) {
				deferred.resolve(response);
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		} else {
			Q.when(this.getRule(id), function(existingRule) {
				rule = self._mergeObject(existingRule, rule);
				Q.when(self.getRuleXML(id), function(existingXML) {
					ruleXML = ruleXML || existingXML;
					Q.when(self.updateRule(id, rule, ruleXML, true), function(response) {
						deferred.resolve(response);
					})["catch"](function(err){
						deferred.reject(err);
					}).done();
				});
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		}
		return deferred.promise;
	},
	deleteRule: function(id){
		return this._deleteAsset("rule", id);
	},
	/*
	 * Get list of assets
	 */
	_getAssetList: function(context, params){
		return this._assetApi.getAssetList(context, params || {num_rec_in_page: 50, num_page: 1});
	},

	/*
	 * Get an asset
	 */
	_getAsset: function(context, id){
		if(!id){
			return Q.reject({message: "id must be specified."});
		}
		return this._assetApi.getAsset(context, id);
	},

	/*
	 * Add an asset
	 */
	_addAsset: function(context, asset, refresh){
		var deferred = Q.defer();
		Q.when(this._addOrUpdateAsset(context, null, asset, refresh), function(response) {
			deferred.resolve(response);
		})["catch"](function(err){
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},

	/*
	 * Refresh assets
	 */
	_refreshAsset: function(context) {
		return this._assetApi.refreshAsset(context);
	},
	/*
	 * Update an asset
	 */
	_updateAsset: function(context, id, asset, overwrite, refresh){
		if(!id){
			return Q.reject({message: "id must be specified."});
		}
		var deferred = Q.defer();
		var self = this;
		if (overwrite) {
			Q.when(this._addOrUpdateAsset(context, id, asset, refresh), function(response) {
				deferred.resolve(response);
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		} else {
			Q.when(this._getAsset(context, id), function(existingAsset) {
				asset = self._mergeObject(existingAsset, asset);
				Q.when(self._addOrUpdateAsset(context, id, asset, refresh), function(response) {
					deferred.resolve(response);
				})["catch"](function(err){
					deferred.reject(err);
				}).done();
			})["catch"](function(err){
				deferred.reject(err);
			}).done();
		}
		return deferred.promise;
	},

	_addOrUpdateAsset: function(context, id, asset, refresh) {
		return this._assetApi.addOrUpdateAsset(context, id, asset, refresh);
	},
	/*
	 * Delete an asset
	 */
	_deleteAsset: function(context, id, refresh){
		if(!id){
			return Q.reject({message: "id must be specified."});
		}
		return this._assetApi.deleteAsset(context, id, refresh);
	}
};
driverInsightsAsset._init();

module.exports = driverInsightsAsset;
