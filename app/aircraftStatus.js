
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


	this.reset = function() {
		this.history = [];
	};

	this.init = function() {
		this.history = [];
	};

}

module.exports = AircraftStatus;