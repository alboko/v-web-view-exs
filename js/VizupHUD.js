/**
 *		VizupView HeadUp Display, THREE.Object3D
 *
 *		supports Wireframe and FlatShading for ClassicGeometry, and colors
 */

// Vizup namespace - move to the Viewer!!!
var vizup = vizup || {};

// constructor
vizup.HUD = function() {

    this.miCanvas = document.createElement('canvas');   // model info cavas
    this.miCanvas.width = vizup.HUD.MI_SIZE.width;
    this.miCanvas.height = vizup.HUD.MI_SIZE.height;

    this.miContext = this.miCanvas.getContext('2d');
    this.miContext.font = "Bold " + vizup.HUD.MI_FONT;
    this.miContext.fillStyle = vizup.HUD.MI_COLOR;
    this.miContext.textAlign = 'center';

    var textY = 20;
    this.miContext.fillText("Vizup", vizup.HUD.MI_SIZE.width/2, textY);

    textY += 20;
    this.miContext.font = vizup.HUD.MI_FONT;
    this.miContext.fillText("The Ultimate 3D Optimization", vizup.HUD.MI_SIZE.width/2, textY);

    this.miTexture = new THREE.Texture(this.miCanvas);
    this.miTexture.needsUpdate = true;   // needs to be updated after each text update ;o)

    var scope = this;
    var spriteMaterial = new THREE.SpriteMaterial({
            map: scope.miTexture,
            useScreenCoordinates: true,
            alignment: THREE.SpriteAlignment.topLeft
        });
    this.miSprite = new THREE.Sprite(spriteMaterial);

    // this.miSprite.position.set(vizup.HUD.MI_SIZE.width/2, 0, 0);
    this.miSprite.scale.set( vizup.HUD.MI_SIZE.width, vizup.HUD.MI_SIZE.height, 1.0 )
};

// turn HUD on or off
vizup.HUD.prototype.toggle = function() {

    this.miSprite.visible = !this.miSprite.visible;
};

vizup.HUD.prototype.updateLODinfo = function(info) {

    this.miContext.clearRect( 0 , 0 , this.miCanvas.width , this.miCanvas.height );

    this.miContext.font = "Bold " + vizup.HUD.MI_FONT;
    this.miContext.fillStyle = vizup.HUD.MI_COLOR;
    this.miContext.textAlign = 'left';

    var textX = 5, textY = 20;
    this.miContext.fillText("(c) Vizup - Ultimate 3D Optimization", textX, textY);

    this.miContext.font = vizup.HUD.MI_FONT;
    textY += 20;
    for (var prop in info) {
        var value = info[prop];
        if (value != undefined) {
            this.miContext.fillText(prop + ': ' + value, textX, textY);
            textY += 16;
            log.debug('printing: <' + prop + ': ' + value + '> at: ' + textX + ':' + textY);
        }
    }

    this.miTexture.needsUpdate = true;   // needs to be updated after each text update ;o)
};


vizup.HUD.onLODChange = function(LOD) {
    ;
};

vizup.HUD.MI_FONT = "14px Arial";
vizup.HUD.MI_COLOR = "rgba( 85,85,85,0.95 )";

vizup.HUD.MI_SIZE = { width: 250, height: 150 };
