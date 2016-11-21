/**
 * @todo See which module has the responsibility for tracking the time necessary to fire certain events
 * for example we don't want to trigger the turbulence announcement more than one or two times during
 * the flight and certainly not on a short spike of turbulence, and not close to each other. Is it the
 * aircraftStatus responsibility or is it of the state machine?
 */

const _ = require('lodash');
const $ = require('jquery');
const assert = require('assert');
const StateMachine = require('javascript-state-machine');

const Audio = require('./audio.js');
const audio = new Audio();

const Comms = require('./comms.js');
const comms = new Comms({ onDataReceived: handleDataReceived });
comms.init();

const AircraftStatus = require('./aircraftStatus.js');
const status = new AircraftStatus();
status.init();

var enabled = false;

function handleDataReceived(dataRefs) {
	if (!dataRefs[21] || !dataRefs[20] || !dataRefs[5] || !dataRefs[132]) {
		alert('Data sets 5, 20, 21, 132 are required');
		return;
	}
	if (enabled) {
		var packet = {
			timestamp: Date.now(),
			totalDistTravelledFt: dataRefs[21][6],
			altitudeMslFt: dataRefs[20][2],
			isOnRwy: dataRefs[20][4],
			turbulenceFactor: dataRefs[5][5],
			vSpeed: dataRefs[132][1],
		};
		status.pushPacket(packet);
	}
}

var timer = null,
	timeout = null;

var fsm = StateMachine.create({
	initial: 'OFF',
	error: function(eventName, from, to, args, errorCode, errorMessage) {
		console.warn('event ' + eventName + ' incorrent: ' + errorMessage);
	},
	events: [
		{name: 'enable', from: 'OFF', to: 'STANDBY'},
		{name: 'enableFromTakeoff', from: 'OFF', to: 'TAKEOFF'},
		{name: 'enableFromCruise', from: 'OFF', to: 'CRUISE'},
		{name: 'startedBoarding', from: 'STANDBY', to: 'BOARDING'},
		{name: 'startedTaxi', from: 'BOARDING', to: 'PUSHBACK'},
		{name: 'taxiingToRwy', from: 'PUSHBACK', to: 'TAXI_RWY'},
		{name: 'takingOff', from: 'TAXI_RWY', to: 'TAKEOFF'},
		{name: 'ascending', from: 'TAKEOFF', to: 'ASCENT'},
		{name: 'leveledFlight', from: 'ASCENT', to: 'CRUISE'},
		{name: 'turbulenceEncountered', from: 'CRUISE', to: 'CRUISE_TURBULENCE'},
		{name: 'turbulenceDissipated', from: 'CRUISE_TURBULENCE', to: 'CRUISE'},
		{name: 'startedDescent', from: ['CRUISE', 'CRUISE_TURBULENCE'], to: 'DESCENT'},
		{name: 'startedApproach', from: 'DESCENT', to: 'APPROACH'},
		{name: 'landing', from: 'APPROACH', to: 'LANDING'},
		{name: 'taxiingToTerm', from: 'LANDING', to: 'TAXI_TERM'},
		{
			name: 'disable', from: ['TAXI_TERM', 'LANDING', 'APPROACH', 'DESCENT', 'CRUISE',
			'CRUISE_TURBULENCE', 'ASCENT', 'TAKEOFF', 'TAXI_RWY', 'PUSHBACK', 'BOARDING', 'STANDBY'], to: 'OFF'
		}
	],
	callbacks: {
		onOFF: function(event, from, to) {
			clearInterval(timer);
			clearTimeout(timeout);
			audio.stopAll();
		},
		onSTANDBY: function(event, from, to) {
			timeout = setTimeout(function() {
				fsm.startedBoarding();
			}, 5000);
		},
		onBOARDING: function(event, from, to) {
			audio.playExclusive('welcome');
			timer = setInterval(function() {
				if (status.getDistanceTravelled() > 1) { // TODO: User defined
					clearInterval(timer);
					fsm.startedTaxi();
				}
			}, 1000);
		},
		onPUSHBACK: function(event, from, to) {
			audio.playExclusive('startTaxi');
			timeout = setTimeout(function() {
				fsm.taxiingToRwy();
			}, 80 * 1000); // TODO: This time should be user defined
		},
		onTAXI_RWY: function(event, from, to) {
			audio.playExclusive('safety');
			timer = setInterval(function() {
				if (status.isAscending()) {
					clearInterval(timer);
					fsm.takingOff();
				}
			}, 1000);
		},
		onTAKEOFF: function(event, from, to) {
			timer = setInterval(function() {
				if (status.isAscending()) {
					clearInterval(timer);
					fsm.ascending();
				}
			}, 1000);
		},
		onASCENT: function(event, from, to) {
			timer = setInterval(function() {
				if (status.hasReachedCruiseAltitude()) {
					clearInterval(timer);
					fsm.leveledFlight();
				}
			}, 1000);
		},
		onCRUISE: function(event, from, to) {
			// TODO: schedule food service in 5 min
			timer = setInterval(function() {
				if (status.getTurbulence()) {
					clearInterval(timer);
					fsm.turbulenceEncountered();
				}
				// TODO: detect descent
			}, 1000);
		},
		onCRUISE_TURBULENCE: function(event, from, to) {
			// TODO: cancel food service
			audio.playExclusive('turbulence');
			timer = setInterval(function() {
				if (!status.getTurbulence()) {
					clearInterval(timer);
					fsm.turbulenceDissipated();
				}
				// TODO: detect descent
			}, 1000);
		},

		// TODO: rest of rules here
	}
});

// // Uncomment to test states with buttons
// $('[data-event]').on('click', function(e) {
// 	var event = $(this).data('event');
// 	fsm[event]();
// });

$('[data-enable]').on('click', function(e) {
	$('[data-enable]').attr('disabled', 'disabled');
	$('[data-disable]').removeAttr('disabled');
	status.reset();
	var event = $(this).data('event');
	fsm[event]();
	enabled = true;
});

$('[data-disable]').on('click', function(e) {
	$('[data-disable]').attr('disabled', 'disabled');
	$('[data-enable]').removeAttr('disabled');
	clearInterval(timer);
	status.reset();
	fsm.disable();
	enabled = false;
});

setInterval(function() {
	$('[data-current-state]').html(fsm.current + '<br>' + status.getHistoryLength() + ' packets - Last: ' + JSON.stringify(status.getLastPacket()));
	$('[data-debug]').text('dist travelled: ' + status.getDistanceTravelled() + ' ' +
		'isOnRunway: ' + status.isOnRunway() + ' ' +
		'isAscending: ' + status.isAscending() + ' '
	)
}, 500);

