
function AircraftStatus() {

	this.history = [];

	this.pushPacket = function(packet) {
		this.history.push(packet);
		// TODO: trim data here to keep last N records
	};

	this.getHistoryLength = function() {
		return this.history.length;
	};

	this.getFirstPacket = function() {
		return this.history[0];
	};

	this.getLastPacket = function() {
		return this.history[this.getHistoryLength()-1];
	};

	this.getDistanceTravelled = function() {
		if (!this.getHistoryLength()) {
			return 0
		}
		var initial = this.getFirstPacket().totalDistTravelledFt,
			current = this.getLastPacket().totalDistTravelledFt;
		return current - initial;
	};

	this.isOnRunway = function() {
		if (!this.getHistoryLength()) {
			return null
		}
		return !!this.getLastPacket().isOnRwy; // FIXME: this doesn't seem to be reliable
	};

	this.isAscending = function() {
		if (!this.getHistoryLength()) {
			return 0
		}
		return this.getLastPacket().vSpeed > 1000;
	};

	this.hasReachedCruiseAltitude = function() {
		if (!this.getHistoryLength()) {
			return 0
		}
		// FIXME: Implement as: alt > 20000 AND same altitude for the last 5 min
		return this.getLastPacket().altitudeMslFt > 20000;
	};

	this.getTurbulence = function() {
		if (!this.getHistoryLength()) {
			return false
		}
		// FIXME: Implement as: factor > 0.02 for the last 5 min
		return this.getLastPacket().turbulenceFactor > 0.02;
	};
	
	this.reset = function() {
		this.history = [];
	};

	this.init = function() {
		this.history = [];
	};

}

module.exports = AircraftStatus;