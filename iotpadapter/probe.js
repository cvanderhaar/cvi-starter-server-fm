/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
var probe = module.exports = {};

var _ = require("underscore");
var Q = new require('q');
var chance = require('chance')();
var asset = require("./asset.js");
var IOTF = app_module_require('iotfclient');
var probeInterface = app_module_require("utils/probe.js");

_.extend(probe, {
	// server-side generated trip id list. 
	// In case client does not give a trip id, server generate and keep it until the device is disconnected
	makeTripId: false,
	tripIdList: {},
	_getTripId: function(deviceType, deviceId) {
		var key = deviceId + "-" + deviceType;
		var trip_id = this.tripIdList[key];
		if (trip_id) {
			return trip_id;
		}
		if (this.makeTripId) {
			trip_id = chance.hash({length: 20});
			this.tripIdList[key] = trip_id;
			return trip_id;
		}
	},
	_clearTripId: function(deviceType, deviceId) {
		var key = deviceId + "-" + deviceType;
		var trip_id = this.tripIdList[key];
		if (trip_id) {
			delete this.tripIdList[key];
		}
	},
	/*
	 * Add or delete assetInfo cache
	 */
	assetInfoCache: {},
	_setAssetInfoCache: function(deviceId, deviceType, assetInfo) {
		var key = deviceId + "-" + deviceType;
		if (assetInfo) {
			this.assetInfoCache[key] = assetInfo;
		} else {
			delete this.assetInfoCache[key];
		}
	},
	/*
	 * Reset assetInfo cache. Call this when asset is regenerated
	 */
	resetAssetInfoCache: function() {
		this.assetInfoCache = {};
	},
	/*
	 * Get assetInfo. return cache if exists
	 */
	_getAssetInfo: function(deviceId, deviceType) {
		var deferred = Q.defer();
		var key = deviceId + "-" + deviceType;
		var assetInfo = this.assetInfoCache[key];
		if (assetInfo) {
			deferred.resolve(assetInfo);
		} else {
			var self = this;
			Q.when(asset.getAssetInfo(deviceId, deviceType), function(assetInfo) {
				self._setAssetInfoCache(deviceId, deviceType, assetInfo);
				return deferred.resolve(assetInfo);
			})["catch"](function(error) {
				console.error(error);
				deferred.reject(error);
			});
		}
		return deferred.promise;
	},
	
	/*
	 * Watch events from IoT Platform
	 */
	watch: function() {
		// Watch device status. activate the asset when it is connected and deactivate it when disconnected
		var self = this;
		IOTF.on("+_DeviceStatus", function(deviceType, deviceId, payload) {
			console.log(deviceType + ":" + deviceId + "=" + payload.Action);
			if (payload.Action === "Connect") {
				Q.when(asset.setAssetState(deviceId, deviceType, true), function(assetInfo) {
					self._setAssetInfoCache(deviceId, deviceType, assetInfo);
				});
			} else if (payload.Action === "Disconnect") {
				self._clearTripId(deviceId, deviceType);
				self._setAssetInfoCache(deviceId, deviceType, null);
				asset.setAssetState(deviceId, deviceType, false);
			}
		});

		// Watch payload from IoT Platform and convert it into car probe
		IOTF.on("+", function(payload, deviceType, deviceId) {
			// check if mandatory fields exist
			var latitude = payload.lat || payload.latitude;
			var longitude = payload.lng || payload.longitude;
			if (deviceType !== asset.deviceType || isNaN(latitude) || isNaN(longitude)) {
				return;
			}
			if (!payload.trip_id && !this.makeTripId) {
				return;
			}
			
			return Q.when(payload.mo_id || self._getAssetInfo(deviceId, deviceType), function(assetInfo) {
				// Convert payload to car probe
				var mo_id = payload.mo_id;
				if (!mo_id) {
					mo_id = assetInfo.vehicleId;
					if (assetInfo.siteId) {
						mo_id = assetInfo.siteId + ":" + mo_id;
					}
				}
				var probe = {
					mo_id: mo_id,
					trip_id: payload.trip_id,
					longitude: longitude,
					latitude: latitude,
					speed: payload.speed || 0,
					heading: payload.heading || 0
				};

				// optional properties
				if (payload.ts) {
					probe.ts = payload.ts;
				}
				if (payload.altitude) {
					probe.altitude = payload.altitude;
				}
				if (payload.driver_id || assetInfo.driverId) {
					probe.driver_id = payload.driver_id || assetInfo.driverId;
				}
				if (payload.props) {
					probe.props = {};
					_.each(payload.props, function(value, key) {
						probe.props[key] = value;
					});
				}
				
				// mandatory properties
				if (!probe.trip_id) {
					// In case client does not give a trip id, server generate and keep it until the device is disconnected
					probe.trip_id = self._getTripId(deviceType, deviceId);
				}
				
				// Send car probe to VDH
				probeInterface.sendCarProbe(probe);
			})["catch"](function(err) {
				console.error(err);
			}).done();
		});
	}
});

if (asset.isIoTPlatformAvailable()) {
	probe.watch();
}