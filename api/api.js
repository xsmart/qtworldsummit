var request = require("request");
var fs = require('fs');

var base = {
	sourceUrl: "http://localhost/2015.json",
	lastUpdated: new Date(),
	schedule: [],
	__scheduleMap: {},
}

var detail = {
	// session_id => session
}	

var daysToDateMap = {
		// 0-based
		"Monday" : new Date(2015, 9, 5),
		"Tuesday" : new Date(2015, 9, 6),
		"Wednesday" : new Date(2015, 9, 7)
	}

	request(base.sourceUrl, function(error, response, body) {
		var doc = JSON.parse(body);
		for (var i = 0; i < doc.length; i++) {
			var session = doc[i];
			if (!base.__scheduleMap[session.session_day]) {
				base.__scheduleMap[session.session_day] = new Array;
			}
			base.__scheduleMap[session.session_day].push(session);
		}
		condition();
		saveToFile();
	});

	var condition = function() {
		
		function __createDay() {
			return {
				day: { },
				sessions: []
			}
		}

		function __formatMilitaryTime(time) {
		// http://stackoverflow.com/questions/29206453/best-way-to-convert-military-time-to-standard-time-in-javascript
		var time = time.split(':');

		var hours = Number(time[0]);
		var minutes = Number(time[1]);

		var timeValue = "" + ((hours >12) ? hours - 12 : hours);
		timeValue += (minutes < 10) ? ":0" + minutes : ":" + minutes;
		timeValue += (hours >= 12) ? " pm" : " am";

		return timeValue;
	}

	var schedule = [];

	for (var i = 0, days = Object.keys(base.__scheduleMap); i < days.length; i++) {
		var o = __createDay();
		o.day.date = {
			"formatted": daysToDateMap[days[i]],
		}
		o.sessions = [];
		var timeMap = {}
		for (var j = 0, s = base.__scheduleMap[days[i]]; j < s.length; j++) {
			var timeJoined = s[j].session_start_time + "-" + s[j].session_end_time
			if (!timeMap[timeJoined]) {
				timeMap[timeJoined] = new Array;
			}
			timeMap[timeJoined].push(s[j]);
		}

		for (var k = 0, t = Object.keys(timeMap); k < t.length; k++) {
			// k = time range, or session
			var timeRange = t[k];
			var timeRangeSplit = timeRange.split("-");
			var session = {
				"date" : {
					"plain" : {
						"starting" : timeRangeSplit[0],
						"ending" : timeRangeSplit[1]
					},
					"formatted" : {
						"12h" : __formatMilitaryTime(timeRangeSplit[0]) + " to " + __formatMilitaryTime(timeRangeSplit[1]),
						"24h" : timeRangeSplit[0] + " to " + timeRangeSplit[1]
					}
				},
				"tracks" : timeMap[t[k]].map(function(e) { 
					detail[e.session_id] = e;
					return {
						"id" : e.session_id,
						"title" : e.session_title,
						"presenter" : {
							"name" : e.session_speaker_name,
							"company" : e.session_speaker_company
						}
					}
				})
			}
			o.sessions.push(session);
		}
		base.schedule.push(o);
	}
	delete base.__scheduleMap;
}

var saveToFile = function() {	
	fs.writeFile("schedule.json", JSON.stringify(base, null, 2), function(err) {
		if(err) {
			return console.log(err);
		}
		console.log("Schedule saved");
		fs.writeFile("tracks.json", JSON.stringify(detail, null, 2), function(err) {
			if(err) {
				return console.log(err);
			}
			console.log("Tracks saved");
		}); 
	}); 	
}

module.exports = function(app) {

	app.get('/schedule', function(req, res) {
		res.send(base);
	});

	app.get('/tracks', function(req, res) {
		res.send(detail);
	});

	app.get('/track/:session_id', function(req, res) {
		res.send(detail[req.params.session_id] || { });
	});
}