/// <reference path="typings/tsd.d.ts"/>

// Based on https://github.com/jawj/OverlappingMarkerSpiderfier-Leaflet and
// https://github.com/Leaflet/Leaflet.markercluster because it works very perfectly


var PruneClusterLeafletSpiderfier = ((<any>L).Layer ? (<any>L).Layer : L.Class).extend({
	_2PI: Math.PI * 2,
	_circleFootSeparation: 25, //related to circumference of circle
	_circleStartAngle: Math.PI / 6,

	_spiralFootSeparation: 28, //related to size of spiral (experiment!)
	_spiralLengthStart: 11,
	_spiralLengthFactor: 5,

	_spiralCountTrigger: 8,

	spiderfyDistanceMultiplier: 1,

	initialize: function(cluster: PruneCluster.LeafletAdapter) {
		this._cluster = cluster;
		this._currentMarkers = [];

		this._multiLines = !!L.multiPolyline;
		this._lines = this._multiLines ?
			L.multiPolyline([], { weight: 1.5, color: '#222' }) :
			L.polyline([], { weight: 1.5, color: '#222' });
	},

	onAdd: function(map: L.Map) {
		this._map = map;

		this._map.on('overlappingmarkers', this.Spiderfy, this);

		this._map.on('click', this.Unspiderfy, this);
		this._map.on('zoomend', this.Unspiderfy, this);
	},

	Spiderfy: function (data) {
		// Ignore events from other PruneCluster instances
		if (data.cluster !== this._cluster) {
			return;
		}

		this.Unspiderfy();
		var markers = data.markers.filter(function(marker) {
			return !marker.filtered;
		});

		this._currentCenter = data.center;

		var centerPoint = this._map.latLngToLayerPoint(data.center);

		var points: L.Point[];
		if (markers.length >= this._spiralCountTrigger) {
			points = this._generatePointsSpiral(markers.length, centerPoint);
		} else {
			if (this._multiLines) { // if multilines, leaflet < 0.8
				centerPoint.y += 10; // center fix
			}
			points = this._generatePointsCircle(markers.length, centerPoint);
		}

		var polylines: L.LatLng[][] = [];


		var leafletMarkers: L.Marker[] = [];
		var projectedPoints: L.LatLng[] = [];

		for (var i = 0, l = points.length; i < l; ++i) {
			var pos = this._map.layerPointToLatLng(points[i]);
			var m = this._cluster.BuildLeafletMarker(markers[i], data.center);
			m.setZIndexOffset(5000);
			m.setOpacity(0);

			// polylines.push([data.center, pos]);

			this._currentMarkers.push(m);
			this._map.addLayer(m);

			leafletMarkers.push(m);
			projectedPoints.push(pos);
		}

		window.setTimeout(() => {
			for (i = 0, l = points.length; i < l; ++i) {
				leafletMarkers[i].setLatLng(projectedPoints[i])
					.setOpacity(1);
			}

			var startTime = +new Date();

			var interval = 42, duration = 290;
			var anim = window.setInterval(() => {

				polylines = [];

				var now = +new Date();
				var d = now - startTime;
				if (d >= duration) {
					window.clearInterval(anim);
					stepRatio = 1.0;
				} else {
					var stepRatio = d / duration;
				}

				var center = data.center;

				for (i = 0, l = points.length; i < l; ++i) {
					var p = projectedPoints[i],
						diffLat = p.lat - center.lat,
						diffLng = p.lng - center.lng;

					polylines.push([center, new L.LatLng(center.lat + diffLat * stepRatio, center.lng + diffLng * stepRatio)]);
				}

				this._lines.setLatLngs(polylines);

			}, interval);
		}, 1);

		this._lines.setLatLngs(polylines);
		this._map.addLayer(this._lines);

		if (data.marker) {
			this._clusterMarker = data.marker.setOpacity(0.3);
		}
	},

	_generatePointsCircle: function(count: number, centerPt: L.Point): L.Point[] {
		var circumference = this.spiderfyDistanceMultiplier * this._circleFootSeparation * (2 + count),
			legLength = circumference / this._2PI, //radius from circumference
			angleStep = this._2PI / count,
			res = [],
			i,
			angle;

		res.length = count;

		for (i = count - 1; i >= 0; i--) {
			angle = this._circleStartAngle + i * angleStep;
			res[i] = new L.Point(
				Math.round(centerPt.x + legLength * Math.cos(angle)),
				Math.round(centerPt.y + legLength * Math.sin(angle)));
		}

		return res;
	},

	_generatePointsSpiral: function(count: number, centerPt: L.Point): L.Point[] {
		var legLength = this.spiderfyDistanceMultiplier * this._spiralLengthStart,
			separation = this.spiderfyDistanceMultiplier * this._spiralFootSeparation,
			lengthFactor = this.spiderfyDistanceMultiplier * this._spiralLengthFactor,
			angle = 0,
			res = [],
			i;

		res.length = count;

		for (i = count - 1; i >= 0; i--) {
			angle += separation / legLength + i * 0.0005;
			res[i] = new L.Point(
				Math.round(centerPt.x + legLength * Math.cos(angle)),
				Math.round(centerPt.y + legLength * Math.sin(angle)));
			legLength += this._2PI * lengthFactor / angle;
		}
		return res;
	},

	Unspiderfy: function() {
		for (var i = 0, l = this._currentMarkers.length; i < l; ++i) {
			this._currentMarkers[i].setLatLng(this._currentCenter).setOpacity(0);
		}

		var map = this._map;
		var markers = this._currentMarkers;
		window.setTimeout(() => {
			for (i = 0, l = markers.length; i < l; ++i) {
				map.removeLayer(markers[i]);
			}

		}, 300);

		this._currentMarkers = [];

		this._map.removeLayer(this._lines);
		if (this._clusterMarker) {
			this._clusterMarker.setOpacity(1);
		}
	},

	onRemove: function(map: L.Map) {
		this.Unspiderfy();
		map.off('overlappingmarkers', this.Spiderfy, this);
		map.off('click', this.Unspiderfy, this);
		map.off('zoomend', this.Unspiderfy, this);
	}
});
