const drawingAppElName = 'paint-app';

if (typeof drawingAppCss === 'undefined') {
  const drawingAppCss = document.createElement('style');

  drawingAppCss.textContent = `
    body{
      margin: 0;
      padding: 0;
    }

    ${drawingAppElName} * {
      box-sizing: border-box;
      font-family: sans-serif;
    }

    ${drawingAppElName}{
      display: inline-block;
      background: #fff;
      width: 700px;
      max-width: 100%;
      box-shadow: 0 0 36px rgba(0,0,0,0.1), 0 0 100px #999;;
      padding: 10px;
      box-sizing: border-box;
      border-radius: 7px;
    }

    ${drawingAppElName} .da-wrappaer{

    }

    ${drawingAppElName} .da-canvas-holder{
      width: 100%;
    }

    ${drawingAppElName} .da-controllers{
      width: 100%;
      background: #fff;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      padding-bottom: 10px;
    }

    ${drawingAppElName} color-picker .cp-init-button{
      width: 30px;
      height: 30px;
      border: 1px solid #999;
    }

    ${drawingAppElName} canvas{
      box-shadow: 0 0 3px #999;
      border-radius: 7px;
    }

    ${drawingAppElName} .da-fill-color, ${drawingAppElName} .da-stroke-color{
      width: calc(50% - 15px);
      padding: 10px;
      box-shadow: 0 0 3px #999;
      border-radius: 7px;
    }

    ${drawingAppElName} .da-fill-size, ${drawingAppElName} .da-stroke-size{
      margin-top: 10px;
      background: #999;
      height: 5px;
    }

    ${drawingAppElName} .da-fill-size .draggable-controller, ${drawingAppElName} .da-stroke-size .draggable-controller{
      background: #999;
    }

    ${drawingAppElName} .da-size-input{
      display: flex;
      flex-wrap: no-wrap;
      align-items: center;
    }

    ${drawingAppElName} .da-size-input input{
      outline: none;
      border: none;
      font-size: 16px;
      width: 70px;
      text-align: right;
    }

    ${drawingAppElName} .da-action-bttns button{
      appearance: button;
      -moz-appearance: button;
      -webkit-appearance: button;
      cursor: pointer;
      outline: none;
      border: none;
      background: #4285f4;
      color: #fff;
      box-shadow: 0 0 0 1px transparent, 0 0 0 3px transparent;
      transition: 0.3s, background 0s, color 0s;
      position: relative;
      border-radius: 3px;
      padding: 5px;
    }

    ${drawingAppElName} .da-action-bttns button:active, ${drawingAppElName} .da-action-bttns button:focus{
      box-shadow: 0 0 0 1px #fff, 0 0 0 3px #4285f4;
    }

    ${drawingAppElName} button.da-export-bttn{
      background: #00c851;
    }

    ${drawingAppElName} .da-action-bttns button.da-export-bttn:active, ${drawingAppElName} .da-action-bttns button.da-export-bttn:focus{
      box-shadow: 0 0 0 1px #fff, 0 0 0 3px #00c851;
    }

    ${drawingAppElName} button.da-clear-bttn{
      background: #ff3547;
    }

    ${drawingAppElName} .da-action-bttns button.da-clear-bttn:active, ${drawingAppElName} .da-action-bttns button.da-clear-bttn:focus{
      box-shadow: 0 0 0 1px #fff, 0 0 0 3px #ff3547;
    }
  `;
  document.head.appendChild(drawingAppCss);
}

if (typeof DrawingApp === 'undefined') {
  let drawingAppId = 0;

  class DrawingApp extends HTMLElement {
    #wrapper;
    #canvasHolder;
    #canvas;
    #ctx;
    #setCanvas;
    #canDraw = false;
    #brushInit;
    #brushMove;
    #pageXY;
    #colorPickerFill;
    #colorPickerStroke;
    #canvasBounds;
    #brushSize = 1;
    #brushSizePX = this.#brushSize;
    #strokeSize = 0;
    #strokeSizePX = this.#strokeSize;
    #canvasImage;
    #onresize;
    #scaleX = 1;
    #scaleY = 1;
    #drawCommands = [];
    #canvasOriginalWidth;
    #canvasOriginalHeight;
    #command;
    #resizeTimeout;
    #brushSizeController;
    #strokeSizeController;
    #brushSizeInput;
    #strokeSizeInput;
    #recFunc;
    #animFunc;
    #exportBttn;
    #clearBttn;
    #saveBttn;
    #index;
    #id;
    #downloadAnchor;
    #blob;
    #exportData;
    #gCode = [];
    #outofCanvas = false;

    #clearArc = (x, y, radius) => {
      this.#ctx.save();
      this.#ctx.globalCompositeOperation = 'destination-out';
      this.#ctx.beginPath();
      this.#ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
      this.#ctx.fill();
      this.#ctx.restore();
    }

    #brushType = 'line';
    #arr;
    #mime;
    #bstr;
    #n;
    #u8arr;
    #dataURLtoFile = (dataurl, filename) => {
      this.#arr = dataurl.split(','),
        this.#mime = this.#arr[0].match(/:(.*?);/)[1],
        this.#bstr = atob(this.#arr[1]),
        this.#n = this.#bstr.length,
        this.#u8arr = new Uint8Array(this.#n);

      while (this.#n--) {
        this.#u8arr[this.#n] = this.#bstr.charCodeAt(this.#n);
      }
      return new File([this.#u8arr], filename, {
        type: this.#mime
      });
    }

    constructor() {
      super();

      drawingAppId++;
      this.#id = drawingAppId;

      this.#onresize = async () => {
        clearTimeout(this.#resizeTimeout);
        this.#resizeTimeout = setTimeout(async () => {
          if (this.#canvas.width / this.#canvasOriginalWidth !== this.#scaleX && this.#canvas.height / this.#canvasOriginalHeight !== this.#scaleY) {
            this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
            this.#scaleX = this.#canvas.width / this.#canvasOriginalWidth;
            this.#scaleY = this.#canvas.height / this.#canvasOriginalHeight;
            // this.#brushSize = this.#brushSizePX / ((this.#scaleX + this.#scaleY) / 2);
            // this.#strokeSize = this.#strokeSizePX / ((this.#scaleX + this.#scaleY) / 2);
            this.#brushSize = this.#brushSizePX;
            this.#strokeSize = this.#strokeSizePX;

            this.#ctx.scale(this.#scaleX, this.#scaleY);

            // this.#recFunc = () => {
            //   this.#index = 0;
            //   this.#animFunc = () => {
            //     if (this.#index < this.#drawCommands.length) {
            //       eval(this.#drawCommands[this.#index]);
            //       this.#index++;
            //       requestAnimationFrame(this.#animFunc);
            //     }
            //   }
            //
            //   this.#animFunc();
            // };
            //
            // this.#recFunc();

            // for (this.#command of this.#drawCommands) {
            eval(this.#drawCommands.join(''));
            // }
          }
        }, 300);
      }
    }

    connectedCallback() {
      this.innerHTML = `
        <div class="da-wrappaer">
          <div class="da-controllers">
            <div class="da-fill-color">
              <div>Fill:</div>
              <color-picker class="da-cp-fill"></color-picker>
              <div class="da-size-input"><input class="da-fill-size-input" type="text" value="${this.#brushSize}"><span>px</span></div>
              <range-slider class="horizontal da-fill-size"></range-slider>
            </div>
            <div class="da-stroke-color">
              <div>Stroke:</div>
              <color-picker class="da-cp-stroke"></color-picker>
              <div class="da-size-input"><input class="da-stroke-size-input" type="text" value="${this.#strokeSize}"><span>px</span></div>
              <range-slider class="horizontal da-stroke-size"></range-slider>
            </div>
          </div>

          <div class="da-action-bttns">
            <button class="da-export-bttn">Export</button>
            <button class="da-import-bttn">Import</button>
            <button class="da-clear-bttn">Clear</button>
            <button class="da-save-bttn">Save</button>
          </div>

          <div class="da-canvas-holder">
            <canvas></canvas>
          </div>
        </div>
      `;

      this.#wrapper = this.querySelector('.da-wrapper');
      this.#canvasHolder = this.querySelector('.da-canvas-holder');
      this.#canvas = this.querySelector('canvas');
      this.#colorPickerFill = this.querySelector('color-picker.da-cp-fill');
      this.#colorPickerStroke = this.querySelector('color-picker.da-cp-stroke');
      this.#brushSizeController = this.querySelector('.da-fill-size');
      this.#strokeSizeController = this.querySelector('.da-stroke-size');
      this.#brushSizeInput = this.querySelector('.da-fill-size-input');
      this.#strokeSizeInput = this.querySelector('.da-stroke-size-input');
      this.#exportBttn = this.querySelector('.da-export-bttn');
      this.#clearBttn = this.querySelector('.da-clear-bttn');
      this.#saveBttn = this.querySelector('.da-save-bttn');

      this.#ctx = this.#canvas.getContext('2d');

      this.#exportBttn.addEventListener('click', () => {
        this.#downloadAnchor = document.createElement('a');
        this.#downloadAnchor.setAttribute('download', 'download.txt');
        this.#blob = new Blob(this.#gCode, {
          type: 'text/plain'
        });
        this.#downloadAnchor.href = URL.createObjectURL(this.#blob);;
        document.body.appendChild(this.#downloadAnchor);
        this.#downloadAnchor.click();
        this.#downloadAnchor.remove();
      });

      this.#clearBttn.addEventListener('click', () => {
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
        this.#gCode = [];
      });

      this.#saveBttn.addEventListener('click', () => {
        this.#downloadAnchor = document.createElement('a');
        this.#downloadAnchor.setAttribute('download', 'data.png');
        this.#downloadAnchor.href = this.#canvas.toDataURL();
        document.body.appendChild(this.#downloadAnchor);
        this.#downloadAnchor.click();
        this.#downloadAnchor.remove();
      });

      this.#setCanvas = () => {
        if (this.#canvas.width !== this.#canvasHolder.offsetWidth) {
          this.#canvas.width = this.#canvasHolder.offsetWidth;
          this.#canvas.height = this.#canvasHolder.offsetWidth / 2;
          this.#onresize();
        }
      }

      this.#setCanvas();

      this.#canvasOriginalWidth = this.#canvas.width;
      this.#canvasOriginalHeight = this.#canvas.height;

      this.#brushSizeInput.addEventListener('input', () => {
        if (!isNaN(this.#brushSizeInput.value)) {
          if (this.#brushSizeInput.value > 100) {
            this.#brushSizeInput.value = 100;
          } else if (this.#brushSizeInput.value < 0) {
            this.#brushSizeInput.value = 0;
          }
        } else {
          this.#brushSizeInput.value = 0;
        }

        this.#brushSizeController.value = {
          x: this.#brushSizeInput.value,
          y: null
        };

        // this.#brushSize = parseInt(this.#brushSizeController.value.x) / ((this.#scaleX + this.#scaleY) / 2);
        this.#brushSize = parseInt(this.#brushSizeController.value.x);
        this.#brushSizePX = this.#brushSize;
      });

      this.#strokeSizeInput.addEventListener('input', () => {
        if (!isNaN(this.#strokeSizeInput.value)) {
          if (this.#strokeSizeInput.value > 100) {
            this.#strokeSizeInput.value = 100;
          } else if (this.#strokeSizeInput.value < 0) {
            this.#strokeSizeInput.value = 0;
          }
        } else {
          this.#strokeSizeInput.value = 0;
        }

        this.#strokeSizeController.value = {
          x: this.#strokeSizeInput.value,
          y: null
        };

        // this.#strokeSize = parseInt(this.#strokeSizeController.value.x) / ((this.#scaleX + this.#scaleY) / 2);
        this.#strokeSize = parseInt(this.#strokeSizeController.value.x);
        this.#strokeSizePX = this.#strokeSize;
      });

      this.#brushSizeController.value = {
        x: this.#brushSize,
        y: null
      };

      this.#brushSizeController.addEventListener('input', (e) => {
        this.#brushSizeInput.value = parseInt(this.#brushSizeController.value.x);
        // this.#brushSize = parseInt(this.#brushSizeController.value.x) / ((this.#scaleX + this.#scaleY) / 2);
        this.#brushSize = parseInt(this.#brushSizeController.value.x);
        this.#brushSizePX = this.#brushSize;
      });

      this.#strokeSizeController.value = {
        x: this.#strokeSize,
        y: null
      };

      this.#strokeSizeController.addEventListener('input', (e) => {
        this.#strokeSizeInput.value = parseInt(this.#strokeSizeController.value.x);
        // this.#strokeSize = parseInt(this.#strokeSizeController.value.x) / ((this.#scaleX + this.#scaleY) / 2);
        this.#strokeSize = parseInt(this.#strokeSizeController.value.x);
        this.#strokeSizePX = this.#strokeSize;
      });

      window.addEventListener('resize', () => {
        this.#setCanvas();
      });

      this.#brushInit = (e) => {
        this.#canDraw = true
      }

      this.#brushMove = (e) => {
        if (this.#canDraw) {
          e.preventDefault();
          this.#canvasBounds = this.#canvas.getBoundingClientRect();

          this.#pageXY = {};
          if (e.touches) {
            this.#pageXY.x = e.touches[0].clientX * this.#scaleX;
            this.#pageXY.y = e.touches[0].clientY * this.#scaleY;
          } else {
            this.#pageXY.x = e.clientX / this.#scaleX;
            this.#pageXY.y = e.clientY / this.#scaleY;
          }

          // this.#ctx.fillRect(this.#pageXY.x - this.#canvasBounds.left - (this.#brushSize / 2), this.#pageXY.y - this.#canvasBounds.top - (this.#brushSize / 2), this.#brushSize, this.#brushSize);

          this.#command = null;

          if (this.#brushType === 'circle') {
            if (this.#strokeSize > 0) {
              this.#ctx.beginPath();
              this.#ctx.arc(this.#pageXY.x - (this.#canvasBounds.left / this.#scaleX), this.#pageXY.y - (this.#canvasBounds.top / this.#scaleY), this.#brushSize + this.#strokeSize, 0, 2 * Math.PI, false);
              if (this.#strokeSize > 0 && this.#brushSize > 0) {
                this.#ctx.arc(this.#pageXY.x - (this.#canvasBounds.left / this.#scaleX), this.#pageXY.y - (this.#canvasBounds.top / this.#scaleY), this.#brushSize, 0, 2 * Math.PI, true);
              }
              this.#ctx.fillStyle = this.#colorPickerStroke.value;
              this.#ctx.fill();
            }

            if (this.#brushSize > 0) {
              this.#ctx.beginPath();
              this.#ctx.arc(this.#pageXY.x - (this.#canvasBounds.left / this.#scaleX), this.#pageXY.y - (this.#canvasBounds.top / this.#scaleY), this.#brushSize, 0, 2 * Math.PI, false);
              this.#ctx.fillStyle = this.#colorPickerFill.value;
              this.#ctx.fill();
            }

            this.#gCode.push(`${this.#strokeSize > 0 ? `C1 ${this.#pageXY.x - (this.#canvasBounds.left / this.#scaleX)} ${this.#pageXY.y - (this.#canvasBounds.top / this.#scaleY)} ${this.#brushSize + this.#strokeSize} 0 ${2 * Math.PI} false ${this.#colorPickerStroke.value}${this.#strokeSize > 0 && this.#brushSize > 0 ? ' transparent' : ''}\n`:''}${this.#brushSize > 0 ? `C2 ${this.#pageXY.x - (this.#canvasBounds.left / this.#scaleX)} ${this.#pageXY.y - (this.#canvasBounds.top / this.#scaleY)} ${this.#brushSize} 0 ${2 * Math.PI} false ${this.#colorPickerFill.value}\n` : ''}`);
          } else {
            if (this.#strokeSize > 0) {
              this.#ctx.lineWidth = this.#brushSize + this.#strokeSize;
              this.#ctx.lineCap = 'round';
              this.#ctx.lineTo(this.#pageXY.x - (this.#canvasBounds.left / this.#scaleX), this.#pageXY.y - (this.#canvasBounds.top / this.#scaleY));
              this.#ctx.strokeStyle = this.#colorPickerStroke.value;
              this.#ctx.stroke();
              if (this.#brushSize <= 0) {
                this.#ctx.beginPath();
              }
              this.#ctx.moveTo(this.#pageXY.x - (this.#canvasBounds.left / this.#scaleX), this.#pageXY.y - (this.#canvasBounds.top / this.#scaleY));
            }

            if (this.#brushSize > 0) {
              this.#ctx.lineWidth = this.#brushSize;
              this.#ctx.lineCap = 'round';
              this.#ctx.lineTo(this.#pageXY.x - (this.#canvasBounds.left / this.#scaleX), this.#pageXY.y - (this.#canvasBounds.top / this.#scaleY));
              this.#ctx.strokeStyle = this.#colorPickerFill.value;
              this.#ctx.stroke();
              this.#ctx.beginPath();
              this.#ctx.closePath();

              this.#ctx.moveTo(this.#pageXY.x - (this.#canvasBounds.left / this.#scaleX), this.#pageXY.y - (this.#canvasBounds.top / this.#scaleY));

            }

            // this.#gCode.push(`${this.#strokeSize > 0 ? `C1 ${this.#pageXY.x - (this.#canvasBounds.left / this.#scaleX)} ${this.#pageXY.y - (this.#canvasBounds.top / this.#scaleY)} ${this.#brushSize + this.#strokeSize} 0 ${2 * Math.PI} false ${this.#colorPickerStroke.value}${this.#strokeSize > 0 && this.#brushSize > 0 ? ' transparent' : ''}\n`:''}${this.#brushSize > 0 ? `C2 ${this.#pageXY.x - (this.#canvasBounds.left / this.#scaleX)} ${this.#pageXY.y - (this.#canvasBounds.top / this.#scaleY)} ${this.#brushSize} 0 ${2 * Math.PI} false ${this.#colorPickerFill.value}\n` : ''}`);
          }

          // if (this.#command !== '') {
          //   eval(this.#command);
          //   this.#drawCommands.push(this.#command);
          // }
        }
      }

      this.#canvas.addEventListener('mousedown', (e) => {
        if (this.#brushType === 'line') {
          this.#ctx.beginPath();
        }
        this.#brushInit(e);
        this.#brushMove(e);
      });

      document.addEventListener('mousedown', (e) => {
        if (this.#brushType === 'line') {
          this.#ctx.beginPath();
        }

        this.#canDraw = true;
      });

      this.#canvas.addEventListener('touchstart', (e) => {
        if (this.#brushType === 'line') {
          this.#ctx.beginPath();
        }
        this.#brushInit(e);
        this.#brushMove(e);
      }, {
        passive: false
      });

      document.addEventListener('touchstart', (e) => {
        if (this.#brushType === 'line') {
          this.#ctx.beginPath();
        }

        this.#canDraw = true;
      }, {
        passive: false
      });



      this.#canvas.addEventListener('mousemove', (e) => {
        this.#brushMove(e);
      });

      this.#canvas.addEventListener('touchmove', (e) => {
        this.#brushMove(e);
      }, {
        passive: false
      });

      document.addEventListener('mousemove', (e) => {
        if (e.target === this.#canvas) {
          this.#outofCanvas = false;
        } else {
          if (!this.#outofCanvas && this.#canDraw) {
            this.#ctx.beginPath();
          }
          this.#outofCanvas = true;
        }
      })

      document.addEventListener('touchmove', (e) => {
        if (e.target === this.#canvas) {
          this.#outofCanvas = false;
        } else {
          if (!this.#outofCanvas && this.#canDraw) {
            this.#ctx.beginPath();
          }
          this.#outofCanvas = true;
        }
      }, {
        passive: false
      })


      document.addEventListener('mouseup', () => {
        this.#canDraw = false;
      });

      document.addEventListener('touchend', () => {
        this.#canDraw = false;
      }, {
        passive: false
      });

    }
  }
  customElements.define(drawingAppElName, DrawingApp);
}









if (typeof colorPickerCss === 'undefined') {
  const colorPickerCss = document.createElement('style');
  colorPickerCss.textContent = `
    range-slider .draggable-controller{
      display: inline-block;
      width: 18px;
      height: 18px;
      position: absolute;
      top: -9px;
      left: -9px;
      border-radius: 50%;
      transition: none;
      box-sizing: border-box;
      border: 1px solid #000;
      background: #ffd86f;
    }

    range-slider .draggable-controller.transition{
      transition: 0.3s;
    }

    range-slider{
      position: relative;
      height: 9px;
      border-radius: 5px;
      width: 100%;
      background: linear-gradient(40deg,#ffd86f,#fc6262);
      border: none;
    }

    color-picker{
      display: inline-block;
      width: fit-content;
      position: relative;
    }
    color-picker .cp-init-button{
      display: inline-block;
      min-width: 30px;
      min-height: 30px;
      width: 10vw;
      height: 10vw;
      max-width: 48px;
      max-height: 48px;
      border-radius: 3px;
      overflow: hidden;
      appearance: button;
      -moz-appearance: button;
      -webkit-appearance: button;
      cursor: pointer;
      outline: none;
      border: none;
      box-shadow: 0 0 0 1px transparent, 0 0 0 3px transparent;
      transition: 0.3s, background 0s;
      position: relative;
    }

    color-picker .cp-footer{
      padding: 10px;
      padding-top: 0;
      display: flex;
      justify-content: flex-end;
      background: #fff;
    }

    color-picker .cp-select-color-bttn{
      appearance: button;
      -moz-appearance: button;
      -webkit-appearance: button;
      cursor: pointer;
      outline: none;
      border: none;
      background: #4285f4;
      color: #fff;
      box-shadow: 0 0 0 1px transparent, 0 0 0 3px transparent;
      transition: 0.3s, background 0s, color 0s;
      position: relative;
      border-radius: 3px;
      padding: 5px;
    }

    color-picker .cp-init-button:active, color-picker .cp-init-button:focus{
      box-shadow: 0 0 0 1px #fff, 0 0 0 3px #000;
    }

    color-picker .cp-select-color-bttn:active, color-picker .cp-select-color-bttn:focus{
      box-shadow: 0 0 0 1px #fff, 0 0 0 3px #4285f4;
    }

    color-picker .cp-app{
      width: 300px;
      height: fit-content;
      box-shadow: 1px 1px 5px #ccc;
      border-radius: 3px;
      margin-top: 7px;
      transition: opacity 0.3s, visibility 0.3s;
      position: absolute;
      top: 100%;
      left: 0;
      visibility: hidden;
      opacity: 0;
      z-index: 100000;
    }

    color-picker .cp-app.cp-app-show{
      visibility: visible;
      opacity: 1;
    }

    color-picker .cp-color-palette{
      width: 100%;
      height: 150px;
      position: relative;
      border: none;
    }

    color-picker .draggable-controller{
      display: inline-block;
      width: 18px;
      height: 18px;
      position: absolute;
      border: 2px solid #fff;
      border-radius: 50%;
      background: #000;
      transition: none;
      box-sizing: border-box;
    }

    color-picker .draggable-controller:active{
      box-shadow: 0 0 0 1px #000;
    }

    color-picker .cp-colors, color-picker .cp-opacity{
      position: relative;
      height: 9px;
      background: linear-gradient(90deg, rgb(255, 0, 0), rgb(255, 255, 0), rgb(0, 255, 0), rgb(0, 255, 255), rgb(0, 0, 255), rgb(255, 0, 255), rgb(255, 0, 0));
      border-radius: 5px;
      width: 100%;
      border: none;
    }

    color-picker .cp-opacity{
      background: linear-gradient(90deg,transparent,#000),url('data:image/svg+xml;utf8, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>');
      background-size: 100%, 5px;
    }

    color-picker .cp-body{
      padding: 10px;
      background: #fff;
    }
    color-picker .cp-body-head{
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-direction: row;
    }
    color-picker .cp-active-color{
      border-radius: 50%;
      width: 30px;
      height: 30px;
      position: relative;
      overflow: hidden;
    }

    color-picker .cp-active-color::before, color-picker .cp-init-button::before, color-picker .cp-color-palette::before{
      content: '';
      width: 100%;
      height: 100%;
      position: absolute;
      background-image: url('data:image/svg+xml;utf8, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>');
      z-index: -10;
      background-size: 7px;
      top: 0;
      left: 0;
    }

    color-picker .cp-init-button::before{
      background-size: 9px;
    }

    color-picker .cp-color-palette::before{
      background-size: 10px;
    }

    color-picker .cp-sliders{
      flex: 1;
      height: 30px;
      display: flex;
      justify-content: space-between;
      align-items: space-between;
      flex-direction: column;
      position: relative;
      margin-left: 20px;
    }

    range-slider{
      display: block;
    }
  `;

  document.head.appendChild(colorPickerCss);
}

if (typeof ColorPicker === 'undefined') {
  let colorPickerInitCounter = 0;
  const cpColorPickedEvent = new CustomEvent('select', {
    bubbles: true
  });

  const cpColorPickingEvent = new CustomEvent('selecting', {
    bubbles: true
  });

  class ColorPicker extends HTMLElement {
    #R = 0;
    #G = 0;
    #B = 0;
    #A = 1;
    #gradient;
    #cpPalletteSlider;
    #colorsSlider;
    #opacitySlider;
    #canvasPallete;
    #setCanvas;
    #canvasPalleteContext;
    #canvasPalleteGrdToTop;
    #canvasPalleteGrdToLeft;
    #i;
    #colorIndexes;
    #gradColor;
    #color1;
    #color2;
    #color1_x;
    #color2_x;
    #slider_x;
    #ratio;
    #rgbColor = [0, 0, 0];
    #getPixelColorFromCanvas;
    #imageData;
    #selectColorBttn;
    #activeColor;
    #cpId;

    constructor() {
      super();
      this.#R = 255;
      this.#G = 0;
      this.#B = 0;
      this.#A = 1;
      this.value = 'rgba(0, 0, 0, 1)';
      this.futureValue = 'rgba(0, 0, 0, 1)';
      this.#gradient = [
        [0, [255, 0, 0]],
        [100 / 6, [255, 255, 0]],
        [100 / 6 * 2, [0, 255, 0]],
        [100 / 6 * 3, [0, 255, 255]],
        [100 / 6 * 4, [0, 0, 255]],
        [100 / 6 * 5, [255, 0, 255]],
        [100 / 6 * 6, [255, 0, 0]],
      ];
    }

    connectedCallback() {
      colorPickerInitCounter++;
      this.#cpId = colorPickerInitCounter;

      const colorPickerUniqueStyle = document.createElement('style');
      colorPickerUniqueStyle.textContent = `
      :root{
        --cp-current-color-${this.#cpId}: rgba(0, 0, 0, 1);
        --cp-color-transparency-${this.#cpId}: 1;
        --cp-color-range-slider-${this.#cpId}: 255, 0, 0;
        --cp-active-color-${this.#cpId}: rgba(0, 0, 0, 1);
      }
      color-picker.cp-${this.#cpId} .cp-init-button{
        background: linear-gradient(to top, var(--cp-current-color-${this.#cpId}), var(--cp-current-color-${this.#cpId})), url('data:image/svg+xml;utf8, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>');
        background-size: 100%, 5px;
      }
      color-picker.cp-${this.#cpId} .cp-color-palette{
        background: linear-gradient(to top, rgba(0, 0, 0, var(--cp-color-transparency-${this.#cpId})), transparent), linear-gradient(to left, rgba(var(--cp-color-range-slider-${this.#cpId}), var(--cp-color-transparency-${this.#cpId})), rgba(255, 255, 255, var(--cp-color-transparency-${this.#cpId})));
      }
      color-picker.cp-${this.#cpId} .cp-color-palette .draggable-controller{
        background: var(--cp-active-color-${this.#cpId});
      }
      color-picker.cp-${this.#cpId} .cp-colors .draggable-controller{
        background: rgb(var(--cp-color-range-slider-${this.#cpId}));
      }
      color-picker.cp-${this.#cpId} .cp-active-color{
        background: linear-gradient(to top, var(--cp-active-color-${this.#cpId}), var(--cp-active-color-${this.#cpId})), url('data:image/svg+xml;utf8, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path fill="white" d="M1,0H2V1H1V0ZM0,1H1V2H0V1Z"/><path fill="gray" d="M0,0H1V1H0V0ZM1,1H2V2H1V1Z"/></svg>');
        background-size: 100%, 5px;
      }
      `;
      document.head.appendChild(colorPickerUniqueStyle);

      this.classList.add(`cp-${this.#cpId}`);
      this.innerHTML = `
        <button type="button" class="cp-init-button"></button>
        <div class="cp-app">
          <range-slider class="cp-color-palette"></range-slider>

          <div class="cp-body">
            <div class="cp-body-head">
              <div class="cp-active-color"></div>
              <div class="cp-sliders">
                <range-slider class="cp-colors horizontal"></range-slider>
                <range-slider class="cp-opacity horizontal"></range-slider>
              </div>
            </div>
          </div>
          <div class="cp-footer"><button type="button" is="ripple-button" class="cp-select-color-bttn">Select</button></div>
        </div>
      `;

      this.#cpPalletteSlider = this.querySelector('range-slider.cp-color-palette');
      this.#colorsSlider = this.querySelector('range-slider.cp-colors');
      this.#opacitySlider = this.querySelector('range-slider.cp-opacity');
      this.#selectColorBttn = this.querySelector('.cp-select-color-bttn');
      this.#canvasPallete = document.createElement('canvas');
      this.#canvasPalleteContext = this.#canvasPallete.getContext('2d');

      this.#cpPalletteSlider.value = {
        x: 0,
        y: 100
      };

      this.#colorsSlider.value = {
        x: 0,
        y: null
      };

      this.#opacitySlider.value = {
        x: 100,
        y: null
      };

      this.#setCanvas = () => {
        document.documentElement.style.setProperty(`--cp-color-transparency-${this.#cpId}`, this.#A);

        this.#canvasPallete.width = this.#cpPalletteSlider.offsetWidth;
        this.#canvasPallete.height = this.#cpPalletteSlider.offsetHeight;
        this.#canvasPalleteContext.clearRect(0, 0, this.#canvasPallete.width, this.#canvasPallete.height);

        this.#canvasPalleteGrdToLeft = this.#canvasPalleteContext.createLinearGradient(this.#canvasPallete.width, this.#canvasPallete.height, 0, 0);
        this.#canvasPalleteGrdToLeft.addColorStop(0, `rgba(${this.#R}, ${this.#G}, ${this.#B}, ${this.#A})`);
        this.#canvasPalleteGrdToLeft.addColorStop(1, `rgba(255, 255, 255, ${this.#A})`);
        this.#canvasPalleteContext.fillStyle = this.#canvasPalleteGrdToLeft;
        this.#canvasPalleteContext.fillRect(0, 0, this.#canvasPallete.width, this.#canvasPallete.height);

        this.#canvasPalleteGrdToTop = this.#canvasPalleteContext.createLinearGradient(0, this.#canvasPallete.height, 0, 0);
        this.#canvasPalleteGrdToTop.addColorStop(0, `rgba(0, 0, 0, ${this.#A})`);
        this.#canvasPalleteGrdToTop.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.#canvasPalleteContext.fillStyle = this.#canvasPalleteGrdToTop;
        this.#canvasPalleteContext.fillRect(0, 0, this.#canvasPallete.width, this.#canvasPallete.height);
      }

      this.#setCanvas();


      this.#getPixelColorFromCanvas = (_cp_coords = {
        x: 0,
        y: 0
      }) => {
        this.#imageData = Array.from(this.#canvasPalleteContext.getImageData(this.#canvasPallete.width * _cp_coords.x / 100 - 0.5, this.#canvasPallete.height * _cp_coords.y / 100 - 0.5, 1, 1).data);
        this.#imageData[3] = this.#A;
        return this.#imageData;
      }

      this.querySelector('.cp-init-button').addEventListener('click', () => {
        this.querySelector('.cp-app').classList.toggle('cp-app-show');
      });


      this.#cpPalletteSlider.addEventListener('input', () => {
        this.#setCanvas();
        document.documentElement.style.setProperty(`--cp-active-color-${this.#cpId}`, `rgba(${this.#getPixelColorFromCanvas({
          x: this.#cpPalletteSlider.value.x,
          y: this.#cpPalletteSlider.value.y
        }).join()})`);
        this.futureValue = getComputedStyle(document.documentElement).getPropertyValue(`--cp-active-color-${this.#cpId}`);
        this.dispatchEvent(cpColorPickingEvent);
      });

      this.#colorsSlider.addEventListener('input', () => {
        this.#i = 0;
        this.#colorIndexes = [0, 0];
        for (this.#gradColor of this.#gradient) {
          if (this.#colorsSlider.value.x <= this.#gradColor[0]) {
            this.#colorIndexes = [this.#i - 1, this.#i];
            break;
          }

          this.#i++;
        }
        this.#colorIndexes[0] = this.#colorIndexes[0] === -1 ? 0 : this.#colorIndexes[0];
        this.#color1 = this.#gradient[this.#colorIndexes[0]][1];
        this.#color2 = this.#gradient[this.#colorIndexes[1]][1];

        this.#color1_x = this.#colorsSlider.offsetWidth * (this.#gradient[this.#colorIndexes[0]][0] / 100);
        this.#color2_x = this.#colorsSlider.offsetWidth * (this.#gradient[this.#colorIndexes[1]][0] / 100) - this.#color1_x;
        this.#slider_x = this.#colorsSlider.offsetWidth * (this.#colorsSlider.value.x / 100) - this.#color1_x;
        this.#ratio = this.#slider_x / this.#color2_x;
        if (this.#color1 === this.#color2) {
          this.#ratio = 1;
        }
        this.#rgbColor = pickHex(this.#color2, this.#color1, this.#ratio);
        this.#R = this.#rgbColor[0];
        this.#G = this.#rgbColor[1];
        this.#B = this.#rgbColor[2];
        document.documentElement.style.setProperty(`--cp-color-range-slider-${this.#cpId}`, this.#rgbColor.join());

        this.#setCanvas();
        document.documentElement.style.setProperty(`--cp-active-color-${this.#cpId}`, `rgba(${this.#getPixelColorFromCanvas({
          x: this.#cpPalletteSlider.value.x,
          y: this.#cpPalletteSlider.value.y
        }).join()})`);
        this.futureValue = getComputedStyle(document.documentElement).getPropertyValue(`--cp-active-color-${this.#cpId}`);
        this.dispatchEvent(cpColorPickingEvent);
      });

      this.#opacitySlider.addEventListener('input', () => {
        this.#A = this.#opacitySlider.value.x / 100;
        this.#opacitySlider.querySelector('.draggable-controller').style.backgroundColor = `rgba(0, 0, 0, ${this.#A})`;
        this.#setCanvas();
        document.documentElement.style.setProperty(`--cp-active-color-${this.#cpId}`, `rgba(${this.#getPixelColorFromCanvas({
          x: this.#cpPalletteSlider.value.x,
          y: this.#cpPalletteSlider.value.y
        }).join()})`);
        this.futureValue = getComputedStyle(document.documentElement).getPropertyValue(`--cp-active-color-${this.#cpId}`);
        this.dispatchEvent(cpColorPickingEvent);
      });

      this.#selectColorBttn.addEventListener('click', () => {
        this.#activeColor = getComputedStyle(document.documentElement).getPropertyValue(`--cp-active-color-${this.#cpId}`);
        this.value = this.#activeColor;
        document.documentElement.style.setProperty(`--cp-current-color-${this.#cpId}`, this.#activeColor);
        this.querySelector('.cp-app').classList.remove('cp-app-show');
        this.dispatchEvent(cpColorPickedEvent);
      });

      document.addEventListener('mousedown', (e) => {
        if (e.target.closest('.cp-app') !== this.querySelector('.cp-app') && e.target !== this.querySelector('.cp-init-button')) {
          this.querySelector('.cp-app').classList.remove('cp-app-show');
        }
      });
    }
  }
  customElements.define('color-picker', ColorPicker);

  function pickHex(color1, color2, weight) {
    var w1 = weight;
    var w2 = 1 - w1;
    var rgb = [Math.round(color1[0] * w1 + color2[0] * w2),
      Math.round(color1[1] * w1 + color2[1] * w2),
      Math.round(color1[2] * w1 + color2[2] * w2)
    ];
    return rgb;
  }
}

if (typeof RangeSlider === 'undefined') {
  let sliderPercents = {
    x: null,
    y: null
  };
  let dragElementEvent = new CustomEvent('input', {
    bubbles: true,
    detail: sliderPercents
  });

  class RangeSlider extends HTMLElement {
    #shiftX;
    #shiftY;
    #X;
    #Y;
    #percentX;
    #percentY;
    #hasBeenDragged;
    #canDrag;
    #dragger;
    #dragInit;
    #elementBounds;
    #clientXY;
    #dragDestroy;
    #dragging;
    #controllerForBounds;
    #pageXY;
    #privateValue;
    constructor() {
      super();
    }

    get value() {
      return this.#privateValue;
    }

    set value(val) {
      this.#privateValue = val;

      this.#dragger = this.querySelector('.draggable-controller');
      this.#dragger.classList.add('transition');
      this.#elementBounds = this.#dragger.getBoundingClientRect();
      this.#dragger.style.left = `calc(${this.#privateValue.x}% - ${this.#elementBounds.width / 2}px)`;
      this.#dragger.style.top = `calc(${this.#privateValue.y}% - ${this.#elementBounds.height / 2}px)`;
      this.#dragger.style.right = 'auto';
      this.#dragger.style.bottom = 'auto';
    }

    connectedCallback() {
      this.innerHTML = '<div class="draggable-controller"></div>';
      this.#shiftX;
      this.#shiftY;
      this.#X;
      this.#Y;
      this.#percentX = null;
      this.#percentY = null;
      this.#hasBeenDragged = false;
      this.#canDrag = false;
      this.#privateValue = {
        x: null,
        y: null
      };

      this.#dragger = this.querySelector('.draggable-controller');

      if (this.#dragger) {
        this.#dragInit = (e) => {
          if (e.target.closest(this.tagName)) {
            this.#elementBounds = this.#dragger.getBoundingClientRect();
            this.#clientXY = {};

            if (e.touches) {
              this.#clientXY.x = e.touches[0].clientX;
              this.#clientXY.y = e.touches[0].clientY;
            } else {
              this.#clientXY.x = e.clientX;
              this.#clientXY.y = e.clientY;
            }

            this.#shiftX = this.#clientXY.x - this.#elementBounds.left;
            this.#shiftY = this.#clientXY.y - this.#elementBounds.top;

            this.#canDrag = true;
          } else {
            this.#canDrag = false;
          }
        }

        this.#dragDestroy = () => {
          this.#dragger.classList.add('transition');
          this.#canDrag = false;
          if (this.#hasBeenDragged) {
            this.#hasBeenDragged = false;
          }
        }

        this.#dragger.addEventListener('mousedown', (e) => {
          this.#dragger.classList.add('transition');
          this.#dragInit(e);
        });

        this.#dragger.addEventListener('touchstart', (e) => {
          this.#dragger.classList.add('transition');
          this.#dragInit(e);
        }, {
          passive: true
        });

        document.addEventListener('mouseup', (e) => {
          this.#dragDestroy();
        });

        document.addEventListener('touchend', (e) => {
          this.#dragDestroy();
        }, {
          passive: true
        });

        this.#dragging = (e) => {
          if (this.#canDrag) {
            e.preventDefault();
            this.#hasBeenDragged = true;
            this.#elementBounds = this.#dragger.getBoundingClientRect();
            this.#controllerForBounds = this.getBoundingClientRect();
            this.#pageXY = {};
            if (e.touches) {
              this.#pageXY.x = e.touches[0].clientX;
              this.#pageXY.y = e.touches[0].clientY;
            } else {
              this.#pageXY.x = e.clientX;
              this.#pageXY.y = e.clientY;
            }

            if (this.#dragger.position === 'absolute') {
              const xCoord = this.#pageXY.x - (this.#elementBounds.width / 2) - this.#controllerForBounds.x;
              const yCoord = this.#pageXY.y - (this.#elementBounds.width / 2) - this.#controllerForBounds.y;
              if (!this.classList.contains('vertical')) {
                if (xCoord >= (-1 * (this.#elementBounds.width / 2)) && xCoord <= this.#controllerForBounds.width - (this.#elementBounds.width / 2)) {

                  this.#X = xCoord;

                } else if (xCoord < (-1 * (this.#elementBounds.width / 2))) {
                  this.#X = (-1 * (this.#elementBounds.width / 2));
                } else if (xCoord > this.#controllerForBounds.width - (this.#elementBounds.width / 2)) {
                  this.#X = this.#controllerForBounds.width - (this.#elementBounds.width / 2);
                }

                this.#percentX = this.#X / (this.#controllerForBounds.width - (this.#elementBounds.width / 2)) * 100;
                if (this.#percentX < 0) {
                  this.#percentX = 0;
                } else if (this.#percentX > 100) {
                  this.#percentX = 100;
                }
              }
              if (!this.classList.contains('horizontal')) {
                if (yCoord >= (-1 * (this.#elementBounds.width / 2)) && yCoord <= this.#controllerForBounds.height - (this.#elementBounds.width / 2)) {
                  this.#Y = yCoord;
                } else if (yCoord < (-1 * (this.#elementBounds.height / 2))) {
                  this.#Y = (-1 * (this.#elementBounds.height / 2));
                } else if (yCoord > this.#controllerForBounds.height - (this.#elementBounds.height / 2)) {
                  this.#Y = this.#controllerForBounds.height - (this.#elementBounds.height / 2);
                }

                this.#percentY = this.#Y / (this.#controllerForBounds.height - (this.#elementBounds.height / 2)) * 100;
                if (this.#percentY < 0) {
                  this.#percentY = 0;
                } else if (this.#percentY > 100) {
                  this.#percentY = 100;
                }
              }
            }

            this.#dragger.style.left = `calc(${this.#percentX}% - ${this.#elementBounds.width / 2}px)`;
            this.#dragger.style.top = `calc(${this.#percentY}% - ${this.#elementBounds.height / 2}px)`;
            this.#dragger.style.right = 'auto';
            this.#dragger.style.bottom = 'auto';
            sliderPercents.x = this.#percentX;
            sliderPercents.y = this.#percentY;
            this.#privateValue.x = this.#percentX;
            this.#privateValue.y = this.#percentY;
            this.dispatchEvent(dragElementEvent);
          }
        }

        this.addEventListener('mousedown', (e) => {
          this.#dragger.classList.add('transition');
          this.#canDrag = true;
          this.#dragging(e);
        });

        this.addEventListener('touchstart', (e) => {
          this.#dragger.classList.add('transition');
          this.#canDrag = true;
          this.#dragging(e);
        }, {
          passive: false
        });

        document.addEventListener('mousemove', (e) => {
          this.#dragger.classList.remove('transition');
          this.#dragging(e);
        });

        document.addEventListener('touchmove', (e) => {
          this.#dragger.classList.remove('transition');
          this.#dragging(e);
        }, {
          passive: false
        });
      }
      if (window.getComputedStyle(this.#dragger, null).getPropertyValue('position') === 'static' || !window.getComputedStyle(this.#dragger, null).getPropertyValue('position')) {
        this.#dragger.style.position = 'absolute';
      }
      this.#dragger.position = window.getComputedStyle(this.#dragger, null).getPropertyValue('position');
      if (this.classList.contains('horizontal')) {
        this.#dragger.style.transform = 'translateY(-50%)';
        this.#dragger.style.top = '50%';
      } else if (this.classList.contains('vertical')) {
        this.#dragger.style.transform = 'translateX(-50%)';
        this.#dragger.style.left = '50%';
      }

    }
  }

  customElements.define('range-slider', RangeSlider);
}