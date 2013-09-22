/**
 *		Multi-resolution LOD chain, extended from THREE.Object3D
 *
 *		2013-06-30  this version doesn't supports textures, Wireframe and FlatShading
 *
 *      @todo:
 *          - support for non-BufferGeometry (no geometry.attributes)
 */

// Vizup namespace - move to the Viewer!!!
var vizup = vizup || {};

// constructor
vizup.LODChain = function(name, location) {

	THREE.Object3D.call(this);

	this.location = location || '';
    this.modelName = name && name.length > 0 ? name : 'Vizup LOD sample';

    this.lods = [];
	this.currentLODIndex = -1;
    this.stillLoading = true;

    // each LOD has references for BufferGeometry and ClassicGeometry meshes
    // LOD.bufferMesh and LOD.classicMesh

    // shading and wireframe visualization modes
    // both require creating "Classic" geometry and thus -very performance inefficient
    this.shadingMode = 0;   // material type for bufferMesh (lambert or normals or etc)
    this.wireframeMode = 0;    // 0 - no, 1 with flat shading, 2 - no shading

    // normalization parameters, initiated from first LOD
    this.npScale = undefined;
    this.npCenter = undefined;
};

// set loading parameters
vizup.LODChain.useWorker = true;
vizup.LODChain.useBufferGeometry = true;

// set enheritance
vizup.LODChain.prototype = Object.create(THREE.Object3D.prototype);

vizup.LODChain.NAMETAG_LOD = "Vizup-LOD";   // 3D object name tag for Vizup LODs
vizup.LODChain.NAMETAG_BUFFER_MESH = "Vizup-Buffer-Mesh";   // mesh object name tag for BufferGeometry Mesh
vizup.LODChain.NAMETAG_CLASSIC_MESH = "Vizup-Classic-Mesh";   // mesh object name tag for ClassicGeometry Mesh
vizup.LODChain.NAMETAG_DEBUG = "Vizup-DEbug";   // debug object name tag for Debug Geometry

/**
 *      LOD-chain methods
 */

// load LOD chain
vizup.LODChain.prototype.loadChain = function(chain, stopIndex)
{
    this.lods = new Array(chain.length);

    if (stopIndex == undefined )
        this.stopIndex = chain.length - 1;
    else if (stopIndex < 0)
        this.stopIndex = chain.length + stopIndex;
    else
        this.stopIndex = stopIndex;

	for (var il=0; il<chain.length; il++)
    {
        var ratio = 1./(chain.length - il);

        var lodpath = this.location;
        if (chain[il] != '') lodpath += '-' + chain[il];
        lodpath += '.vzp';

        this.load(il, lodpath, ratio);
    }

    log.info('vizup.LODChain - LOD chain has been put in loading queue: ' + chain.length + ' stop index: ' + this.stopIndex);
};

// load a single LOD in a WebWorker
vizup.LODChain.prototype.load = function(index, lodName, ratio)
{
    var scope = this;

    var loader = new THREE.CTMLoader();
    loader.load(lodName, function(geometry) {

        if (vizup.LODChain.useBufferGeometry) {
            var position = geometry.attributes[ "position" ];
            if (position)
                log.info('loaded CTM geometry [' + index + '] for ' + lodName + ' ratio: ' + ratio + ' vertices: ' + position.numItems/3);
        }

        geometry.name = lodName;

        var LOD = scope.createLOD(geometry);
        LOD.ratio = ratio || 1.0;
        LOD.url = lodName;

        // store LODs in top object
        scope.add(LOD);
        scope.lods[index] = LOD;

        if (index > scope.currentLODIndex && index <= scope.stopIndex) {  // make next, but last, LOD visible immediately
            scope.activateLOD(index);
        }

        // last one - finish up
        if (index == scope.lods.length-1)
        {
            log.info('vizup.LODChain: last LOD has been loaded: ' + index)
            scope.stillLoading = false;

            // create bbox, axis, etc for visual debug
            var dbgo = vizup.LODChain.createDebugGeometry(scope.lods[0].bufferMesh);
            vizup.LODChain.normalizeMesh(dbgo, scope.npScale, scope.npCenter);
            scope.add(dbgo);
        }

    }, { useWorker: vizup.LODChain.useWorker, useBuffers: vizup.LODChain.useBufferGeometry } );
};

// create a 3D object for a single LOD with buffer mesh
vizup.LODChain.prototype.createLOD = function(geometry)
{
    var LOD = new THREE.Object3D();
    LOD.name = vizup.LODChain.NAMETAG_LOD;

	// create shading mesh with color when available
    var material = (geometry.attributes && geometry.attributes["color"]) ? vizup.LODChain.MATERIAL_COLORS : vizup.LODChain.MATERIAL_SHADING;
	var bufferMesh = new THREE.Mesh(geometry, material);

	bufferMesh.name = vizup.LODChain.NAMETAG_BUFFER_MESH;
	bufferMesh.visible = false;
	log.debug('vizup.LODChain: created shading mesh: ' + bufferMesh.id + ' for ' + geometry.name);

	// normalize both with the same scale and center
    if (!this.npScale) {
        this.npScale = vizup.LODChain.normalizationScale(geometry);
        log.debug('vizup.LODChain: computed scale: ' + this.npScale);
    }
    if (!this.npCenter) {
        this.npCenter = vizup.LODChain.normalizationCenter(geometry);
        log.debug('vizup.LODChain: computed center: ' + this.npCenter);
    }

	log.debug('VizupLOD: normalized meshes with scale: ' + this.npScale +
              ' center[' + this.npCenter.x + ',' + this.npCenter.y + ',' + this.npCenter.z);
	vizup.LODChain.normalizeMesh(LOD, this.npScale, this.npCenter);

    // @TEMP : correction
    // bufferMesh.rotation.x += Math.PI;


	// store in the top object
    LOD.add(bufferMesh);
    LOD.bufferMesh = bufferMesh;

    /* @TODO: for debug only

    var ah = new THREE.AxisHelper(this.npScale/2.);
    ah.material.linewidth = 2;
    LOD.add(ah);

    var bh = new THREE.BoxHelper(1.);
    bh.material.color = new THREE.Color( 0xff0000 );
    bh.material.linewidth = 2;
    bh.update(bufferMesh);
    vizup.LODChain.normalizeMesh(LOD, this.npScale, this.npCenter);
    LOD.add(bh);
    */

    return LOD;
};

vizup.LODChain.prototype.activateLOD = function(index) {

    if (index < 0 || index > this.lods-1 ) {
        log.error('LODChain.prototype.activateLOD: index out of bound: ' + index);
        return false;
    }

	// turn off the current LOD completely
    log.debug('vizup.LODChain: de-activating: ' + this.currentLODIndex + ' activating: ' + index);
    if (this.currentLODIndex >= 0) {
        var currentLOD = this.lods[this.currentLODIndex];
        vizup.LODChain.setLODVisibility(currentLOD, false);
    }

	// turn on the next one and restore wireframe
	this.currentLODIndex = index;
	var currentLOD = this.lods[this.currentLODIndex];
	vizup.LODChain.setLODVisibility(currentLOD, true);
    vizup.LODChain.setLODShadingMode(currentLOD, this.shadingMode);

    // set the vuzualization modes for complementaty classic geometry
    /*
    if (currentLOD.classicMesh) {
        // vizup.LODChain.setLODShadingMode(currentLOD, this.shadingMode);
        // vizup.LODChain.setWireframeMode(currentLOD, wmode);
    }
    */

	return true;
}

vizup.LODChain.prototype.activateNextLOD = function(direction) {

	if (direction > 0 && this.currentLODIndex < this.lods.length-1)
		direction = 1;
	else if (direction < 0 && this.currentLODIndex > 0)
		direction = -1;
	else
		return false;

    return this.activateLOD(this.currentLODIndex+direction);
}

vizup.LODChain.prototype.setShadingMode = function(mode) {

    this.shadingMode = mode % vizup.LODChain.ShadingMaterials.length;

	if (this.currentLODIndex >= 0) {
		vizup.LODChain.setLODShadingMode(this.lods[this.currentLODIndex], this.shadingMode);
	}
};

vizup.LODChain.prototype.toggleShadingMode = function() {
	this.setShadingMode(this.shadingMode+1);
};

vizup.LODChain.prototype.toggleWireframeMode = function() {
    log.warn('LODChain.prototype.toggleWireframeMode - not implemented');
/* @TODO: rewrite
	if (this.currentLODIndex >= 0) {
		vizup.LODChain.setWireframeMode(this.lods[this.currentLODIndex]);
	}
*/
};

// get HUD info - do not support standard geometry !!!
vizup.LODChain.prototype.getHUDInfo = function() {

    var info = {};
    var currentLOD = this.lods[this.currentLODIndex];

    if (currentLOD.parent && currentLOD.parent.modelName)
        info.Model = currentLOD.parent.modelName;

    // info.Ratio = currentLOD.ratio;

    var position = currentLOD.bufferMesh.geometry.attributes[ "position" ];
    if (position)
        info.Vertices = position.numItems/3;

    var indices = currentLOD.bufferMesh.geometry.attributes[ "index" ];
    if (indices)
        info.Triangles = indices.numItems/3;
    else if (position)
        info.Triangles = position.numItems/9;

    return info;
};


/**
 *  Common static utility methods, attched to LODchain
 */

// debug geometry (created in LOD dimensions )
vizup.LODChain.createDebugGeometry = function(mesh) {

    var debugMode = false;
    var dbo = new THREE.Object3D(); // debug 3D object to hold all debug geometries
    dbo.name = vizup.LODChain.NAMETAG_DEBUG;

    // boundary box by first LOD
    var bb = new THREE.BoxHelper();
    bb.visible = debugMode;
    bb.material.color = new THREE.Color( 0xff0000 );
    bb.update(mesh);    // resize
    dbo.add(bb);

    if (mesh.geometry.boundingSphere == undefined)
        mesh.geometry.computeBoundingSphere();
    var ax = new THREE.AxisHelper(mesh.geometry.boundingSphere.radius/2.);
    ax.position.copy(mesh.geometry.boundingBox.center());
    ax.visible = debugMode;
    dbo.add(ax);

    return dbo;
};


// set Visibility
vizup.LODChain.setLODVisibility = function(LOD, onoff) {

    log.debug('VizupLOD: setting visibility: ' + onoff + ' for: ' + LOD.id);

    LOD.traverse( function(o) {
        if (o instanceof THREE.Object3D)
            o.visible = onoff;
    });
}

// set shading mdoe
vizup.LODChain.setLODShadingMode = function(LOD, mode) {

    var material = vizup.LODChain.ShadingMaterials[mode % vizup.LODChain.ShadingMaterials.length];

    if (LOD.bufferMesh) {

        // set regular shading if there are no colors for geometry
        if (material == vizup.LODChain.MATERIAL_COLORS &&
            (LOD.bufferMesh.geometry.attributes == undefined || LOD.bufferMesh.geometry.attributes["color"] == undefined) ) {
            log.debug('vizup.LODChain.setLODShadingMode - color shading not supported for this mesh, LOD.id = ' + LOD.id);
            material = vizup.LODChain.MATERIAL_SHADING;
        }

        LOD.bufferMesh.material = material;
    }

    // @TODO: take care about wireframe and flat shading ???

};

/* @TODO: set WireFrame mode
vizup.LODChain.setWireframeMode = function(LOD, onoff)
{
    var wireframe = LOD.getObjectByName(vizup.LODChain.NAMETAG_CLASSIC_MESH);
    if (wireframe)
	{
        log.debug('VizupLOD: setting wireframe to: ' + onoff + ' for: ' + LOD.id);
        wireframe.visible = onoff ? onoff : !wireframe.visible;


        var shading = LOD.getObjectByName(vizup.LODChain.NAMETAG_BUFFER_MESH);
        if (shading) {
            // shading.visible = !wireframe.visible;   // turn off shading completely

    		// switch to flat shading for wireframe for better picture
            // @todo - update for change shading mode
    		vizup.LODChain.MATERIAL_SHADING_SMOOTH.shading = wireframe.visible ? THREE.FlatShading : THREE.SmoothShading;
    		// force buffer updates to switch shading type
    		shading.geometry.normalsNeedUpdate = true;
        }

    }
	else
	{
        log.warning('VizupLOD: cant find wireframe for: ' + LOD.id);
    }
};
*/

vizup.LODChain.normalizationScale = function(geometry) {

    if (!geometry.boundingBox)
        geometry.computeBoundingBox();

    var scale = 0.5*(geometry.boundingBox.max.y - geometry.boundingBox.min.y);

	return scale > 0.0001 ? scale : geometry.boundingSphere.radius;
}

vizup.LODChain.normalizationCenter = function(geometry) {
    if (!geometry.boundingBox)
        geometry.computeBoundingBox();

    return geometry.boundingBox.center();
}

// scale to 1 and move to 0.0.0
vizup.LODChain.normalizeMesh = function(mesh, scale, center) {

    var factor = scale > 0.00001 ? 1.4/scale : 1.0;

    mesh.scale.set(factor, factor, factor);
    mesh.position.set(-center.x*factor, -center.y*factor, -center.z*factor);

    /* optional rotation for better initial view (demo mode)
    if (rotation)
        mesh.rotation.copy(rotation);
    */
};

vizup.LODChain.MATERIAL_SHADING = new THREE.MeshLambertMaterial( {
	color: 0xbbbbbb,
	opacity: 1.,
	wireframe: false,
	shading: THREE.FlatShading
});

vizup.LODChain.MATERIAL_NORMALS = new THREE.MeshNormalMaterial( {
    shading: THREE.FlatShading
});

vizup.LODChain.MATERIAL_COLORS = new THREE.MeshLambertMaterial( {
	color: 0xcccccc,
    side: THREE.DoubleSide,
    vertexColors: THREE.VertexColors,
    shading: THREE.FlatShading
});

vizup.LODChain.ShadingMaterials = [
    vizup.LODChain.MATERIAL_COLORS,
    vizup.LODChain.MATERIAL_SHADING,
    vizup.LODChain.MATERIAL_NORMALS
];

vizup.LODChain.MATERIAL_WIREFRAME = new THREE.MeshBasicMaterial( {
    color: 0x111111,
    transparent: true,
    wireframe: true
} );


/**
 *  For testing only
 */
function testMesh() {
    return new THREE.Mesh(new THREE.SphereGeometry(20, 12, 12), vizup.LODChain.MATERIAL_WIREFRAME);
}
