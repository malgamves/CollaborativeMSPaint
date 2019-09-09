const pubnub = new PubNub({
  publishKey: 'ENTER_YOUR_PUBLISH_KEY_HERE',
  subscribeKey: 'ENTER_YOUR_SUBSCRIBE_KEY_HERE'
});

let drawChannel = "draw";
let chatChannel = "chat";

//let occupancy = 0;
/* Drawing Section */

const mspaint = {
  sketchSelector: "",
  paintSelector: "",
  paintContext: null,
  currentIcon: null,
  canvas: null,
  start: function(selector1, selector2) {
    this.sketchSelector = selector1;
    this.paintSelector = selector2;

    let canvas = document.querySelector(this.paintSelector);
    this.canvas = canvas;
    this.paintContext = canvas.getContext("2d");

    pubnub.addListener({
      message: function(response) {
        if (response.channel === "draw") {
          drawFromStream(response.message);
        }
        if (response.channel === "chat") {
          publishMessages(response.message);
        }
      },
      presence: function(presenceEvent) {
        if (presenceEvent.action === "join") {
          addClient(presenceEvent);
        }

        if (presenceEvent.action === "timeout") {
          removeClient(presenceEvent);
        }
      }
    });

    pubnub.subscribe({
      channels: [drawChannel, chatChannel],
      withPresence: true
    });

    let plots = [];
    let sketch = document.querySelector(this.sketchSelector);
    let sketch_style = getComputedStyle(sketch);
    canvas.width = parseInt(sketch_style.getPropertyValue("width"));
    canvas.height = parseInt(sketch_style.getPropertyValue("height"));

    this.currentIcon = document.getElementById("current");

    let mouse = {
      x: 0,
      y: 0,
      getX: function() {
        return this.x - 65;
      },
      getY: function() {
        return this.y - 55;
      }
    };

    /* Drawing on Paint App */
    this.setLineWidth(5);
    this.setLineCap("round");
    this.setLineJoin("round");
    this.setColor("black");

    /* Mouse Capturing Work */
    let machine = this;
    canvas.addEventListener(
      "mousemove",
      function(e) {
        mouse.x = e.pageX - this.offsetLeft;
        mouse.y = e.pageY - this.offsetTop;
      },
      false
    );

    canvas.addEventListener(
      "mousedown",
      function(e) {
        machine.paintContext.beginPath();
        machine.paintContext.moveTo(mouse.getX(), mouse.getY());

        //initial dot
        mouse.x += 0.1;
        mouse.y += -0.1;
        onPaint();

        canvas.addEventListener("mousemove", onPaint, false);
      },
      false
    );

    canvas.addEventListener(
      "mouseout",
      function() {
        canvas.removeEventListener("mousemove", onPaint, false);
      },
      false
    );

    canvas.addEventListener(
      "mouseup",
      function() {
        canvas.removeEventListener("mousemove", onPaint, false);
        pubnub.publish({
          channel: drawChannel,
          message: {
            plots: plots
          }
        });

        plots = [];
      },
      false
    );

    let onPaint = function() {
      machine.paintContext.lineTo(mouse.getX(), mouse.getY());
      machine.paintContext.stroke();

      plots.push({ x: mouse.getX(), y: mouse.getY() });
    };

    function drawOnCanvas(plots) {
      machine.paintContext.beginPath();
      machine.paintContext.moveTo(plots[0].x, plots[0].y);

      for (let i = 1; i < plots.length; i++) {
        machine.paintContext.lineTo(plots[i].x, plots[i].y);
      }
      machine.paintContext.stroke();
    }

    function drawFromStream(message) {
      if (!message || message.plots.length < 1) return;
      drawOnCanvas(message.plots);
    }

    /* Color changing */
    let colorButtons = document.getElementsByClassName("color");
    for (let index = 0; index < colorButtons.length; index++) {
      colorButtons[index].addEventListener("click", function() {
        machine.setColor(this.getAttribute("data-color"));
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
    this.paintContext.lineJoin = lineJoin;
  },
  setColor: function(color) {
    this.currentIcon.style.background = "#" + color;
    this.paintContext.strokeStyle = "#" + color;
  }
};

/* Chat Section*/

const box = document.getElementById("box");

function chat() {
  const input = document.getElementById("input");

  input.addEventListener("keypress", function(e) {
    (e.keyCode || e.charCode) === 13 &&
      pubnub.publish({
        // Publish new message when enter is pressed.
        channel: chatChannel,
        message: input.value,
        x: (input.value = "")
      });
  });
}

function publishMessages(message) {
  box.innerHTML =
    ("" + message).replace(/[<>]/g, "") + "<br> <hr>" + box.innerHTML;
}

function removeClient(response) {
  document.getElementById("users").textContent = response.occupancy;
}

function addClient(response) {
  document.getElementById("users").textContent = response.occupancy;
}
/* Init Section */

window.download = function() {
  let dt = mspaint.canvas.toDataURL();
  dt = dt.replace(
    /^data:image\/[^;]/,
    "data:application/octet-stream;headers=Content-Disposition%3A%20attachment%3B%20filename=art.png"
  );
  window.location.href = dt;
};

window.onload = function() {
  mspaint.start("#sketch", "#paint");
  chat();
};

/* Modal Section */

// Get the modal
let modal = document.getElementById("myModal");

// Get the button that opens the modal
let btn = document.getElementById("openModal");

// Get the <span> element that closes the modal
let span = document.getElementsByClassName("close")[0];

// When the user clicks on the button, open the modal
btn.onclick = function() {
  modal.style.display = "block";
};

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};
