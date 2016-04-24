const _ = require('lodash');
const assert = require('assert');

var audio = new Audio(__dirname + '/../wav/announcements/default/ding.wav');
document.getElementById('play').addEventListener('click', function(){
	audio.currentTime = 0;
	audio.play();
});

var PORT = 49003;
var HOST = '127.0.0.1';

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

server.on('listening', function () {
	var address = server.address();
	console.log('UDP Server listening on ' + address.address + ':' + address.port);
});

server.on('message', _.throttle(onUDPMessageReceived, 2000));

server.bind(PORT, HOST);

const sentenceLength = 36;
const prologueLength = 5;

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
		sentenceBuffers = getSentences(inputBuffer)
		;

	assert.equal(prologueBuffer.toString('ascii', 0, 4), 'DATA', 'Invalid message prologue');

	console.log(remote.address + ':' + remote.port +' - ' + inputBuffer.length + ' bytes, ' + sentenceBuffers.length + ' sentences.');

	_.forEach(sentenceBuffers, function(sentenceBuffer, k) {
		var values = getValuesInSentence(sentenceBuffer);
		console.log(k, 'Point:', sentenceBuffer.readUInt8(0), values.join());
	});

}