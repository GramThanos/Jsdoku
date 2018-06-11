/*
 * sAnim v1.0.0
 * Simple Animations
 *
 *
 * MIT License
 *
 * Copyright (c) 2018 Grammatopoulos Athanasios-Vasileios
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

var sAnim = (function(){

    // Constructor
    function SAnim(options, step, end){
		options = options || {};
		
		// Save info
		this.d = {};
		// Start anim from value
		this.d.fm = (typeof options.from === 'number') ? options.from : 0;
		// Stop anim to value
		this.d.to = (typeof options.to === 'number') ? options.to : 0;
		// Anim time frame
		this.d.tf = (typeof options.time === 'number' && options.time > 0) ? options.time : 500;
		// Time between frames
		this.d.ms = (typeof options.fps === 'number' && options.fps > 0) ? 1000/options.fps : 1000/60;
		// Animation step
		this.d.sp = (this.d.to - this.d.fm) / (this.d.tf / this.d.ms);
		
		// Save callbacks
		this.c = {
			stp : step,
			end : end || null
		};
		
		// Animation is stopped
		this.stop();
    };

    // Version
    SAnim.version = "v1.0.0";
	
	// Start the anim
	SAnim.prototype.start = function() {
		// Check if already running
		if (this.d.i) return;
		// Save instance
		var that = this;
		// Start interval
		this.d.i = setInterval(function() {
			that._step();
		}, this.d.ms);
		that._step();
		return this;
	}
	
	// Pause the anim
	SAnim.prototype.pause = function() {
		// Check if not running
		if (!this.d.i) return;
		clearInterval(this.d.i);
		this.d.i = null;
		return this;
	}
	
	// Stop the anim
	SAnim.prototype.stop = function() {
		this.pause();
		this.d.st = this.d.fm - this.d.sp;
		return this;
	}
	
	// Step the anim
	SAnim.prototype._step = function() {
		// If anim ended
		if (
			(this.d.sp > 0 && this.d.st >= this.d.to) ||
			(this.d.sp < 0 && this.d.st <= this.d.to)
		) {
			this._end();
			return;
		}
		// Calculate state
		this.d.st += this.d.sp;
		if (
			(this.d.sp > 0 && this.d.st > this.d.to) ||
			(this.d.sp < 0 && this.d.st < this.d.to)
		) {
			this.d.st = this.d.to;
		}
		
		// Call step
		this.c.stp(this.d.st, this.d.fm, this.d.to, this.d.tf);
		return this;
	}
	
	// Anim ended
	SAnim.prototype._end = function() {
		// Stop anim
		this.stop();
		// Call end callback
		if (this.c.end) {
			this.c.end(this.d.fm, this.d.to, this.d.tf);
		}
		return this;
	}

    // Return
    return SAnim;
})();
