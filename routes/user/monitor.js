/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
/*
 * REST APIs using Driver Behavior service as backend
 */
const Q = require('q');
const _ = require('underscore');
const WebSocketServer = require('ws').Server;
const appEnv = require("cfenv").getAppEnv();

const router = module.exports = require('express').Router();
const authenticate = require('./auth.js').authenticate;
const vehicleDataHub = app_module_require('cvi-node-lib').vehicleDataHub;
const probeAggregator = require('./aggregator.js');
const driverInsightsAlert = require('../../driverInsights/fleetalert.js');

const handleError = require('./error.js').handleError;
const debug = require('debug')('route:probe');
debug.log = console.log.bind(console);

var AGGREGATION_THRESHOLD = isNaN(process.env.AGGREGATION_THRESHOLD) ? 500 : process.env.AGGREGATION_THRESHOLD;

/**
 * {
 * 	"mo_id1": {
 * 		"timestamp1": {
 * 			affected_events: [
 * 				{
 * 					"event_time":"yyyy-MM-ddTHH:mm:ss.sssZ"
 * 					"event_id":nn,
 * 					"base_event_id":nn,
 * 					"event_type":"nnn",
 * 					"event_name":"AAAAA",
 * 					...
 * 				}
 * 			],
 * 			notified_messages: [
 * 				{
 * 					"message":"MessageMessageMessage"
 * 					"props":{
 * 						"message_type":"xxxx",
 * 						"source_id":"xxxx",
 * 						"severity":"High/Mid/Low/Info"
 * 					}
 * 				},d_messages: [
 * 				{
 * 					"message":"MessageMessageMessage"
 * 					"props":{
 * 						"message_type":"xxxx",
 * 						"source_id":"xxxx",
 * 						"severity":"High/Mid/Low/Info"
 * 					}
 * 				},
 * 				{...}
 * 			]
 * 		},
 * 		"timestamp2": {...}
 * 	},
 * 	"mo_id2": {...}
 * }
 */
router.post('/notifiedActions', authenticate, function (req, res) {
	try {
		var affected_events = null;
		var notified_messages = null;
		if (req.body) {
			debug("notifiedActions req.body: " + JSON.stringify(req.body));
			Object.keys(req.body).forEach(function (mo_id) {
				var byMoid = req.body[mo_id];
				Object.keys(byMoid).forEach(function (ts) {
					var byTimestamp = byMoid[ts];
					affected_events = byTimestamp.affectedEvents;
					notified_messages = byTimestamp.notifiedMessages;
					driverInsightsAlert.handleEvents(
						{ mo_id: mo_id, ts: Number(ts) },
						(affected_events || []).concat(notified_messages || [])
					);
				});
			});
		}
		res.status(200).send("");
	} catch (error) {
		handleError(res, error);
	}
});

/**
 * Examples:
 *  List all the cars
 *   http://localhost:6003/monitoring/cars/query?min_lat=-90&max_lat=90&min_lng=-180&max_lng=180
 */
router.get('/carProbe', authenticate, function (req, res) {
	let qs = {}, path;
	if (req.query.vehicleId) {
		// query by vehicleId
		qs = { mo_id: req.query.vehicleId };
		path = `mo_id=${encodeURI(qs.mo_id)}`;
	} else {
		// get extent
		const extent = normalizeExtent(req.query);
		if ([extent.max_lat, extent.max_lng, extent.min_lat, extent.min_lng].some(function (v) { return isNaN(v); })) {
			return res.status(400).send('One or more of the parameters are undefined or not a number'); // FIXME response code
		}
		// query by extent
		qs = {
			min_longitude: extent.min_lng,
			min_latitude: extent.min_lat,
			max_longitude: extent.max_lng,
			max_latitude: extent.max_lat,
		};
		path = `region=${encodeURI(JSON.stringify(extent))}`;
	}

	// initialize WSS server
	var wssUrl = req.baseUrl + req.route.path;
	if (!req.app.server) {
		console.error('failed to create WebSocketServer due to missing app.server');
		res.status(500).send('Filed to start wss server in the insights router.')
	} else {
		initWebSocketServer(req.app.server, wssUrl);
	}

	getCarProbe(qs, true).then(function (probes) {
		// send normal response
		var ts;
		var count;
		var devices;
		var aggregated = !!probes.aggregated;
		if (aggregated) {
			var deviceInfo = probeAggregator.convertToDeviceInfo(probes.summary);
			count = deviceInfo.count;
			devices = deviceInfo.devices;
		} else {
			ts = _.max(_.map(probes, function (d) { return d.lastEventTime || d.t || d.ts; }));
			count = probes.length;
			devices = probes;
		}

		res.send({
			aggregated: aggregated,
			count: count,
			devices: devices,
			serverTime: (isNaN(ts) || !isFinite(ts)) ? Date.now() : ts,
			wssPath: wssUrl + '?' + path
		});
	}).catch(function (error) {
		res.send(400, error);
	}).done();
});

router.get('/carProbeMonitor', authenticate, function (req, res) {
	var qs = req.url.substring('/carProbeMonitor?'.length);
	res.render('carProbeMonitor', { appName: appEnv.name, qs: qs });
});

router.get("/alert", function (req, res) {
	var q = req.query;
	var conditions = [];
	if (q.type) {
		conditions.push("type:\"" + q.type + "\"");
	}
	if (q.severity) {
		conditions.push("severity:\"" + q.severity + "\"");
	}
	if (q.mo_id) {
		conditions.push("mo_id:\"" + q.mo_id + "\"");
	}
	if (q.from || q.to) {
		conditions.push("ts:[" + (q.from || "0") + " TO " + (q.to || "Infinity") + "]");
	}
	var includeClosed = q.includeClosed === "true";
	var limit = q.limit;

	var extent = normalizeExtent(q);
	var extentAsArray = [extent.max_lat, extent.max_lng, extent.min_lat, extent.min_lng];
	if (extentAsArray.every(function (v) { return isNaN(v); })) {
		Q.when(driverInsightsAlert.getAlerts(conditions, includeClosed, limit), function (docs) {
			res.send(docs);
		});
	} else if (extentAsArray.every(function (v) { return !isNaN(v); })) {
		var qs = {
			min_longitude: extent.min_lng,
			min_latitude: extent.min_lat,
			max_longitude: extent.max_lng,
			max_latitude: extent.max_lat,
		};
		Q.when(driverInsightsAlert.getAlertsForVehicleInArea(conditions, qs, includeClosed, limit), function (docs) {
			res.send(docs);
		});
	} else if (extentAsArray.some(function (v) { return isNaN(v); })) {
		res.status(400).send('One or more of the parameters are undefined or not a number')
	}
});

/*
 * Shared WebSocket server instance
 */
router.wsServer = null;

/*
 * Create WebSocket server
 */
var initWebSocketServer = function (server, path) {
	if (router.wsServer !== null) {
		return; // already created
	}

	var TIMEOUT = 1000;
	var timerWebSockEmitFunc = function () {
		//
		// This is invoked every TIMEOUT milliseconds to send the latest car probes to server
		//
		Q.allSettled(router.wsServer.clients.map(function (client) {
			function getQs() {
				if (client.mo_id) {
					return { "mo_id": client.mo_id };
				}
				var e = client.extent;
				if (e) {
					return {
						min_latitude: e.min_lat, min_longitude: e.min_lng,
						max_latitude: e.max_lat, max_longitude: e.max_lng
					};
				}
				return {
					min_latitude: -90, min_longitude: -180,
					max_latitude: 90, max_longitude: 180
				};
			}
			if (client.aggregationNeeded) {
				return Q();
			}
			return getCarProbe(getQs(), true).then(function (probes) {
				var count;
				var devices;
				var aggregated = !!probes.aggregated;
				client.aggregationNeeded = aggregated;
				if (aggregated) {
					var deviceInfo = probeAggregator.convertToDeviceInfo(probes.summary);
					count = deviceInfo.count;
					devices = deviceInfo.devices;
				} else {
					count = probes.length;
					devices = probes;
				}

				// construct message
				var msgs = JSON.stringify({
					aggregated: aggregated,
					count: (count),
					devices: (devices),
					deleted: undefined,
				});
				try {
					client.send(msgs);
					debug('  sent WSS message. ' + msgs);
				} catch (e) {
					console.error('Failed to send wss message: ', e);
				}
			})['catch'](function (err) {
				console.error('Failed to get car probe', err);
			});
		})).done(function () {
			// re-schedule once all the wss.send has been completed
			setTimeout(timerWebSockEmitFunc, TIMEOUT);
		});
	};
	setTimeout(timerWebSockEmitFunc, TIMEOUT);

	//
	// Create WebSocket server
	//
	var wss = router.wsServer = new WebSocketServer({
		server: server,
		path: path,
		verifyClient: function (info, callback) { //only allow internal clients from the server origin
			var isLocal = appEnv.url.toLowerCase().indexOf('://localhost') !== -1;
			var allow = isLocal || (info.origin.toLowerCase() === appEnv.url.toLowerCase());
			if (!allow) {
				console.error("rejected web socket connection form external origin " + info.origin + " only connection form internal origin " + appEnv.url + " are accepted");
			}
			if (!callback) {
				return allow;
			}
			var statusCode = (allow) ? 200 : 403;
			callback(allow, statusCode);
		}
	});

	//
	// Assign "extent" to the client for each connection
	//
	wss.on('connection', function (client) {
		debug('got wss connectoin at: ' + client.upgradeReq.url);
		// assign extent obtained from the web sock request URL, to this client
		var url = client.upgradeReq.url;
		var qsIndex = url.lastIndexOf('?region=');
		if (qsIndex >= 0) {
			try {
				var j = decodeURI(url.substr(qsIndex + 8)); // 8 is length of "?region="
				var extent = JSON.parse(j);
				client.extent = normalizeExtent(extent);
				var regions = probeAggregator.createRegions(
					client.extent.min_lng,
					client.extent.min_lat,
					client.extent.max_lng,
					client.extent.max_lat);
				client.aggregationNeeded = !!regions;
			} catch (e) {
				console.error('Error on parsing extent in wss URL', e);
			}
		} else {
			qsIndex = url.lastIndexOf("?mo_id=");
			if (qsIndex >= 0) {
				const mo_id = decodeURI(url.substr(qsIndex + 7)); // 7 is length of "?mo_id="
				client.mo_id = mo_id;
				client.aggregationNeeded = false;
			}
		}
	});
}

function getCarProbe(qs, addAlerts) {
	if (qs.min_longitude == -180) {
		console.warn("area is too large");
	}
	let regions;
	if (qs.min_longitude && qs.min_latitude && qs.max_longitude && qs.max_latitude) {
		regions = probeAggregator.createRegions(qs.min_longitude, qs.min_latitude, qs.max_longitude, qs.max_latitude);
	}
	var probes = Q(vehicleDataHub.getCarProbe(qs).then(function (probes) {
		// send normal response
		(probes || []).forEach(function (p) {
			if (p.timestamp) {
				p.ts = Date.parse(p.timestamp);
				p.deviceID = p.mo_id;
			}
		});
		if (!regions && AGGREGATION_THRESHOLD > 1 && probes.length > AGGREGATION_THRESHOLD) {
			regions = probeAggregator.createRegions(qs.min_longitude, qs.min_latitude, qs.max_longitude, qs.max_latitude, -1);
		}
		if (regions) {
			return probeAggregator.aggregate(regions, probes);
		}
		return probes;
	}));
	if (addAlerts) {
		probes = Q(probes.then(function (result) {
			if (result.summary) {
				return result;
			}
			var probes = result;
			if (!probes || probes.length == 0)
				return probes;

			var mo_ids = probes.map(function (probe) { return probe.mo_id; });
			return driverInsightsAlert.getAlertsForVehicles(mo_ids, /*includeClosed*/false, 200).then(function (result) {
				// result: { alerts: [ { closed_ts: n, description: s, mo_id: s, severity: s, timestamp: s, ts: n, type: s }, ...] }
				var alertsByMoId = _.groupBy(result.alerts || [], function (alert) { return alert.mo_id; });
				probes.forEach(function (probe) {
					var alertsForMo = alertsByMoId[probe.mo_id] || {}; // lookup
					if (alertsForMo) { // list of alerts
						var alertCounts = _.countBy(alertsForMo, function (alert) {
							return alert.severity;
						});
						alertCounts.items = alertsForMo; // details if needed

						// calculate summary
						var alertsByType = _.groupBy(alertsForMo, function (alert) { return alert.type; });
						// severity: High: 100, Medium: 10, Low: 1, None: 0 for now
						var severityByType = _.mapObject(alertsByType, function (alerts, type) {
							if (alerts && alerts.length === 0) return undefined;
							return _.max(alerts, function (alert) {
								var s = alerts.severity && alerts.severity.toLowerCase();
								return s === 'high' ? 100 : (s === 'medium' ? 10 : (s === 'low' ? 1 : 0));
							}).severity;
						});
						alertCounts.byType = severityByType;
						//
						probe.info = _.extend(probe.info || {}, { alerts: alertCounts }); // inject alert counts
					}
				})
				return probes;
			});
		}));
	}
	return probes;
}


function normalizeExtent(min_lat_or_extent, min_lng, max_lat, max_lng) {
	// convert one when the object is passed
	var min_lat;
	if (min_lat_or_extent && min_lat_or_extent.min_lat) {
		var e = min_lat_or_extent;
		min_lat = e.min_lat;
		min_lng = e.min_lng;
		max_lat = e.max_lat;
		max_lng = e.max_lng;
	} else {
		min_lat = min_lat_or_extent;
	}

	// to float
	min_lat = parseFloat(min_lat);
	min_lng = parseFloat(min_lng);
	max_lat = parseFloat(max_lat);
	max_lng = parseFloat(max_lng);

	// normalize
	var whole_lng = ((max_lng - min_lng) > 359.9);
	min_lng = whole_lng ? -180 : ((min_lng + 180) % 360) - 180;
	max_lng = whole_lng ? 180 : ((max_lng + 180) % 360) - 180;
	var extent = { min_lng: min_lng, min_lat: min_lat, max_lng: max_lng, max_lat: max_lat, whole_lng: whole_lng };

	return extent;
}
