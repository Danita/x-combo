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
	if (!dataRefs[21] || !dataRefs[20] || !dataRefs[5]) {
		alert('Data sets 5, 20, 21 are required');
		return;
	}
	if (enabled) {
		var packet = {
			totalDistTravelledFt: dataRefs[21][6],
			altitudeMslFt: dataRefs[20][2],
			isOnRwy: dataRefs[20][4],
			turbulenceFactor: dataRefs[5][5]
		};
		status.pushPacket(packet);
	}
}

var checkInterval = null;

var fsm = StateMachine.create({
	initial: 'OFF',
	error: function(eventName, from, to, args, errorCode, errorMessage) {
		console.warn('event ' + eventName + ' incorrent: ' + errorMessage);
	},
	events: [
		{name: 'enable', from: 'OFF', to: 'STANDBY'},
		{name: 'startedTaxi', from: 'STANDBY', to: 'PUSHBACK'},
		{name: 'taxiingToRwy', from: 'PUSHBACK', to: 'TAXI_RWY'},
		{name: 'enteredRwy', from: 'TAXI_RWY', to: 'TAKEOFF'},
		{name: 'tookOff', from: 'TAKEOFF', to: 'ASCENT'},
		{name: 'leveledFlight', from: 'ASCENT', to: 'CRUISE'},
		{name: 'turbulenceEncountered', from: 'CRUISE', to: 'CRUISE_TURBULENCE'},
		{name: 'turbulenceDissipated', from: 'CRUISE_TURBULENCE', to: 'CRUISE'},
		{name: 'startedDescent', from: ['CRUISE', 'CRUISE_TURBULENCE'], to: 'DESCENT'},
		{name: 'startedApproach', from: 'DESCENT', to: 'APPROACH'},
		{name: 'landing', from: 'APPROACH', to: 'LANDING'},
		{name: 'taxiingToTerm', from: 'LANDING', to: 'TAXI_TERM'},
		{
			name: 'disable', from: ['TAXI_TERM', 'LANDING', 'APPROACH', 'DESCENT', 'CRUISE',
			'CRUISE_TURBULENCE', 'ASCENT', 'TAKEOFF', 'TAXI_RWY', 'PUSHBACK', 'STANDBY'], to: 'OFF'
		}
	],
	callbacks: {
		onOFF: function(event, from, to) {
			audio.stopAll();
		},
		onSTANDBY: function(event, from, to) {
			audio.playExclusive('welcome');
			clearInterval(checkInterval);
			checkInterval = setInterval(function() {
				if (status.getDistanceTravelled() > 10) {
					fsm.startedTaxi();
				}
			}, 1000);
		},
		onPUSHBACK: function(event, from, to) {
			clearInterval(checkInterval);
			audio.playExclusive('startTaxi');
			// TODO: checks here to next state
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
	fsm.enable();
	enabled = true;
});

$('[data-disable]').on('click', function(e) {
	$('[data-disable]').attr('disabled', 'disabled');
	$('[data-enable]').removeAttr('disabled');
	status.reset();
	fsm.disable();
	enabled = false;
});

setInterval(function() {
	$('[data-current-state]').html(fsm.current + '<br>' + status.getHistoryLength() + ' packets - Last: ' + JSON.stringify(status.getLastPacket()));
}, 500);

