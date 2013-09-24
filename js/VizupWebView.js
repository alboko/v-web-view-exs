    var log = log4javascript.getDefaultLogger();

    var vizupWebRenderer, vizupWebCamera, vizupWebControls, vizupHUD;
    var vizupWebScene, vizupWebModel;

    function vizupWebView_init(containerName) {

        var container = document.getElementById(containerName);
        if (!container) {
            log.error('VizupWebView: cant find container: ' + containerName);
            return false;
        }

        // Create the Three.js vizupWebRenderer, add it to our div
        vizupWebRenderer = new THREE.WebGLRenderer( { antialias: true } );
        vizupWebRenderer.setSize(container.offsetWidth, container.offsetHeight);
        container.appendChild(vizupWebRenderer.domElement);

        // vizupWebScene
        vizupWebScene = new THREE.Scene();

        vizupWebCamera = new THREE.PerspectiveCamera(50, container.offsetWidth/container.offsetHeight, 0.1, 1000);
        vizupWebCamera.position.z = 5;
        vizupWebScene.add(vizupWebCamera);

        vizupWebView_addLights();
        vizupWebView_addControls(container);

        // var topModel = new THREE.Mesh(new THREE.SphereGeometry(2, 24, 12), new THREE.MeshNormalMaterial());
        // vizupWebScene.add(topModel);

        vizupHUD = new vizup.HUD();
        vizupWebScene.add(vizupHUD.miSprite);

        log.info('vizupWebView - initialized.');
        return true;
    }

    function vizupWebView_addLights() {

        var lightA = new THREE.AmbientLight( 0x707060 ); // soft white light
        vizupWebScene.add(lightA);

        var lightP = new THREE.PointLight(0xffffff, 1., 100);
        lightP.position.set( -5, 5, 10 );
        vizupWebCamera.add(lightP);     // sync light with camera
    }

    // add mouse and keyboard controls
    function vizupWebView_addControls(container) {

        vizupWebControls = new THREE.TrackballControls(vizupWebCamera, vizupWebRenderer.domElement);
        vizupWebControls.target.set(0, 0, 0);
        // vizupWebControls.autoRotate = true;

        // our own listeners,
        // @todo: change document to container?
        document.addEventListener( 'keydown', vizupWebView_onKeyPress, false );
    }

    // render and anymate scene
    function vizupWebView_animate() {

        requestAnimationFrame(vizupWebView_animate);

        vizupWebControls.update();
        vizupWebRenderer.render(vizupWebScene, vizupWebCamera);
    }

    // create and load LOD chain
    function vizupWebView_loadModel(vzmodel) {

        vizupWebModel = new vizup.LODChain(vzmodel.name, vzmodel.url);
        vizupWebModel.loadChain(vzmodel.lods, vzmodel.showIndex);

        // rotate top model if neccessary - demo hack
        if (vzmodel.rotation) {
                vizupWebModel.rotation.set(vzmodel.rotation[0], vzmodel.rotation[1], vzmodel.rotation[2]);
                log.debug('vizupWebView_loadModel - applied demo ratation: [ ' +
                        vzmodel.rotation[0] + ', ' + vzmodel.rotation[1] + ', ' + vzmodel.rotation[2] + ' ]');
        }

        vizupWebScene.add(vizupWebModel);
    }

    // temporary (REMOVE): load obj model
    function vizupWebView_loadOBJ(modelURL, mtlURL) {

        var loader = new THREE.OBJMTLLoader();
	loader.load(modelURL, mtlURL, function (object) {

	        // find mesh/geometry in the object and normalize it
                object.traverse( function(mesh) {
                        if (mesh instanceof THREE.Mesh) {

                                var geometry = mesh.geometry;

                                var scale = 3000. // vizup.LODChain.normalizationScale(geometry);
                                var center = new THREE.Vector3(); // vizup.LODChain.normalizationCenter(geometry);
                                console.log("normalizing OBJ mesh geometry, scale: " + scale);
                                vizup.LODChain.normalizeMesh(mesh, scale, center);
                        }
                });

		vizupWebScene.add(object);
	} );
    }

    // process application keyboard events
    function vizupWebView_onKeyPress(event) {
        log.trace('key pressed: ' + event.keyCode);

        switch (event.keyCode) {

            case 190:   // "> (.)" - more detailed LOD
	    case 39:
		izupWebModel.activateNextLOD(+1);
                vizupHUD.updateLODinfo(vizupWebModel.getHUDInfo());
		break;
            case 188:   // "< (,)" - less detailed LOD
	    case 37:
		vizupWebModel.activateNextLOD(-1);
                vizupHUD.updateLODinfo(vizupWebModel.getHUDInfo());
		break;
            case 87:    // "w" - not supported yet;
                // vizupWebModel.toggleWireframeMode();
                break;
            case 83:    // "s" - toogle shading type (color, shading, normals, etc)
                vizupWebModel.toggleShadingMode();
                break;
            case 82:    // 'r' - reset view
            case 48:    // '0'
                vizupWebControls.reset();
                break;
            case 73:    // 'i'
                vizupHUD.toggle();
                vizupHUD.updateLODinfo(vizupWebModel.getHUDInfo());
                break;
        }

    }
