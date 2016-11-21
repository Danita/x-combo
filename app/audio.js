const buzz = require('node-buzz');

function Audio() {

	var audios = {
		'welcome': createAudio('01-welcome'),
		'startTaxi': createAudio('02-start-taxi'),
		'safety': createAudio('03-safety'),
		'foodService': createAudio('04-food-service'),
		'descent': createAudio('05-descent'),
		'taxiTerminal': createAudio('06-taxi-terminal'),
		'turbulence': createAudio('07-turbulence')
	};

	function createAudio(name) {
		return new buzz.sound(__dirname + '/../wav/announcements/default/' + name + '.wav');
	}

	this.stopAll = function() {
		buzz.all().stop();
	};

	this.playExclusive = function(name) {
		if (audios[name]) {
			this.stopAll();
			audios[name].setVolume(10);
			audios[name].play();
			// console.warn('play', name);
		}
	};

}

module.exports = Audio;