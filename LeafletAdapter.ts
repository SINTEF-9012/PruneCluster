/// <reference path="bower_components/DefinitelyTyped/Leaflet/Leaflet.d.ts"/>

module PruneCluster {
	export declare class LeafletAdapter implements L.ILayer {
		Cluster: PruneCluster;

		onAdd: (map: L.Map) => void;
		onRemove: (map: L.Map) => void;

		RegisterMarker: (marker: Marker) => void;
		RemoveMarkers: (markers: Marker[]) => void;
		ProcessView: () => void;
		FitBounds: () => void;
		GetMarkers: () => Marker[];

		BuildLeafletCluster: (cluster: Cluster, position: L.LatLng) => L.ILayer;
		BuildLeafletClusterIcon: (cluster: Cluster) => L.Icon;
		BuildLeafletMarker: (marker: Marker, position: L.LatLng) => L.Marker;
		PrepareLeafletMarker: (marker: L.Marker, data: {}, category: number) => void;
	}

	// The adapter store these properties inside L.Marker objects
	export interface LeafletMarker extends L.Marker {
		_population?: number;
		_hashCode?: number;
		_zoomLevel?: number;
		_removeFromMap?: boolean;
	}

	// What is inside cluster.data objects
	export interface ILeafletAdapterData {
		_leafletMarker?: LeafletMarker;
		_leafletCollision?: boolean;
		_leafletOldPopulation?: number;
		_leafletOldHashCode?: number;
		_leafletPosition?: L.LatLng;
	}
}


var PruneClusterForLeaflet = ((<any>L).Layer ? (<any>L).Layer : L.Class).extend({

	initialize: function(size: number = 120, clusterMargin: number = 20) {
		this.Cluster = new PruneCluster.PruneCluster();
		this.Cluster.Size = size;
		this.clusterMargin = Math.min(clusterMargin, size / 4);

		// Bind the Leaflet project and unproject methods to the cluster
		this.Cluster.Project = (lat: number, lng: number) =>
			this._map.project(new L.LatLng(lat, lng));

		this.Cluster.UnProject = (x: number, y: number) =>
			this._map.unproject(new L.Point(x, y));

		this._objectsOnMap = [];

		// Enable the spiderfier
		this.spiderfier = new PruneClusterLeafletSpiderfier(this);
	},

	RegisterMarker: function(marker: PruneCluster.Marker) {
		this.Cluster.RegisterMarker(marker);
	},

	RemoveMarkers: function(markers: PruneCluster.Marker[]) {
		this.Cluster.RemoveMarkers(markers);
	},

	BuildLeafletCluster: function(cluster: PruneCluster.Cluster, position: L.LatLng): L.ILayer {
		var m = new L.Marker(position, {
			icon: this.BuildLeafletClusterIcon(cluster)
		});

		m.on('click', () => {
			// Compute the  cluster bounds (it's slow : O(n))
			var markersArea = this.Cluster.FindMarkersInArea(cluster.bounds);
			var b = this.Cluster.ComputeBounds(markersArea);

			if (b) {

				var bounds = new L.LatLngBounds(
					new L.LatLng(b.minLat, b.maxLng),
					new L.LatLng(b.maxLat, b.minLng));

				var zoomLevelBefore = this._map.getZoom(),
					zoomLevelAfter = this._map.getBoundsZoom(bounds, false, new L.Point(20, 20));

				// If the zoom level doesn't change
				if (zoomLevelAfter === zoomLevelBefore) {
					// Send an event for the LeafletSpiderfier
					this._map.fire('overlappingmarkers', { markers: markersArea, center: m.getLatLng(), marker: m });
					this._map.setView(position, zoomLevelAfter);
				} else {
					this._map.fitBounds(bounds);
				}

			}
		});

		return m;
	},

	BuildLeafletClusterIcon: function(cluster: PruneCluster.Cluster): L.Icon {
		var c = 'prunecluster prunecluster-';
		var iconSize = 38;
		var maxPopulation = this.Cluster.GetPopulation();

		if (cluster.population < Math.max(10, maxPopulation*0.01)) {
			c += 'small';
		} else if (cluster.population < Math.max(100, maxPopulation * 0.05)) {
			c += 'medium';
			iconSize = 40;
		} else {
			c += 'large';
			iconSize = 44;
		}

		return new L.DivIcon({
			html: "<div><span>" + cluster.population + "</span></div>",
			className: c,
			iconSize: L.point(iconSize, iconSize)
		});
	},

	BuildLeafletMarker: function (marker: PruneCluster.Marker, position: L.LatLng): L.Marker {
		var m = new L.Marker(position);
		this.PrepareLeafletMarker(m, marker.data, marker.category);
		return m;
	},

	PrepareLeafletMarker: (marker: L.Marker, data: {}, category: number) => {
	},

	onAdd: function(map: L.Map) {
		this._map = map;
		map.on('movestart', this._moveStart, this);
		map.on('moveend', this._moveEnd, this);
		map.on('zoomend', this._zoomStart, this);
		map.on('zoomend', this._zoomEnd, this);
		this.ProcessView();

		map.addLayer(this.spiderfier);
	},

	onRemove: function(map: L.Map) {

		map.off('movestart', this._moveStart, this);
		map.off('moveend', this._moveEnd, this);
		map.off('zoomend', this._zoomStart, this);
		map.off('zoomend', this._zoomEnd, this);

		for (var i = 0, l = this._objectsOnMap.length; i < l; ++i) {
			map.removeLayer(this._objectsOnMap[i].data._leafletMarker);
		}

		this._objectsOnMap = [];
		this.Cluster.ResetClusters();

		map.removeLayer(this.spiderfier);

		this._map = null;
	},

	_moveStart: function() {
		this._moveInProgress = true;
	},

	_moveEnd: function(e) {
		this._moveInProgress = false;
		this._hardMove = e.hard;
		this.ProcessView();
	},

	_zoomStart: function() {
		this._zoomInProgress = true;
	},

	_zoomEnd: function() {
		this._zoomInProgress = false;
		this.ProcessView();
	},

	ProcessView: function () {
		// Don't do anything during the map manipulation 
		if (!this._map || this._zoomInProgress || this._moveInProgress) {
			return;
		}

		var map = this._map,
			bounds = map.getBounds(),
			zoom = map.getZoom(),
			marginRatio = this.clusterMargin / this.Cluster.Size;

		var southWest = bounds.getSouthWest(),
			northEast = bounds.getNorthEast();

		// First step : Compute the clusters
		var clusters: PruneCluster.Cluster[] = this.Cluster.ProcessView({
			minLat: southWest.lat,
			minLng: southWest.lng,
			maxLat: northEast.lat,
			maxLng: northEast.lng
		});

		var objectsOnMap: PruneCluster.Cluster[] = this._objectsOnMap,
			newObjectsOnMap: PruneCluster.Cluster[] = [];

		// Second step : By default, all the leaflet markers should be removed
		for (var i = 0, l = objectsOnMap.length; i < l; ++i) {
			(<PruneCluster.ILeafletAdapterData>objectsOnMap[i].data)._leafletMarker._removeFromMap = true;
		}

		var clusterCreationList: PruneCluster.Cluster[] = [];

		var opacityUpdateList = [];

		// Third step : anti collapsing system
		// => merge collapsing cluster using a sweep and prune algorithm
		var workingList: PruneCluster.Cluster[] = [];

		for (i = 0, l = clusters.length; i < l; ++i) {
			var icluster = clusters[i],
				iclusterData = <PruneCluster.ILeafletAdapterData> icluster.data;

			var latMargin = (icluster.bounds.maxLat - icluster.bounds.minLat) * marginRatio,
				lngMargin = (icluster.bounds.maxLng - icluster.bounds.minLng) * marginRatio;

			for (var j = 0, ll = workingList.length; j < ll; ++j) {
				var c = workingList[j];
				if (c.bounds.maxLng < icluster.bounds.minLng) {
					workingList.splice(j, 1);
					--j;
					--ll;
					continue;
				}

				var oldMaxLng = c.averagePosition.lng + lngMargin,
					oldMinLat = c.averagePosition.lat - latMargin,
					oldMaxLat = c.averagePosition.lat + latMargin,
					newMinLng = icluster.averagePosition.lng - lngMargin,
					newMinLat = icluster.averagePosition.lat - latMargin,
					newMaxLat = icluster.averagePosition.lat + latMargin;

				// Collapsing detected
				if (oldMaxLng > newMinLng && oldMaxLat > newMinLat && oldMinLat < newMaxLat) {
					iclusterData._leafletCollision = true;
					c.ApplyCluster(icluster);
					break;
				}
			}

			// If the object is not in collision, we keep it in the process
			if (!iclusterData._leafletCollision) {
				workingList.push(icluster);
			}

		}

		// Fourth step : update the already existing leaflet markers and create
		// a list of required new leaflet markers 
		clusters.forEach((cluster: PruneCluster.Cluster) => {
			var m = undefined;
			var data = <PruneCluster.ILeafletAdapterData> cluster.data;

			// Ignore collapsing clusters detected by the previous step 
			if (data._leafletCollision) {
				// Reset these clusters
				data._leafletCollision = false;
				data._leafletOldPopulation = 0;
				data._leafletOldHashCode = 0;
				return;
			}

			var position = new L.LatLng(cluster.averagePosition.lat, cluster.averagePosition.lng);

			// If the cluster is already attached to a leaflet marker
			var oldMarker = data._leafletMarker;
			if (oldMarker) {

				// If it's a single marker and it doesn't have changed
				if (cluster.population === 1 && data._leafletOldPopulation === 1 && cluster.hashCode === oldMarker._hashCode) {
					// Update if the zoom level has changed
					if (oldMarker._zoomLevel !== zoom) {
						this.PrepareLeafletMarker(
							oldMarker,
							cluster.lastMarker.data,
							cluster.lastMarker.category);
					}
					// Update the position
					oldMarker.setLatLng(position);
					m = oldMarker;

				// If it's a cluster marker on the same position
				} else if (cluster.population > 1 && data._leafletOldPopulation > 1 && (oldMarker._zoomLevel === zoom ||
					data._leafletPosition.equals(position))) {

					// Update the position
					oldMarker.setLatLng(position);

					// Update the icon if the population of his content has changed
					if (cluster.population != data._leafletOldPopulation ||
						cluster.hashCode !== data._leafletOldHashCode) {
						oldMarker.setIcon(this.BuildLeafletClusterIcon(cluster));
					}

					data._leafletOldPopulation = cluster.population;
					data._leafletOldHashCode = cluster.hashCode;
					m = oldMarker;
				}

			}

			// If a leaflet marker is unfound,
			// register it in the creation waiting list
			if (!m) {
				clusterCreationList.push(cluster);

				data._leafletPosition = position;
				data._leafletOldPopulation = cluster.population;
				data._leafletOldHashCode = cluster.hashCode;
			} else {
				// The leafet marker is used, we don't need to remove it anymore
				m._removeFromMap = false;
				newObjectsOnMap.push(cluster);

				// Update the properties
				m._zoomLevel = zoom;
				m._hashCode = cluster.hashCode;
				m._population = cluster.population;
				data._leafletMarker = m;
				data._leafletPosition = position;
			}

		});

		// Fifth step : recycle leaflet markers using a sweep and prune algorithm
		// The purpose of this step is to make smooth transition when a cluster or a marker
		// is moving on the map and its grid cell changes
		var toRemove = [];
		for (i = 0, l = objectsOnMap.length; i < l; ++i) {
			icluster = objectsOnMap[i];
			var idata =  <PruneCluster.ILeafletAdapterData> icluster.data,
				marker = idata._leafletMarker;

			// We do not recycle markers already in use
			if (idata._leafletMarker._removeFromMap) {

				// If the sweep and prune algorithm doesn't find anything,
				// the leaflet marker can't be recycled and it will be removed
				var remove = true;

				// Recycle marker only with the same zoom level
				if (marker._zoomLevel === zoom) {
					var pa = icluster.averagePosition;

					latMargin = (icluster.bounds.maxLat - icluster.bounds.minLat) * marginRatio,
						lngMargin = (icluster.bounds.maxLng - icluster.bounds.minLng) * marginRatio;

					for (j = 0, ll = clusterCreationList.length; j < ll; ++j) {
						var jcluster = clusterCreationList[j],
							jdata = <PruneCluster.ILeafletAdapterData> jcluster.data;
						var pb = jcluster.averagePosition;

						var oldMinLng = pa.lng - lngMargin,
							newMaxLng = pb.lng + lngMargin;

						oldMaxLng = pa.lng + lngMargin;
						oldMinLat = pa.lat - latMargin;
						oldMaxLat = pa.lat + latMargin;
						newMinLng = pb.lng - lngMargin;
						newMinLat = pb.lat - latMargin;
						newMaxLat = pb.lat + latMargin;

						// If a collapsing leaflet marker is found, it may be recycled
						if (oldMaxLng > newMinLng && oldMinLng < newMaxLng && oldMaxLat > newMinLat && oldMinLat < newMaxLat) {

							// If luckily it's the same single marker (it happens)
							if (marker._population === 1 && jcluster.population === 1 &&
								marker._hashCode === jcluster.hashCode) {

								// TODO maybe not usefull
								this.PrepareLeafletMarker(
									marker,
									jcluster.lastMarker.data,
									jcluster.lastMarker.category);

								// Update the position
								marker.setLatLng(jdata._leafletPosition);
								remove = false;

							// If it's a cluster marker
							} else if (marker._population > 1 && jcluster.population > 1) {

								// Update everything
								marker.setLatLng(jdata._leafletPosition);
								marker.setIcon(this.BuildLeafletClusterIcon(jcluster));
								jdata._leafletOldPopulation = jcluster.population;
								jdata._leafletOldHashCode = jcluster.hashCode;
								marker._population = jcluster.population;

								remove = false;
							}

							// If the leaflet marker is recycled 
							if (!remove) {

								// Register the new marker
								jdata._leafletMarker = marker;
								newObjectsOnMap.push(jcluster);

								// Remove it from the sweep and prune working list
								clusterCreationList.splice(j, 1);
								--j;
								--ll;

								break;
							}
						}
					}
				}

				// If sadly the leaflet marker can't be recycled
				if (remove) {
					if (!this._hardMove) {
						// Start a fading out transition
						idata._leafletMarker.setOpacity(0);
					}
					// The marker will be removed later
					toRemove.push(idata._leafletMarker);
				}
			}
		}

		// Sixth step : Create the new leaflet markers
		for (i = 0, l = clusterCreationList.length; i < l; ++i) {
			icluster = clusterCreationList[i],
			idata = <PruneCluster.ILeafletAdapterData> icluster.data;

			var iposition = idata._leafletPosition;

			var creationMarker: any;
			if (icluster.population === 1) {
				creationMarker = this.BuildLeafletMarker(icluster.lastMarker, iposition);
			} else {
				creationMarker = this.BuildLeafletCluster(icluster, iposition);
			}

			creationMarker.addTo(map);

			// Fading in transition
			// (disabled by default with no-anim)
			L.DomUtil.addClass(creationMarker._icon, "no-anim");
			creationMarker.setOpacity(0);
			opacityUpdateList.push(creationMarker);

			idata._leafletMarker = creationMarker;
			creationMarker._zoomLevel = zoom;
			creationMarker._hashCode = icluster.hashCode;
			creationMarker._population = icluster.population;

			newObjectsOnMap.push(icluster);
		}

		// Start the fading in transition
		window.setTimeout(() => {
			for (i = 0, l = opacityUpdateList.length; i < l; ++i) {
				var m = opacityUpdateList[i];
				L.DomUtil.removeClass(m._icon, "no-anim");
				m.setOpacity(1);
			}
		}, 1);

		// Remove the leaflet objects
		if (toRemove.length > 0) {
			// Immediate remove
			if (this._hardMove) {
				for (i = 0, l = toRemove.length; i < l; ++i) {
					map.removeLayer(toRemove[i]);
				}
			} else {
				// Remove after the fading out transition
				window.setTimeout(() => {
					for (i = 0, l = toRemove.length; i < l; ++i) {
						map.removeLayer(toRemove[i]);
					}
				}, 300);
			}
		}

		this._objectsOnMap = newObjectsOnMap;
		this._hardMove = false;
	},

	FitBounds: function() {
		var bounds: PruneCluster.Bounds = this.Cluster.ComputeGlobalBounds();
		if (bounds) {
			this._map.fitBounds(new L.LatLngBounds(
				new L.LatLng(bounds.minLat, bounds.maxLng),
				new L.LatLng(bounds.maxLat, bounds.minLng)));
		}
	},

	GetMarkers: function() {
		return this.Cluster.GetMarkers();
	}
});
