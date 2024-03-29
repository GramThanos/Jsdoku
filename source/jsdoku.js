/*
 * Jsdoku v1.0.0-beta
 */

var Jsdoku = (function(){

	// Constructor
	function Jsdoku(type, level, efford){
		this.type = (typeof level == 'number') ? type : 3;
		this.level = (typeof level == 'number') ? level : Jsdoku.level.HARD;
		this.efford = efford || Math.ceil(((2 - 0.5) * (this.level / Jsdoku.level.HARD) + 0.5) * Math.pow(this.type, 4));
		// Efford is the tryies when desolving, 2x Grid size will be in hard and 0.5x Grid size on easy

		this.generated = new Jsdoku.Generator(this.type);
		this.desolved = new Jsdoku.DeSolver(
			this.generated.grid,
			this.level,
			this.efford
		);

		this.grid = this.desolved.grid;
		this.solved = this.desolved.solved;
	}

	// Version
	Jsdoku.version = 'v1.0.1-beta';

	// Define the levels
	Jsdoku.level = {
		SUPER_EASY : 0,
		EASY : 1,
		MEDIUM : 2,
		HARD : 3
	};



	// Generator
	function Generator(type, grid){
		// Initialize
		this.init(type, grid);
		// Generate
		this.generate();
	}

	// Generator - Initialize
	Generator.prototype.init = function(type, grid) {
		grid = grid || false;

		// Sudoku size
		this.N = type;
		this.N_Square = this.N * this.N;

		// Stats init
		this.stats = {};
		
		// Generate keys
		this.keys = [];
		var i;
		for (i = 1; i <= this.N_Square; i++) {
			this.keys.push(i);
		}

		// Complete the already defined grid
		this.predefined = (grid) ? true : false;

		// Create grid and cell list
		this.grid = [];
		var x, y;

		if (!this.predefined) {
			// New grid
			for (y = 0; y < this.N_Square; y++) {
				this.grid.push([]);
				for (x = 0; x < this.N_Square; x++) {
					this.grid[y].push(false);
				}
			}
		}
		else {
			this.predefined_grid = [];
			// Existing grid
			for (y = 0; y < this.N_Square; y++) {
				this.predefined_grid.push(grid[y].slice(0));
				this.grid.push(grid[y].slice(0));
			}
		}


	};

	// Generator - Generate
	Generator.prototype.generate = function() {
		// Stats init
		this.stats.rounds = 0;
		this.stats.started = new Date().getTime();

		// Loop and try to create
		var success;
		do {
			this.clearGrid();
			success = this.tryToGenerate();
			this.stats.rounds ++;
		} while (!success);

		// Update time stats
		this.stats.ended = new Date().getTime();
		this.stats.took = this.stats.ended - this.stats.started;
	};

	// Generator - Clear grid
	Generator.prototype.clearGrid = function() {
		var x, y;
		if (!this.predefined) {
			for (y = 0; y < this.N_Square; y++) {
				for (x = 0; x < this.N_Square; x++) {
					this.grid[y][x] = false;
				}
			}
		}
		else {
			for (y = 0; y < this.N_Square; y++) {
				for (x = 0; x < this.N_Square; x++) {
					this.grid[y][x] = this.predefined_grid[y][x];
				}
			}
		}
	};

	// Generator - Try to generate
	Generator.prototype.tryToGenerate = function() {
		var i, j;
		var completed = 0;

		// Fill diagonial boxes (topleft - bottomright)
		if (!this.predefined) {
			for (i = 0; i < this.N; i++) {
				this.randomizeBox(i, i);
				completed ++;
			}
		}
		else {
			for (i = 0; i < this.N; i++) {
				this.fillBoxBruteForce(i, i);
				completed ++;
			}
		}

		// Fill rest diagonial boxes (bottomleft - topright)
		for (i = 0, j = this.N - 1; i < this.N; i++, j--) {
			if(i != j){
				if(!this.fillBoxBruteForce(j, i)) {
					// Brute force failed
					return false;
				}
				completed ++;
			}
		}

		var shift = 0;
		while (completed < this.N_Square) {
			shift++;

			// Fill +shift diagonial boxes
			for (i = shift, j = 0; i < this.N && j < this.N; i++, j++) {
				if(!this.fillBoxBruteForce(j, i)) {
					// Brute force failed
					return false;
				}
				completed ++;
			}

			// Fill -shift diagonial boxes
			for (i = 0, j = shift; i < this.N && j < this.N; i++, j++) {
				if(!this.fillBoxBruteForce(j, i)) {
					// Brute force failed
					return false;
				}
				completed ++;
			}

		}

		return true;
	};

	// Generator - Randomize a box
	Generator.prototype.randomizeBox = function(box_y, box_x) {
		box_y = box_y * this.N;
		box_x = box_x * this.N;
		
		// Copy keys
		var values = this.keys.slice(0);

		// Shuffle keys
		shuffle(values);

		// Insert keys
		var index = 0;
		var i, j;
		for (i = 0; i < this.N; i++) {
			for (j = 0; j < this.N; j++) {
				this.grid[box_y + j][box_x + i] = values[index];
				index ++;
			}
		}

		return true;
	};

	// Generator - Randomize a box
	Generator.prototype.fillBoxBruteForce = function(box_y, box_x) {

		// Find box position
		var y = box_y * this.N;
		var x = box_x * this.N;

		var i, j;

		// Create a cell list
		var cell;
		var candidates;
		var cells = [];
		for (i = 0; i < this.N; i++) {
			for (j = 0; j < this.N; j++) {
				cell = {y : y + j, x : x + i};
				if (this.grid[cell.y][cell.x] == false) {
					cells.push(cell);
				}
			}
		}
		if (cells.length == 0) {
			return true;
		}
		var cells_all = cells.slice(0);

		// Shuffle cells
		shuffle(cells);

		if(!this.fillDefinedCells(cells)){
			return false;
		}

		var fails = 0;
		i = 0;
		while (cells.length > 0) {
			cell = cells.shift();

			if (this.grid[cell.y][cell.x] != false) {
				continue;
			}

			if (!cell.candidates) {
				cell.candidates = this.getCandidates(cell.y, cell.x);
			}
			candidates = cell.candidates;

			
			if (candidates.length > 0) {
				this.grid[cell.y][cell.x] = candidates[Math.floor(Math.random() * candidates.length)];
				if(!this.fillDefinedCells(cells, [this.grid[cell.y][cell.x]])){
					candidates = [];
				}
			}

			// Failed to fill box
			if (candidates.length == 0) {
				fails ++;
				// Fail safe
				if (fails > this.N * Math.pow(this.N, this.N)) {
					return false;
				}

				// Reset box and try again
				cells = cells_all.slice(0);
				for (j = 0; j < cells.length; j++) {
					this.grid[cells[j].y][cells[j].x] = false;
					this.grid[cells[j].y][cells[j].x].candidates = false;
				}
				i = 0;

				shuffle(cells);
			}
		}

		return true;
	};

	// Generator - Search and find cells that has 1 candidate
	Generator.prototype.fillDefinedCells = function(cells, used_keys) {
		if (cells.length == 0) {
			return true;
		}
		var i;
		if (!cells[0].candidates) {
			for (i = cells.length - 1; i >= 0; i--) {
				cells[i].candidates = this.getCandidates(cells[i].y, cells[i].x);
			}
		}
		
		shuffle(cells);

		used_keys = used_keys || [];
		var cell;
		i = cells.length;
		while (i != 0) {
			// Get a cell
			cell = cells.shift();
			i--;

			// Remove used keys from candidates
			cell.candidates = leftOuterJoin(cell.candidates, used_keys);

			// No candidates, failed to generate
			if (cell.candidates.length == 0) {
				return false;
			}
			// Single candidate, set
			else if (cell.candidates.length == 1) {
				// Save key as used
				used_keys.push(cell.candidates[0]);
				// Set sell
				this.grid[cell.y][cell.x] = cell.candidates[0];
				// Search again the cells
				i = cells.length;
			}
			// Many candidates check rest cells
			else{
				cells.push(cell);
			}
		}

		return true;
	};


	Generator.prototype.getCandidates = function(y, x){
		var column = this.getColumn(x);
		var row = this.getRow(y);
		var box = this.getBox(y, x);
		var used = [].concat(column).concat(row).concat(box);

		var values = this.keys.slice(0);
		for (var i = values.length - 1; i >= 0; i--) {
			if(used.indexOf(values[i]) > -1){
				values.splice(i, 1);
			}
		}

		return values;
	};
	Generator.prototype.getColumn = function(x){
		var values = [];
		for (var i = 0; i < this.grid.length; i++) {
			values.push(this.grid[i][x]);
		}
		return values;
	},
	Generator.prototype.getRow = function(y){
		//return this.grid[y].slice(0);
		var values = [];
		for (var i = 0; i < this.grid.length; i++) {
			values.push(this.grid[y][i]);
		}
		return values;
	},
	Generator.prototype.getBox = function(y, x){
		x = x - x%this.N;
		y = y - y%this.N;

		var values = [];
		var i, j;
		for (i = x; i < x + this.N; i++) {
			for (j = y; j < y + this.N; j++) {
				values.push(this.grid[j][i]);
			}
		}
		return values;
	};

	// Link Generator
	Jsdoku.Generator = Generator;





	// Solver
	function Solver(grid, level){
		// Initialize
		this.init(grid, level);
		// Solve
		this.solve();
	}

	// Solver - Initialize
	Solver.prototype.init = function(grid, level) {
		// Sudoku size
		this.N = Math.floor(Math.sqrt(grid.length));
		this.N_Square = this.N * this.N;
		
		// Save options
		this.level = level;

		// Stats init
		this.stats = {};

		var i;

		// Generate keys
		this.keys = [];
		for (i = 1; i <= this.N_Square; i++) {
			this.keys.push(i);
		}

		// Copy grid
		this.grid = [];
		for (i = 0; i < grid.length; i++) {
			this.grid.push(grid[i].slice(0));
		}
	};

	// Solver - Solve
	Solver.prototype.solve = function() {
		// Stats init
		this.stats.rounds = 0;
		this.stats.moves = {
			super_easy : 0,
			easy : 0,
			medium : 0
		};
		this.stats.started = new Date().getTime();

		// Solve
		this.success = this.loopSolve();

		// Update time stats
		this.stats.ended = new Date().getTime();
		this.stats.took = this.stats.ended - this.stats.started;
	};

	// Solver - Loop Solve
	Solver.prototype.loopSolve = function() {
		// Get empty cells
		var empty = this.getEmptyCells();
		//shuffle(empty);

		var index = 0;
		var stuck = true;

		// While we have empty cells
		while (empty.length) {
			this.stats.rounds ++;

			// Try to solve one cell
			if(this.solveCell(empty[index])){
				// Remove cell
				empty.splice(index, 1);
				stuck = false;
			}
			else {
				// Next cell
				index++;
			}

			// If this is the end of the list
			if (index == empty.length) {
				if (stuck) {
					// No cell can be solved
					break;
				}

				// Start from the begining
				index = 0;
				stuck = true;
			}
		}

		return (empty.length == 0) ? true : false;
	};

	// Solver - Solve Cell
	Solver.prototype.solveCell = function(cell) {
		// Super easy
		if (
			SolveMethods.super_easy.lastEmptyCellRow.apply(this, [cell]) ||
			SolveMethods.super_easy.lastEmptyCellColumn.apply(this, [cell]) ||
			SolveMethods.super_easy.lastEmptyCellBox.apply(this, [cell])
		) {
			this.stats.moves.super_easy++;
			//console.log("super_easy move", cell, this.grid[cell.y][cell.x]);
			return true;
		}
		if (this.level <= Jsdoku.level.SUPER_EASY) return false;

		// Easy
		if (SolveMethods.easy.singleRowColumnBoxCandidate.apply(this, [cell])) {
			this.stats.moves.easy++;
			//console.log("easy move", cell, this.grid[cell.y][cell.x]);
			return true;
		}
		if (this.level <= Jsdoku.level.EASY) return false;

		// Medium
		if (SolveMethods.medium.singleCellBoxPossibleCandidate.apply(this, [cell])) {
			this.stats.moves.medium++;
			//console.log("medium move", cell, this.grid[cell.y][cell.x]);
			return true;
		}
		if (this.level <= Jsdoku.level.MEDIUM) return false;

		// Hard
		if (this.level <= Jsdoku.level.HARD) return false;
		

		return false;
	};

	// Solver - Get a list of empty cells
	Solver.prototype.getEmptyCells = function() {
		var list = [];
		for (var y = 0; y < this.N_Square; y++) {
			for (var x = 0; x < this.N_Square; x++) {
				if (this.grid[y][x] === false) {
					list.push({y : y, x : x});
				}
			}
		}
		return list;
	};

	// Solver - Get all candidates
	Solver.prototype.getCandidates = Generator.prototype.getCandidates;
	Solver.prototype.getColumn = Generator.prototype.getColumn;
	Solver.prototype.getRow = Generator.prototype.getRow;
	Solver.prototype.getBox = Generator.prototype.getBox;
	
	// Solver - Get candidates in column
	Solver.prototype.getColumnCandidates = function(x){
		var values = this.keys.slice(0);
		var pos;
		for (var i = 0; i < this.grid.length; i++) {
			pos = values.indexOf(this.grid[i][x]);
			if(pos > -1){
				values.splice(pos, 1);
			}
		}
		return values;
	};

	// Solver - Get candidates in row
	Solver.prototype.getRowCandidates = function(y){
		var values = this.keys.slice(0);
		var pos;
		for (var i = 0; i < this.grid.length; i++) {
			pos = values.indexOf(this.grid[y][i]);
			if(pos > -1){
				values.splice(pos, 1);
			}
		}
		return values;
	};

	// Link Solver
	Jsdoku.Solver = Solver;





	var SolveMethods = {

		super_easy : {
			lastEmptyCellRow : function(cell){
				var values = [];
				var empty = 0;
				var i;
				for (i = 0; i < this.grid.length; i++) {
					if(this.grid[cell.y][i] != false){
						values.push(this.grid[cell.y][i]);
					} else {
						empty++;
						if(empty > 1) return false;
					}
				}
				
				if (values.length + 1 == this.grid.length) {
					for (i = 0; i < this.keys.length; i++) {
						if (values.indexOf(this.keys[i]) == -1) {
							this.grid[cell.y][cell.x] = this.keys[i];
							return true;
						}
					}
				}
				return false;
			},

			lastEmptyCellColumn : function(cell){
				var values = [];
				var empty = 0;
				var i;
				for (i = 0; i < this.grid.length; i++) {
					if(this.grid[i][cell.x] != false){
						values.push(this.grid[i][cell.x]);
					} else {
						empty++;
						if(empty > 1) return false;
					}
				}
				
				if (values.length + 1 == this.grid.length) {
					for (i = 0; i < this.keys.length; i++) {
						if (values.indexOf(this.keys[i]) == -1) {
							this.grid[cell.y][cell.x] = this.keys[i];
							return true;
						}
					}
				}
				return false;
			},

			lastEmptyCellBox : function(cell){
				var box_x = cell.x - cell.x % this.N;
				var box_y = cell.y - cell.y % this.N;

				var values = [];
				var empty = 0;
				for (var x = box_x; x < box_x + this.N; x++) {
					for (var y = box_y; y < box_y + this.N; y++) {
						if(this.grid[y][x] != false){
							values.push(this.grid[y][x]);
						} else {
							empty++;
							if(empty > 1) return false;
						}
					}
				}
				
				if (values.length + 1 == this.grid.length) {
					for (var i = 0; i < this.keys.length; i++) {
						if (values.indexOf(this.keys[i]) == -1) {
							this.grid[cell.y][cell.x] = this.keys[i];
							return true;
						}
					}
				}
				return false;
			}
		},

		easy : {
			singleRowColumnBoxCandidate : function(cell){
				var values = this.getCandidates(cell.y, cell.x);
				if (values.length == 1) {
					this.grid[cell.y][cell.x] = values[0];
					return true;
				}
				return false;
			}
		},

		medium : {
			singleCellBoxPossibleCandidate : function(cell){
				var box_x = cell.x - cell.x % this.N;
				var box_y = cell.y - cell.y % this.N;

				var cell_candidates = this.keys.slice(0);
				var x, y;
				// Remove box keys from candidates
				for (x = box_x; x < box_x + this.N; x++) {
					for (y = box_y; y < box_y + this.N; y++) {
						if (this.grid[y][x] != false) {
							cell_candidates.splice(cell_candidates.indexOf(this.grid[y][x]), 1);
						}
					}
				}
				
				var i;
				var pos;
				var candidates;
				for (x = box_x; x < box_x + this.N; x++) {
					if (x != cell.x) {
						candidates = this.getColumnCandidates(x);
						if (candidates.length == 0) {
							for (i = 0; i < candidates.length; i++) {
								pos = cell_candidates.indexOf(candidates[i]);
								if (pos != -1){
									cell_candidates.splice(pos, 1);
								}
							}
						}
					}
				}
				if (cell_candidates.length == 1) {
					this.grid[cell.y][cell.x] = cell_candidates[0];
					return true;
				}

				for (y = box_y; y < box_y + this.N; y++) {
					if (y != cell.y) {
						candidates = this.getRowCandidates(y);
						if (candidates.length == 0) {
							for (i = 0; i < candidates.length; i++) {
								pos = cell_candidates.indexOf(candidates[i]);
								if (pos != -1){
									cell_candidates.splice(pos, 1);
								}
							}
						}
					}
				}
				if (cell_candidates.length == 1) {
					this.grid[cell.y][cell.x] = cell_candidates[0];
					return true;
				}

				return false;
			}
		}
	};





	// DeSolver
	function DeSolver(grid, level, efford){
		// Initialize
		this.init(grid, level, efford);
		// DeSolve
		this.deSolve();
	}

	// DeSolver - Initialize
	DeSolver.prototype.init = function(grid, level, efford) {
		// Sudoku size
		this.N = Math.floor(Math.sqrt(grid.length));
		this.N_Square = this.N * this.N;
		
		// Save options
		this.level = level;
		this.efford = efford;

		// Stats init
		this.stats = {};

		var i;

		// Generate keys
		this.keys = [];
		for (i = 1; i <= this.N_Square; i++) {
			this.keys.push(i);
		}

		// Copy grid
		this.grid = [];
		for (i = 0; i < this.N_Square; i++) {
			this.grid.push(grid[i].slice(0));
		}
	};

	// DeSolver - DeSolve
	DeSolver.prototype.deSolve = function() {
		// Stats init
		this.stats.rounds = 0;
		this.stats.removed = 0;
		this.stats.started = new Date().getTime();

		// DeSolve
		this.loopDeSolve();
		this.stats.fillpercent = 1 - (this.stats.removed / (this.N_Square * this.N_Square));
		this.stats.fillpercent = Math.round(this.stats.fillpercent * 100);

		window.g2 = this.grid;
		this.solved = new Solver(this.grid, this.level);
		this.stats.moves = this.solved.stats.moves;

		// Update time stats
		this.stats.ended = new Date().getTime();
		this.stats.took = this.stats.ended - this.stats.started;
	};

	// DeSolver - Loop DeSolve
	DeSolver.prototype.loopDeSolve = function() {
		// Get filled sells
		var filled = this.getFilledCells();

		var cell;
		var index;
		var old_value;
		var fails = this.efford;
		var s;

		// Start empting the grid
		while (fails > 0) {
			this.stats.rounds ++;
			
			// Get a random cell
			index = Math.floor(Math.random() * filled.length);
			cell = filled[index];

			// Clear value
			old_value = this.grid[cell.y][cell.x];
			this.grid[cell.y][cell.x] = false;

			// Try to solve
			s = new Solver(this.grid, this.level);
			if(s.success){
				filled.splice(index, 1);
				this.stats.removed ++;
			}

			// Failed to solve
			else {
				this.grid[cell.y][cell.x] = old_value;
				fails--;
			}
		}

		return true;
	};

	// DeSolver - Get a list of filled cells
	DeSolver.prototype.getFilledCells = function() {
		var list = [];
		for (var y = 0; y < this.N_Square; y++) {
			for (var x = 0; x < this.N_Square; x++) {
				if (this.grid[y][x] !== false) {
					list.push({y : y, x : x});
				}
			}
		}
		return list;
	};

	// Link DeSolver
	Jsdoku.DeSolver = DeSolver;
	




	

	// Format Jsdoku grid
	Jsdoku.format = function(input) {
		if (typeof input === 'string') {
			return Jsdoku.format_stringToMatrix(input);
		}
		else if (typeof input === 'object') {
			return Jsdoku.format_matrixToString(input);
		}
		return null;
	};

	Jsdoku.format_stringToMatrix = function(input) {
		var N_Square = Math.sqrt(input.length);
		var output = [];
		var x, y, i = 0;
		for (y = 0; y < N_Square; y++) {
			output.push([]);
			for (x = 0; x < N_Square; x++) {
				output[y].push(Jsdoku.format_charToValue(input[i]));
				i++;
			}
		}
		return output;
	};
	Jsdoku.format_matrixToString = function(input) {
		var N_Square = input.length;
		var output = '';
		var x, y;
		for (y = 0; y < N_Square; y++) {
			for (x = 0; x < N_Square; x++) {
				output += Jsdoku.format_valueToChar(input[y][x]);
			}
		}
		return output;
	};
	Jsdoku.format_stringToShortString = function(input) {
		input = input.replace(/_-/g, '.');
		var output = '';
		var dots = 0;
		for (var i = 0; i < input.length; i++) {
			if (input[i] === '.') {
				dots++;
				if (dots == 16) {
					dots = 1;
					output += '+F';
				}
			}
			else {
				if (dots == 1) {
					output += '.';
					dots = 0;
				}
				else if (dots > 1) {
					output += '+' + dots.toString(16);
					dots = 0;
				}
				output += input[i];
			}
		}
		return output;
	};
	Jsdoku.format_shortStringToString = function(input) {
		var output = '';
		var i = 0, j;
		while (i < input.length) {
			if (input[i] === '+') {
				i++;
				for (j = parseInt(input[i], 16) - 1; j >= 0; j--) {
					output += '.';
				}
			}
			else {
				output += input[i];
			}
			i++;
		}
		return output;
	};
	Jsdoku.format_charToValue = function(char) {
		if (char === '.' || char === '_' || char === '-') {
			return false;
		}
		else if (char == parseInt(char, 16)) {
			return parseInt(char, 16);
		}
		else {
			// Error
			return null;
		}
	};
	Jsdoku.format_valueToChar = function(value) {
		if (typeof value === 'number') {
			return value.toString(16);
		}
		else if (value === false) {
			return '.';
		}
		else {
			// Error
			return ' ';
		}
	};
	




	// Shuffle array
	var shuffle = function(a){
		var j, x, i;
		for (i = a.length - 1; i > 0; i--) {
			j = Math.floor(Math.random() * (i + 1));
			x = a[i];
			a[i] = a[j];
			a[j] = x;
		}
	};
	/*
	var union = function() {
		var a = merge.apply(null, arguments);
		var b = [];
		for (var i = a.length - 1; i >= 0; i--) {
			if(b.indexOf(a[i]) == -1){
				b.push(a[i]);
			}
		}
		return b;
	};
	var intersection = function() {
		var a = merge.apply(null, arguments);
		var b = [];

		var found;
		for (var i = a.length - 1; i >= 0; i--) {
			found = true;
			for (var j = arguments.length - 1; j >= 0; j--) {
				if(arguments[j].indexOf(a[j]) == -1){
					found = false;
					break;
				}
			}
			if (found) {
				b.push(a[j]);
			}
		}

		return a;
	};
	var merge = function(){
		var a = [];
		for (var i = arguments.length - 1; i >= 0; i--) {
			a.concat(arguments[i]);
		}
		return a;
	};
	*/
	var leftOuterJoin = function(a, b){
		var c = [];
		for (var i = a.length - 1; i >= 0; i--) {
			if (b.indexOf(a[i]) == -1) {
				c.push(a[i]);
			}
		}
		return c;
	};
	/*
	var rightOuterJoin = function(a, b){
		return leftOuterJoin(b, a);
	};
	*/

	// Return
	return Jsdoku;
})();