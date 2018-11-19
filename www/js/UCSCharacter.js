
THREE.UCSCharacter = function () {

	var scope = this;

	var mesh;

	this.scale = 1;

	this.root = new THREE.Object3D();

	this.numSkins = undefined;
	this.numMorphs = undefined;

	this.skins = [];
	this.materials = [];
	this.morphs = [];

	this.mixer = new THREE.AnimationMixer( this.root );

	this.onLoadComplete = function () {};

	this.loadCounter = 0;

	function createBones() {
		var segmentHeight = 8;
		var segmentCount = 4;
		var height = segmentHeight * segmentCount;
		var halfHeight = height * 0.5;
		var sizing = {
			segmentHeight : segmentHeight,
			segmentCount : segmentCount,
			height : height,
			halfHeight : halfHeight
		};

		bones = [];
		var prevBone = new THREE.Bone();
		bones.push(prevBone);
		prevBone.position.y = - sizing.halfHeight;

		for ( var i = 0; i < sizing.segmentCount; i ++ ) {
			var bone = new THREE.Bone();
			bone.position.y = sizing.segmentHeight;
			bones.push(bone);
			prevBone.add(bone);
			prevBone = bone;
		}
		return bones;
	}

	this.loadParts = function ( config ) {

		this.numSkins = config.skins.length;
		this.numMorphs = config.morphs.length;

		// Character geometry + number of skins
		this.loadCounter = 1 + config.skins.length;

		// SKINS
		//this.skins = loadTextures( config.baseUrl + "skins/", config.skins );
		//this.materials = createMaterials( this.skins );
		this.materials = createMaterials();

		// MORPHS
		this.morphs = config.morphs;

		// CHARACTER
		var loader = new THREE.JSONLoader();
		console.log( config.baseUrl + config.character );
		loader.load( config.baseUrl + config.character, function ( geometry ) {

			geometry.computeBoundingBox();
			geometry.computeVertexNormals();

			mesh = new THREE.SkinnedMesh( geometry, [] );
			mesh.name = config.character;

			//var bones = createBones();
			//console.log("Bones: ", bones)
			//var skeleton = new THREE.Skeleton(bones);
			//console.log("skeleton = ", skeleton)
			//mesh.add(bones[0]);
			//mesh.bind(skeleton);
			//skeletonHelper = new THREE.SkeletonHelper(mesh);
			//skeletonHelper.material.linewidth = 2;
			//scene.add(skeletonHelper);

			scope.root.add( mesh );
			console.log(scope)
			var bb = geometry.boundingBox;
			console.log(geometry)
			console.log(bb);
			scope.root.scale.set( config.s, config.s, config.s );
			scope.root.position.set( config.x, config.y - bb.min.y * config.s, config.z );

			mesh.castShadow = true;
			mesh.receiveShadow = true;

			scope.mixer.clipAction( geometry.animations[ 0 ], mesh ).play();

			scope.setSkin( 0 );

			scope.checkLoadComplete();

		} );

	};

	this.setSkin = function ( index ) {

		if ( mesh && scope.materials ) {

			mesh.material = scope.materials[ index ];

		}

	};

	this.updateMorphs = function ( influences ) {

		if ( mesh ) {

			for ( var i = 0; i < scope.numMorphs; i ++ ) {

				mesh.morphTargetInfluences[ i ] = influences[ scope.morphs[ i ] ] / 100;

			}

		}

	};

	function loadTextures( baseUrl, textureUrls ) {

		var textureLoader = new THREE.TextureLoader();
		var textures = [];

		for ( var i = 0; i < textureUrls.length; i ++ ) {

			textures[ i ] = textureLoader.load( baseUrl + textureUrls[ i ], scope.checkLoadComplete );
			textures[ i ].mapping = THREE.UVMapping;
			textures[ i ].name = textureUrls[ i ];

		}

		return textures;

	}

		/*
	function createMaterials( skins ) {
		var materials = [];

		for ( var i = 0; i < skins.length; i ++ ) {

			materials[ i ] = new THREE.MeshLambertMaterial( {
				color: 0xeeeeee,
				specular: 10.0,
				map: skins[ i ],
				skinning: true,
				morphTargets: true
			} );

		}

		return materials;
		*/
	function createMaterials() {
		material = new THREE.MeshNormalMaterial({
				color: 0, //13359858,
				transparent: true,
				opacity: 1,
				specular: 10.0,
				skinning: true,
				morphTargets: true,
				wireframe: true
		});
		return [material];
	}

	this.checkLoadComplete = function () {

		scope.loadCounter -= 1;

		if ( scope.loadCounter === 0 ) {

			scope.onLoadComplete();

		}

	};

};
