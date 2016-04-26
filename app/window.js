const _ = require('lodash');
const $ = require('jquery');
const assert = require('assert');
const StateMachine = require('javascript-state-machine');

const Audio = require('./audio.js');
const Comms = require('./comms.js');

const audio = new Audio();
const comms = new Comms({
	onDataReceived: function(data) {
		console.warn(data);
	}
});
comms.init();

var fsm = StateMachine.create({
	initial: 'OFF',
	// error: function(eventName, from, to, args, errorCode, errorMessage) {
	// 	console.warn('event ' + eventName + ' incorrent: ' + errorMessage);
	// },
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
	]
});

$('[data-event]').on('click', function(e) {
	var event = $(this).data('event');
	fsm[event]();
});

setInterval(function() {
	$('[data-current-state]').text(fsm.current);
}, 500);

fsm.onenterstate = function(event, from, to) {
	console.info(event, from, to);
	audio.playExclusive(event);
	if (event === 'disable') {
		audio.stopAll();
	}
};


