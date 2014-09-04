module PruneCluster {

	// Use a quicksort algorithm instead of the insertion sort
	// algorithm when the number of changes in the cluster
	// exceed this ratio 
	var ratioForNativeSort = 0.2;

	// The position is the real position of the object
	// using a standard coordinate system, as WGS 84
	export interface Position {
		lat: number;
		lng: number;
	}

	// The point is a project position on the client display
	export class Point {
		x: number;
		y: number;
	}

	export interface Bounds {
		minLat: number;
		maxLat: number;
		minLng: number;
		maxLng: number;
	}

	export class ClusterObject {
		// Map position of the object
		public position: Position;

		// An attached javascript object, storing user data
		public data: any;

		// An hashCode identifing the object
		public hashCode: number;
	}

	// Hidden variable counting the number of created hashcode
	var hashCodeCounter: number = 1;

	// Number.MAX_SAFE_INTEGER
	var maxHashCodeValue = Math.pow(2, 53) - 1;

	export class Marker extends ClusterObject {

		// The category of the Marker, ideally a number between 0 and 7
		// can also be a string
		public category: number;

		// The weight of a Marker can influence the cluster icon or the cluster position
		public weight: number;

		// If filtered is true, the marker is not included in the clustering
		// With some datasets, it's faster to keep the markers inside PruneCluster and to
		// use the filtering feature. With some other datasets, it's better to remove the
		// markers
		public filtered: boolean;

		constructor(lat: number, lng: number, data: {} = {},
			category?: number, weight: number = 1, filtered: boolean = false) {
			super();
			this.data = data;
			this.position = { lat: lat, lng: lng };
			this.weight = weight;
			this.category = category;
			this.filtered = filtered;

			// The hashCode is used to identify the Cluster object
			this.hashCode = hashCodeCounter++;
		}

		public Move(lat: number, lng: number) {
			this.position.lat = lat;
			this.position.lng = lng;
		}

		// Apply the data object
		public SetData(data: any) {
			for (var key in data) {
				this.data[key] = data[key];
			}
        }
	}

	export class Cluster extends ClusterObject {
		// Cluster area
		public bounds: Bounds;

		// Number of markers clustered
		public population: number;

		// Average position of the cluster,
		// taking into account the cluster weight
		public averagePosition: Position;

		// Statistics table
		// The key is the category and the value is the sum
		// of the weights
		public stats: number[];

		// The total weight of the cluster
		public totalWeight: number;

		// The last marker added in the cluster
		// Usefull when the cluster contains only one marker
		public lastMarker: Marker;

		// If enabled, the cluster contains a list of his marker
		// It implies a performance cost, but you can use it
		// for building the icon, if your dataset is not too big
		public static ENABLE_MARKERS_LIST: boolean = false;

		// The list of markers in the cluster
		private _clusterMarkers: Marker[];

		constructor(marker?: Marker) {
			super();

			// Create a stats table optimized for categories between 0 and 7
			this.stats = [0, 0, 0, 0, 0, 0, 0, 0];
			this.data = {};


			// You can provide a marker directly in the constructor
			// It's like using AddMarker, but a bit faster
			if (!marker) {
				this.hashCode = 1;
				if (Cluster.ENABLE_MARKERS_LIST) {
					this._clusterMarkers = [];
				}
				return;
			}

			if (Cluster.ENABLE_MARKERS_LIST) {
				this._clusterMarkers = [marker];
			}

			this.lastMarker = marker;

			this.hashCode = 31 + marker.hashCode;

			this.population = 1;

			if (marker.category !== undefined) {
				this.stats[marker.category] = 1;
			}

			this.totalWeight = marker.weight;

			this.position = {
				lat: marker.position.lat,
				lng: marker.position.lng
			};

			this.averagePosition = {
				lat: marker.position.lat,
				lng: marker.position.lng
			};

		}

		public AddMarker(marker: Marker) {

			if (Cluster.ENABLE_MARKERS_LIST) {
				this._clusterMarkers.push(marker);
			}

			var h = this.hashCode;
			h = h * 31 + marker.hashCode;
			if (h >= maxHashCodeValue) {
				this.hashCode = h % maxHashCodeValue;
			} else {
				this.hashCode = h;
			}

			this.lastMarker = marker;

			// Compute the weighted arithmetic mean
			var weight = marker.weight,
				currentTotalWeight = this.totalWeight,
				newWeight = weight + currentTotalWeight;

			this.averagePosition.lat =
			(this.averagePosition.lat * currentTotalWeight +
				marker.position.lat * weight) / newWeight;

			this.averagePosition.lng =
			(this.averagePosition.lng * currentTotalWeight +
				marker.position.lng * weight) / newWeight;

			++this.population;
			this.totalWeight = newWeight;

			// Update the statistics if needed
			if (marker.category !== undefined) {
				this.stats[marker.category] = (this.stats[marker.category] + 1) || 1;
			}
		}

		public Reset() {
			this.hashCode = 1;
			this.lastMarker = undefined;
			this.population = 0;
			this.totalWeight = 0;
			this.stats = [0, 0, 0, 0, 0, 0, 0, 0];

			if (Cluster.ENABLE_MARKERS_LIST) {
				this._clusterMarkers = [];
			}
		}

		// Compute the bounds
		// Settle the cluster to the projected grid
		public ComputeBounds(cluster: PruneCluster) {

			var proj = cluster.Project(this.position.lat, this.position.lng);

			var size = cluster.Size;

			// Compute the position of the cluster
			var nbX = Math.floor(proj.x / size),
				nbY = Math.floor(proj.y / size),
				startX = nbX * size,
				startY = nbY * size;

			// Project it to lat/lng values
			var a = cluster.UnProject(startX, startY),
				b = cluster.UnProject(startX + size, startY + size);

			this.bounds = {
				minLat: b.lat,
				maxLat: a.lat,
				minLng: a.lng,
				maxLng: b.lng
			};
		}

		public GetClusterMarkers() {
			return this._clusterMarkers;
		}

		public ApplyCluster(newCluster: Cluster) {

			this.hashCode = this.hashCode * 41 + newCluster.hashCode * 43;
			if (this.hashCode > maxHashCodeValue) {
				this.hashCode = this.hashCode = maxHashCodeValue;
			}

			var weight = newCluster.totalWeight,
				currentTotalWeight = this.totalWeight,
				newWeight = weight + currentTotalWeight;

			this.averagePosition.lat =
			(this.averagePosition.lat * currentTotalWeight +
				newCluster.averagePosition.lat * weight) / newWeight;

			this.averagePosition.lng =
			(this.averagePosition.lng * currentTotalWeight +
				newCluster.averagePosition.lng * weight) / newWeight;

			this.population += newCluster.population;
			this.totalWeight = newWeight;

			// Merge the bounds 
			this.bounds.minLat = Math.min(this.bounds.minLat, newCluster.bounds.minLat);
			this.bounds.minLng = Math.min(this.bounds.minLng, newCluster.bounds.minLng);
			this.bounds.maxLat = Math.max(this.bounds.maxLat, newCluster.bounds.maxLat);
			this.bounds.maxLng = Math.max(this.bounds.maxLng, newCluster.bounds.maxLng);

			// Merge the statistics
			for (var category in newCluster.stats) {
				if (newCluster.stats.hasOwnProperty(category)) {
					if (this.stats.hasOwnProperty(category)) {
						this.stats[category] += newCluster.stats[category];
					} else {
						this.stats[category] = newCluster.stats[category];
					}
				}
			}

			// Merge the clusters lists
			if (Cluster.ENABLE_MARKERS_LIST) {
				newCluster.GetClusterMarkers().forEach((m) => {
					this._clusterMarkers.push(m);
				});
			}
		}
	}

	function checkPositionInsideBounds(a: Position, b: Bounds): boolean {
		return (a.lat >= b.minLat && a.lat <= b.maxLat) &&
			a.lng >= b.minLng && a.lng <= b.maxLng;
	}

	function insertionSort(list: ClusterObject[]) {
		for (var i: number = 1,
			j: number,
			tmp: ClusterObject,
			tmpLng: number,
			length = list.length; i < length; ++i) {
			tmp = list[i];
			tmpLng = tmp.position.lng;
			for (j = i - 1; j >= 0 && list[j].position.lng > tmpLng; --j) {
				list[j + 1] = list[j];
			}
			list[j + 1] = tmp;
		}
	}

	export class PruneCluster {
		private _markers: Marker[] = [];

		// Represent the number of marker added or deleted since the last sort
		private _nbChanges: number = 0;

		private _clusters: Cluster[] = [];

		// Cluster size in (in pixels)
		public Size: number = 166;

		// View padding (extended size of the view)
		public ViewPadding: number = 0.2;

		// These methods should be defined by the user
		public Project: (lat: number, lng: number) => Point;
		public UnProject: (x: number, y: number) => Position;

		public RegisterMarker(marker: Marker) {
			if ((<any>marker)._removeFlag) {
				delete (<any>marker)._removeFlag;
			}
			this._markers.push(marker);
			this._nbChanges += 1;
		}


		private _sortMarkers() {
			var markers = this._markers,
				length = markers.length;

			if (this._nbChanges && (!length || this._nbChanges / length > ratioForNativeSort)) {
				// Native sort
				this._markers.sort((a: Marker, b: Marker) => a.position.lng - b.position.lng);
			} else {
				// Insertion sort (faster for sorted or almost sorted arrays)
				insertionSort(markers);
			}

			// Now the list is sorted, we can reset the counter
			this._nbChanges = 0;
		}

		private _sortClusters() {
			// Insertion sort because the list is often almost sorted
			// and we want to have a stable list of clusters
			insertionSort(this._clusters);
		}

		private _indexLowerBoundLng(lng: number): number {
			// Inspired by std::lower_bound

			// It's a binary search algorithm
			var markers = this._markers,
				it,
				step,
				first = 0,
				count = markers.length;

			while (count > 0) {
				step = Math.floor(count / 2);
				it = first + step;
				if (markers[it].position.lng < lng) {
					first = ++it;
					count -= step + 1;
				} else {
					count = step;
				}
			}

			return first;
		}

		private _resetClusterViews() {
			// Reset all the clusters
			for (var i = 0, l = this._clusters.length; i < l; ++i) {
				var cluster = this._clusters[i];
				cluster.Reset();

				// The projection changes in accordance with the view's zoom level
				// (at least with Leaflet.js)
				cluster.ComputeBounds(this);
			}
		}

		public ProcessView(bounds: Bounds): Cluster[] {

			// Compute the extended bounds of the view
			var heightBuffer = Math.abs(bounds.maxLat - bounds.minLat) * this.ViewPadding,
				widthBuffer = Math.abs(bounds.maxLng - bounds.minLng) * this.ViewPadding;

			var extendedBounds: Bounds = {
				minLat: bounds.minLat - heightBuffer - heightBuffer,
				maxLat: bounds.maxLat + heightBuffer + heightBuffer,
				minLng: bounds.minLng - widthBuffer - widthBuffer,
				maxLng: bounds.maxLng + widthBuffer + widthBuffer
			};

			// We keep the list of all markers sorted
			// It's faster to keep the list sorted so we can use
			// a insertion sort algorithm which is faster for sorted lists
			this._sortMarkers();

			// Reset the cluster for the new view
			this._resetClusterViews();

			// Binary search for the first interesting marker
			var firstIndex = this._indexLowerBoundLng(extendedBounds.minLng);

			// Just some shortcuts
			var markers = this._markers,
				clusters = this._clusters;


			var workingClusterList = clusters.slice(0);

			// For every markers in the list
			for (var i = firstIndex, l = markers.length; i < l; ++i) {

				var marker = markers[i],
					markerPosition = marker.position;

				// If the marker longitute is higher than the view longitude,
				// we can stop to iterate
				if (markerPosition.lng > extendedBounds.maxLng) {
					break;
				}


				// If the marker is inside the view and is not filtered
				if (markerPosition.lat > extendedBounds.minLat &&
					markerPosition.lat < extendedBounds.maxLat &&
					!marker.filtered) {

					var clusterFound = false, cluster: Cluster;

					// For every active cluster
					for (var j = 0, ll = workingClusterList.length; j < ll; ++j) {
						cluster = workingClusterList[j];

						// If the cluster is far away the current marker
						// we can remove it from the list of active clusters
						// because we will never reach it again
						if (cluster.bounds.maxLng < marker.position.lng) {
							workingClusterList.splice(j, 1);
							--j;
							--ll;
							continue;
						}

						if (checkPositionInsideBounds(markerPosition, cluster.bounds)) {
							cluster.AddMarker(marker);
							// We found a marker, we don't need to go further
							clusterFound = true;
							break;
						}
					}


					// If the marker doesn't fit in any cluster,
					// we must create a brand new cluster.
					if (!clusterFound) {
						cluster = new Cluster(marker);
						cluster.ComputeBounds(this);
						clusters.push(cluster);
						workingClusterList.push(cluster);
					}
				}
			}


			// Time to remove empty clusters
			var newClustersList: Cluster[] = [];
			for (i = 0, l = clusters.length; i < l; ++i) {
				cluster = clusters[i];
				if (cluster.population > 0) {
					newClustersList.push(cluster);
				}
			}

			this._clusters = newClustersList;

			// We keep the list of markers sorted, it's faster
			this._sortClusters();

			return this._clusters;
		}

		public RemoveMarkers(markers?: Marker[]) {

            // if markers are undefined, remove all
            if (!markers) {
                this._markers = [];
                return;
            }

			// Mark the markers to be deleted
			for (var i = 0, l = markers.length; i < l; ++i) {
				(<any>markers[i])._removeFlag = true;
			}

			// Create a new list without the marked markers
			var newMarkersList = [];
			for (i = 0, l = this._markers.length; i < l; ++i) {
				if (!(<any>this._markers[i])._removeFlag) {
					newMarkersList.push(this._markers[i]);
				}
			}

			this._markers = newMarkersList;
		}

		// This method is a bit slow ( O(n)) because it's not worth to make
		// system which will slow down all the clusters just to have
		// this one fast
		public FindMarkersInArea(area: Bounds): Marker[] {
			var aMinLat = area.minLat,
				aMaxLat = area.maxLat,
				aMinLng = area.minLng,
				aMaxLng = area.maxLng,

				markers = this._markers,

				result = [];

			var firstIndex = this._indexLowerBoundLng(aMinLng);

			for (var i = firstIndex, l = markers.length; i < l; ++i) {
				var pos = markers[i].position;

				if (pos.lng > aMaxLng) {
					break;
				}

				if (pos.lat >= aMinLat && pos.lat <= aMaxLat &&
					pos.lng >= aMinLng) {

					result.push(markers[i]);
				}
			}

			return result;
		}

		public ComputeBounds(markers: Marker[]): Bounds {

			if (!markers || !markers.length) {
				return null;
			}

			var rMinLat = Number.MAX_VALUE,
				rMaxLat = -Number.MAX_VALUE,
				rMinLng = Number.MAX_VALUE,
				rMaxLng = -Number.MAX_VALUE;

			for (var i = 0, l = markers.length; i < l; ++i) {
				var pos = markers[i].position;

				if (pos.lat < rMinLat) rMinLat = pos.lat;
				if (pos.lat > rMaxLat) rMaxLat = pos.lat;
				if (pos.lng < rMinLng) rMinLng = pos.lng;
				if (pos.lng > rMaxLng) rMaxLng = pos.lng;
			}

			return {
				minLat: rMinLat,
				maxLat: rMaxLat,
				minLng: rMinLng,
				maxLng: rMaxLng
			};
		}

		public FindMarkersBoundsInArea(area: Bounds): Bounds {
			return this.ComputeBounds(this.FindMarkersInArea(area));
		}

		public ComputeGlobalBounds(): Bounds {
			return this.ComputeBounds(this._markers);
		}

		public GetMarkers(): Marker[] {
			return this._markers;
		}

		public ResetClusters() {
			this._clusters = [];
		}

	}
}
