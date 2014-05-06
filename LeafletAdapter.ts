module PruneCluster {
	export declare class LeafletAdapter implements L.ILayer {
		Cluster: PruneCluster;

		addTo: (map: L.Map) => void;
		onRemove: (map: L.Map) => void;
		
		RegisterMarker: (marker: Marker) => void;
		ProcessView: () => void;
	}
}



var PruneClusterForLeaflet = L.Class.extend({
	initialize: function() {
		this.Cluster = new PruneCluster.PruneCluster();

		this.Cluster.Project = (lat: number, lng: number) =>
			this._map.project(new L.LatLng(lat, lng));

		this.Cluster.UnProject = (x: number, y: number) =>
			this._map.unproject(new L.Point(x, y));

		this._objectsOnMap = [];
	},

	RegisterMarker: function(marker: PruneCluster.Marker) {
		this.Cluster.RegisterMarker(marker);
	},

	BuildLeafletCluster: function (cluster: PruneCluster.Cluster, position: L.LatLng): L.ILayer {
		var m = new L.Marker(position, {
			icon: this.BuildLeafletClusterIcon(cluster)
		});

		m.on('click', () => {
			this._map.fitBounds(new L.LatLngBounds(
				new L.LatLng(cluster.bounds.minLat, cluster.bounds.maxLng),
				new L.LatLng(cluster.bounds.maxLat, cluster.bounds.minLng)));
		});

		return m;
	},

	BuildLeafletClusterIcon: function(cluster: PruneCluster.Cluster): L.Icon {
		var c = 'prunecluster prunecluster-';
		if (cluster.population < 10) {
			c += 'small';
		} else if (cluster.population < 100) {
			c += 'medium';
		} else {
			c += 'large';
		}

		return new L.DivIcon({
			html: "<div><span>" + cluster.population + "</span></div>",
			className: c,
			iconSize: L.point(40, 40)
		});
	},

	BuildLeafletMarker: function(marker: PruneCluster.Marker, position: L.LatLng): L.ILayer {
		return new L.Marker(position);
	},

	onAdd: function(map: L.Map) {
		this._map = map;
		map.on('dragend', this.ProcessView, this);
		map.on('zoomstart', this._zoomStart, this);
		map.on('zoomend', this._zoomEnd, this);
		this.ProcessView();
	},

	onRemove: function (map: L.Map) {
		map.off('dragend', this.ProcessView, this);
		map.off('zoomstart', this._zoomStart, this);
		map.off('zoomend', this._zoomEnd, this);

		for (var i = 0, l = this._objectsOnMap.length; i < l; ++i) {
			this._map.removeLayer(this._objectsOnMap[i]);
		}
	},

	_zoomStart: function() {
		this.disableProcessView = true;
	},

	_zoomEnd: function() {
		this.disableProcessView = false;
		this.ProcessView();
	},

	ProcessView: function () {
		if (this.disableProcessView) return;

		var map = this._map,
			bounds = map.getBounds();

		var southWest = bounds.getSouthWest(),
			northEast = bounds.getNorthEast();

		var t = +new Date();
		var clusters : PruneCluster.Cluster[] = this.Cluster.ProcessView({
			minLat: southWest.lat,
			minLng: southWest.lng,
			maxLat: northEast.lat,
			maxLng: northEast.lng
		});
		console.log("time: ", (+new Date()) - t);

		var objectsOnMap: any[] = this._objectsOnMap,
			newObjectsOnMap: any[] = [];

		for (var i = 0, l = objectsOnMap.length; i < l; ++i) {
			objectsOnMap[i]._removeFromMap = true;
		}

		clusters.forEach((cluster: PruneCluster.Cluster) => {
			var m;

			var position = new L.LatLng(cluster.averagePosition.lat, cluster.averagePosition.lng);

			var oldMarker = cluster.data._leafletMarker;
			if (oldMarker) {

				if (cluster.population === 1 && cluster.data._leafletOldPopulation === 1) {
					oldMarker.setLatLng(position);
					m = oldMarker;
				} else if (cluster.population > 1 && cluster.data._leafletOldPopulation > 1) {
					oldMarker.setLatLng(position);
					oldMarker.setIcon(this.BuildLeafletClusterIcon(cluster));
					cluster.data._leafletOldPopulation = cluster.population;
					m = oldMarker;
				}
			}

			if (!m) {
				if (cluster.population === 1) {
					m = this.BuildLeafletMarker(cluster.marker, position);
				} else {
					m = this.BuildLeafletCluster(cluster, position);
				}
				m.addTo(map);
				cluster.data._leafletMarker = m;
				cluster.data._leafletOldPopulation = cluster.population;
			}

			m._removeFromMap = false;
			newObjectsOnMap.push(m);

		});

		for (i = 0, l = objectsOnMap.length; i < l; ++i) {
			if (objectsOnMap[i]._removeFromMap) {
				map.removeLayer(objectsOnMap[i]);
			}
			objectsOnMap[i]._removeFromMap = true;
		}

		this._objectsOnMap = newObjectsOnMap;
	}

});