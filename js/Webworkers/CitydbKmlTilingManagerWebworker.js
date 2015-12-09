/**
 * Web Worker for controlling dynamic loading and unloading KML/KMZ Tiles data
 */
(function() {
	var shouldRun = false;
	var stack = [];
	var isStillUpdating = true;
	var _bbox;
	var _rowDelta;
	var _colDelta;
	var _rownum;
	var _colnum;
	var _maxCountOfVisibleTiles;
	
	var eventlisteners = {
		initWorker : function(frame, maxCountOfVisibleTiles) {
			shouldRun = true;
			_maxCountOfVisibleTiles = maxCountOfVisibleTiles;
			eventlisteners["checkDataPool"].apply(self, [ frame ]);
		},
	
		checkDataPool : function(frame) {
			if (shouldRun == false) 
				return;
			
			if (frame == null) {
				stack = [];
				eventlisteners["updateTaskStack"].apply(self);
				return;
			}
			var dataPool = [];

			dataPool = eventlisteners["queryByMatrix"].apply(self, [ frame ]);	

			console.log("Size of the generated datapool is: " + dataPool.length);
			if (dataPool.length == 0) {
				stack = [];
				eventlisteners["updateTaskStack"].apply(self);
				return;
			}
				
			// Tiles within the view frame are sorted, so that the tiles in the middle of the viewport will be loaded firstly
			stack = eventlisteners["sortDatapool"].apply(self, [ dataPool, frame ]);
	
			var batchSize = 5;	
			for (var i = 0; i < batchSize; i++) {
				var matrixItem = stack.shift();
				reply("checkMasterPool", matrixItem);
			}
		},
	
		updateDataPoolRecord : function() {
			isStillUpdating = true;
		},
	
		notifySleep : function() {
			shouldRun = false;
		},
	
		notifyWake : function() {
			shouldRun = true;
			reply("removeDatasources");
		},
	
		abortAndnotifyWake : function() {
			stack = null;
			eventlisteners["notifyWake"].apply(self);
		},
	
		createMatrix : function(bbox, rowDelta, colDelta, rownum, colnum) {
			_bbox = bbox;
			_rowDelta = rowDelta;
			_colDelta = colDelta;
			_rownum = rownum;
			_colnum = colnum;
		},
		
		queryByMatrix : function(frame) {
			var dataPool = new Array();
			
			var frameMinX = frame[0];
			var frameMinY = frame[1];
			var frameMaxX = frame[2];
			var frameMaxY = frame[3];
			var minCol = Math.floor((frameMinX - _bbox.xmin) / _colDelta);
			var maxCol = Math.floor((frameMaxX - _bbox.xmin) / _colDelta);
			var minRow = Math.floor((frameMinY - _bbox.ymin) / _rowDelta);
			var maxRow = Math.floor((frameMaxY - _bbox.ymin) / _rowDelta);
			
			/** i --> column (X); j --> row (Y) */	
			for ( var i = minCol; i <= maxCol; i++ ) {
				if (i >= 0 && i <= _colnum) {
					for ( var j = minRow; j <= maxRow; j++ ) {
						if (j >= 0 && j <= _rownum) {
							var minX = _bbox.xmin + i * _colDelta;
							var minY = _bbox.ymin + j * _rowDelta;
							var maxX = _bbox.xmin + (i + 1) * _colDelta;
							var maxY = _bbox.ymin + (j + 1) * _rowDelta;
							dataPool.push([ minX, minY, maxX, maxY, {col: i, row: j, preFetching: false}]);	
						}														
					}
				}				
			}
			return dataPool;
		},
		
		checkFrameBbox: function(funcName, frame) {
			var frameMinX = frame[0];
			var frameMinY = frame[1];
			var frameMaxX = frame[2];
			var frameMaxY = frame[3];
			var minCol = Math.floor((frameMinX - _bbox.xmin) / _colDelta);
			var maxCol = Math.floor((frameMaxX - _bbox.xmin) / _colDelta);
			var minRow = Math.floor((frameMinY - _bbox.ymin) / _rowDelta);
			var maxRow = Math.floor((frameMaxY - _bbox.ymin) / _rowDelta);
			var numberOfTiles = (maxCol - minCol + 1) * (maxRow - minRow + 1);
			if (numberOfTiles <= _maxCountOfVisibleTiles) {
				reply(funcName, true);
			}
			else {
				reply(funcName, false);
			}			
		},
		
		pushTastItem: function(item) {
			if (stack != null) {
				stack.push(item);
				eventlisteners["updateTaskStack"].apply(self);
			}						
		},
	
		sortDatapool : function(pool, frame) {
			var centerX = (frame[0] + frame[2]) / 2;
			var centerY = (frame[1] + frame[3]) / 2;
			pool.sort(function(a, b) {
				var ax = (a[0] + a[2]) / 2;
				var ay = (a[1] + a[3]) / 2;
				var as = Math.sqrt((centerX - ax) * (centerX - ax) + (centerY - ay) * (centerY - ay));
	
				var bx = (b[0] + b[2]) / 2;
				var by = (b[1] + b[3]) / 2;
				var bs = Math.sqrt((centerX - bx) * (centerX - bx) + (centerY - by) * (centerY - by));
	
				return as - bs;
			});
	
			return pool;
		},

		updateTaskStack : function() {
			setTimeout(function(){		
				if (stack == null) {
					return;
				}						
				var matrixItem = stack.shift();
				if (typeof matrixItem == 'undefined') {
					if (isStillUpdating) {
						isStillUpdating = false;
						reply("removeDatasources");
						console.log("Tiling Manager repeat searching again...");
					} else {
						if (shouldRun == true) {
							shouldRun = false;
							console.log("Tiling Manager is sleeping...");
							reply("refreshView");
						}
					}
				} else {
					reply("checkMasterPool", matrixItem);
				}      										        							        			
        	}, 10*Math.random());
		}
	};
	
	//---------------------- system functions -----------------------------//			
	
	function defaultListener(vMsg) {}	
	/** listener name, argument to pass 1, argument to pass 2, etc. etc **/
	function reply() {
		if (arguments.length < 1) {
			throw new TypeError("reply - not enough arguments");
			return;
		}
		postMessage({
			"vo42t30" : arguments[0],
			"rnb93qh" : Array.prototype.slice.call(arguments, 1)
		});
	}
	
	self.onmessage = function(oEvent) {
		if (oEvent.data instanceof Object && oEvent.data.hasOwnProperty("bk4e1h0") && oEvent.data.hasOwnProperty("ktp3fm1")) {
			eventlisteners[oEvent.data.bk4e1h0].apply(self, oEvent.data.ktp3fm1);
		} else {
			defaultListener(oEvent.data);
		}
	};
})();	

