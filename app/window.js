const _ = require('lodash');
const $ = require('jquery');
const assert = require('assert');
const StateMachine = require('javascript-state-machine');

const audio = require('./audio.js');

var PORT = 49003;
var HOST = '127.0.0.1';

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

server.on('listening', function () {
	var address = server.address();
	var msg = 'UDP Server listening on ' + address.address + ':' + address.port;
	$('[data-connection]').text(msg);
});

server.on('message', _.throttle(onUDPMessageReceived, 2000));

server.bind(PORT, HOST);

const sentenceLength = 36;
const prologueLength = 5;
var timer = null;

function getPrologue(inputBuffer) {
	return inputBuffer.slice(0, prologueLength);
}

function getSentences(inputBuffer) {
	var sentences = inputBuffer.slice(5),
		numSentences = sentences.length / sentenceLength,
		ret = []
		;

	for (var i=0; i < numSentences; i++) {
		ret.push(sentences.slice(sentenceLength * i, (sentenceLength * i) + sentenceLength));
	}
	return ret;
}

function getValuesInSentence(sentenceBuffer) {
	var values = sentenceBuffer.slice(4),
		numValues = values.length / 4,
		ret = []
		;
	for (var i=0; i <= numValues-1; i++) {
		ret.push(values.readFloatLE((i*4)));
	}
	return ret;
}

function onUDPMessageReceived(message, remote) {

	var inputBuffer = Buffer.from(message, 'binary'),
		prologueBuffer = getPrologue(inputBuffer),
		sentenceBuffers = getSentences(inputBuffer),
		dataRefs = {}
		;

	assert.equal(prologueBuffer.toString('ascii', 0, 4), 'DATA', 'Invalid message prologue');

	var msg = remote.address + ':' + remote.port + ' - ' + inputBuffer.length + ' bytes, ' + sentenceBuffers.length + ' sentences.';
	$('[data-connection]').text(msg);

	_.forEach(sentenceBuffers, function(sentenceBuffer, k) {
		var values = getValuesInSentence(sentenceBuffer);
		dataRefs[sentenceBuffer.readUInt8(0)] = values;
	});

	if (timer) {
		clearTimeout(timer);
	}

	timer = setTimeout(function() {
		$('[data-connection]').text('Connection lost');
	}, 2000);

	// console.table(dataRefs);
}

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

/* example async
fsm.onleaveOFF = function(event, from, to) {
	console.log('starting...');
	setTimeout(function() {
		fsm.transition();
	}, 3000);
	return StateMachine.ASYNC;
};
*/

