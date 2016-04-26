const _ = require('lodash');
const $ = require('jquery');
const assert = require('assert');
const dgram = require('dgram');

function Comms(options) {

	var PORT = 49003;
	var HOST = '127.0.0.1';

	const sentenceLength = 36;
	const prologueLength = 5;

	var timer = null;
	var server = dgram.createSocket('udp4');

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

	function handleListening() {
		var address = server.address();
		var msg = 'UDP Server listening on ' + address.address + ':' + address.port;
		$('[data-connection]').text(msg);
	}

	function handleMessage(message, remote) {
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
		}, 5000);

		options.onDataReceived(dataRefs);
	}

	this.init = function() {
		server.on('listening', handleListening);
		server.on('message', _.throttle(handleMessage, 1000));
		server.bind(PORT, HOST);
	}

}

module.exports = Comms;