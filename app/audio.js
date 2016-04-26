const buzz = require('node-buzz');

function Audio() {

	var audios = {
		'enable': createAudio('01-welcome'),
		'startedTaxi': createAudio('02-start-taxi'),
		'taxiingToRwy': createAudio('03-safety'),
		'leveledFlight': createAudio('04-food-service'),
		'startedApproach': createAudio('05-descent'),
		'taxiingToTerm': createAudio('06-taxi-terminal'),
		'turbulenceEncountered': createAudio('07-turbulence')
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
			// audios[name].play();
			console.warn('play', name);
		}
	};

}

module.exports = Audio;