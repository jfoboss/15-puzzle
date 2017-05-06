const getImage = ($q) => {
  const deferred = $q.defer();
  let img = new Image();
  img.onload = function () {
    deferred.resolve(this);
  };
  img.src = '/images/nature.jpg';
  return deferred.promise;
};

export default class scramble {
  
  static get $inject() {
    return ['$q', 'storage'];
  }
  
  constructor($q, storage) {
    this.$q = $q;
    this.$storage = storage.getStorage();
    this.imagePromiseCache = null;
    this.tiles = [];
    this.maxFontSize = 72;
  }
  
  imagePromise() {
    if (!this.imagePromiseCache) {
      this.imagePromiseCache = getImage(this.$q);
    }
    return this.imagePromiseCache;
  }
  
  getTiles() {
    if (this.tiles.length) {
      return this.$q.when(this.tiles);
    } else {
      return this.generate(
        this.$storage.dimension,
        this.$storage.showNumber,
        this.$storage.highlightRightPlace
      ).then(() => {
        return this.tiles;
      });
    }
  }
  
  drawImagePart(ctx, img, i, j, tileSize, ratio, margin) {
    ctx.drawImage(img,
      i * tileSize * ratio,     // image-x
      j * tileSize * ratio,     // image-y
      tileSize * ratio,         // image-width
      tileSize * ratio,         // image-height
      i * tileSize + margin,    // canvas-x
      j * tileSize + margin,    // canvas-y
      tileSize - (margin * 2),  // canvas-width
      tileSize - (margin * 2),  // canvas-height
    );
  };
  
  drawHighlight(ctx, i, j, tileSize, margin) {
    ctx.strokeRect(
      i * tileSize + margin,    // canvas-x
      j * tileSize + margin,    // canvas-y
      tileSize - (margin * 2),  // canvas-width
      tileSize - (margin * 2)   // canvas-height
    );
  };
  
  drawNumber(ctx, fontSize, num, centerX, centerY) {
    const strokeStyle = ctx.strokeStyle;
    ctx.font = fontSize + 'px Arial';
    ctx.textAlign = 'center';
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    ctx.strokeText(num.toString(), centerX + 1, centerY + 1);
    ctx.lineWidth = 1;
    ctx.strokeStyle = strokeStyle;
    ctx.strokeText(num.toString(), centerX, centerY);
  }
  
  getTileAsCanvas(img, i, j, tileSize, ratio, margin) {
    let tileCanvas = document.createElement("canvas");
    let tileCtx = tileCanvas.getContext('2d');
    tileCanvas.width = tileSize;
    tileCanvas.height = tileSize;
    tileCtx.clearRect(0, 0, tileCanvas.width, tileCanvas.height);
    tileCtx.drawImage(img,
      i * tileSize * ratio,     // image-x
      j * tileSize * ratio,     // image-y
      tileSize * ratio,         // image-width
      tileSize * ratio,         // image-height
      margin,                   // canvas-x
      margin,                   // canvas-y
      tileSize - (margin * 2),  // canvas-width
      tileSize - (margin * 2),  // canvas-height
    );
    return tileCanvas;
  };
  
  getImageFromTile(tile) {
    if (tile.canvas) {
      const margin = 3;
      const w = tile.canvas.width;
      const h = tile.canvas.height;
      
      let canvas = document.createElement("canvas");
      let ctx = canvas.getContext('2d');
      
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tile.canvas, 0, 0, w, h, 0, 0, w, h);
      
      if (this.$storage.highlightRightPlace) {
        const equalX = tile.x === tile.position_x;
        const equalY = tile.y === tile.position_y;
        ctx.strokeStyle = (equalX && equalY) ? 'green' : 'red';
        ctx.strokeRect(margin, margin, w - (margin * 2), h - (margin * 2));
      } else {
        ctx.strokeStyle = 'black';
      }
      
      if (this.$storage.showNumber) {
        const fontSize = (this.maxFontSize / this.$storage.dimension) * 2;
        const centerX = (w / 2);
        const centerY = (h / 2) + (fontSize / 2);
        const num = ((tile.y * this.$storage.dimension) + tile.x) + 1;
        this.drawNumber(ctx, fontSize, num, centerX, centerY);
      }
      
      return canvas.toDataURL();
    } else {
      return null;
    }
  }
  
  generate(dimension = 4, showNumber = true, highlightRightPlace = true) {
    return this.imagePromise().then((img) => {
        this.tiles = [];
        
        const previewSize = 480;
        const margin = 3;
        const tileSize = Math.floor(previewSize / dimension);
        const ratio = img.width / previewSize;
        
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext('2d');
        
        canvas.width = previewSize;
        canvas.height = previewSize;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < dimension; i++) {
          for (let j = 0; j < dimension; j++) {
            if (i === dimension - 1 && j === dimension - 1) {
              this.tiles.push({x: i, y: j, canvas: null});
              continue;
            }
            this.tiles.push({x: i, y: j, canvas: this.getTileAsCanvas(img, i, j, tileSize, ratio, margin)});
            this.drawImagePart(ctx, img, i, j, tileSize, ratio, margin);
            if (highlightRightPlace) {
              ctx.strokeStyle = (Math.random() > 0.5) ? 'red' : 'green';
              this.drawHighlight(ctx, i, j, tileSize, margin);
            } else {
              ctx.strokeStyle = 'black';
            }
            if (showNumber) {
              const fontSize = (this.maxFontSize / dimension) * 2;
              const centerX = (i * tileSize) + (tileSize / 2);
              const centerY = (j * tileSize) + (tileSize / 2) + (fontSize / 2);
              const num = ((j * dimension) + i) + 1;
              this.drawNumber(ctx, fontSize, num, centerX, centerY);
            }
          }
        }
        
        return ctx;
      }
    );
  }
}