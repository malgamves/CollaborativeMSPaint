var mspaint = {
	sketchSelector: '',
	paintSelector: '',
	paintContext: null,
	currentIcon: null,
	canvas: null,
	start: function(selector1, selector2) {
		this.sketchSelector = selector1;
		this.paintSelector = selector2;

		var canvas = document.querySelector(this.paintSelector);
		this.canvas = canvas;
        this.paintContext = canvas.getContext('2d');

        var channel = 'draw';
        
        var pubnub = PUBNUB.init({
            publish_key: '<Secret>',
            subscribe_key: '<Secret>',
            ssl: document.location.protocol === "https:"
    });
    
    pubnub.subscribe({
      channel: channel,
      callback: drawFromStream,
      presence: function(m){
        if(m.occupancy > 0){
          document.getElementById('users').textContent = m.occupancy;
        }
      }
    });
        
        var plots = [];
		var sketch = document.querySelector(this.sketchSelector);  
		var sketch_style = getComputedStyle(sketch);
		canvas.width = parseInt(sketch_style.getPropertyValue('width'));
		canvas.height = parseInt(sketch_style.getPropertyValue('height'));

		this.currentIcon = document.getElementById('current');

		var mouse = {
			x: 0, y: 0,
			getX: function() {
				return this.x - 65
			},
			getY: function() {
				return this.y - 55
			}
		};

		/* Drawing on Paint App */
		this.setLineWidth(5);
		this.setLineCap('round');
		this.setLineJoin('round');
		this.setColor('black');
		 
		/* Mouse Capturing Work */
		var machine = this;
		canvas.addEventListener('mousemove', function(e) {
			mouse.x = e.pageX - this.offsetLeft;
			mouse.y = e.pageY - this.offsetTop;
		}, false);

		canvas.addEventListener('mousedown', function(e) {
			machine.paintContext.beginPath();
			machine.paintContext.moveTo(mouse.getX(), mouse.getY());

			//initial dot
			mouse.x += 0.1;
			mouse.y += -0.1;
			onPaint();

			canvas.addEventListener('mousemove', onPaint, false);
		}, false);

		canvas.addEventListener('mouseout', function() {
			canvas.removeEventListener('mousemove', onPaint, false);
		}, false);

		canvas.addEventListener('mouseup', function() {
            canvas.removeEventListener('mousemove', onPaint, false);
            pubnub.publish({
                channel: channel,
                message: {
                  plots: plots
                }
              });
            
              plots = [];
		}, false);

		var onPaint = function() {
			machine.paintContext.lineTo(mouse.getX(), mouse.getY());
            machine.paintContext.stroke();
            
            plots.push({x: mouse.getX(), y: mouse.getY()});
            //console.log(plots)
        };
        
        function drawOnCanvas(plots) {
            //ctx.strokeStyle = color;
            machine.paintContext.beginPath();
            //console.log(plots);
            machine.paintContext.moveTo(plots[0].x, plots[0].y);
          
            for(var i=1; i<plots.length; i++) {
                machine.paintContext.lineTo(plots[i].x, plots[i].y);
            }
            machine.paintContext.stroke();
          }
          
          function drawFromStream(message) {
            if(!message || message.plots.length < 1) return;			
            drawOnCanvas(message.plots);
          }

		/* Color changing */
	 	var colorButtons = document.getElementsByClassName('color');
	 	for (var index = 0; index < colorButtons.length; index++) {
		 	colorButtons[index].addEventListener('click', function(){
		 		machine.setColor(this.getAttribute('data-color'));
		 	});
	 	}

	},
	setLineWidth: function(lineWidth) {
		this.paintContext.lineWidth = lineWidth;
	},
	setLineCap: function(lineCap) {
		this.paintContext.lineCap = lineCap;
	},
	setLineJoin: function(lineJoin) {
		this.paintContext.lineJoin= lineJoin;
	},
	setColor: function(color) {
		this.currentIcon.style.background = '#' + color;
		this.paintContext.strokeStyle = '#' + color;
	},
}

window.download = function() {
	var dt = mspaint.canvas.toDataURL();
	dt = dt.replace(/^data:image\/[^;]/, 'data:application/octet-stream;headers=Content-Disposition%3A%20attachment%3B%20filename=art.png');
	window.location.href = dt;
}

window.onload = function() {
	mspaint.start('#sketch', '#paint');
};

/* PubNub */
