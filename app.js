// JavaScript code for the TI SensorTag Demo app.

/**
 * Object that holds application data and functions.
 */
var app = {};

app.sleep = (milliseconds) => {
	return new Promise(resolve => setTimeout(resolve, milliseconds))
};

/**
 * Timeout (ms) after which a message is shown if the SensorTag wasn't found.
 */
app.CONNECT_TIMEOUT = 3000;
app.NUM_DEVICES = 1;
app.TYPE_ACC = 0;
app.TYPE_GYR = 1;
app.TYPE_MAG = 2;
app.DIAGRAM_SCALER = [2, 255, 300];

// UUIDs for movement services and characteristics.
app.cc2650 = {};
app.cc2650.MOVEMENT_SERVICE = 'f000aa80-0451-4000-b000-000000000000';
app.cc2650.MOVEMENT_DATA = 'f000aa81-0451-4000-b000-000000000000';
app.cc2650.MOVEMENT_CONFIG = 'f000aa82-0451-4000-b000-000000000000';
app.cc2650.MOVEMENT_PERIOD = 'f000aa83-0451-4000-b000-000000000000';
app.cc2650.MOVEMENT_NOTIFICATION = '00002902-0000-1000-8000-00805f9b34fb';

// var to_rad = (x) => {return x/360.0 * 3.1415926 * 2};
// app.to_rad = (x) => {return x/54.0};
app.to_rad = (x) => {return x/57.295779513};

/**
 * Initialise the application.
 */
app.initialize = function()
{
	document.addEventListener(
		'deviceready',
		function() { evothings.scriptsLoaded(app.onDeviceReady) },
		false);

	// Called when HTML page has been loaded.
	$(document).ready( function()
	{
		// Adjust canvas size when browser resizes
		$(window).resize(app.respondCanvas);

		// Adjust the canvas size when the document has loaded.
		app.respondCanvas();
	});
};

app.reset_vars = function() {
	app.cc2650.dataPoints = [];
	app.cc2650.devices = [];

	app.avg_x = [];
	app.avg_y = [];
	app.avg_z = [];
	app.gi = [];
	app.lower = [];
	app.higher = [];

	app.quarternions = [];
}

/**
 * Adjust the canvas dimensions based on its container's dimensions.
 */
app.respondCanvas = function()
{
	var canvas = $('#canvas')
	var container = $(canvas).parent()
	canvas.attr('width', $(container).width() ) // Max width
	// Not used: canvas.attr('height', $(container).height() ) // Max height
};

app.onDeviceReady = function()
{
	app.showInfo('Activate the SensorTag and tap Start.');
};

app.showInfo = function(info)
{
	if(app.info != info) {
		app.info = info;
		console.log(info);
		document.getElementById('info').innerHTML = info;
	}
};

app.onStartButton = function()
{
	app.onStopButton();
	app.startScan();
	app.showInfo('Status: Scanning...');
	app.startConnectTimer();
};

app.onStopButton = function()
{
	// Stop any ongoing scan and close devices.
	app.stopConnectTimer();
	evothings.easyble.stopScan();
	evothings.easyble.closeConnectedDevices();
	app.reset_vars();
	//resetBones();
	app.showInfo('Status: Stopped.');
};

app.startConnectTimer = function()
{
	// If connection is not made within the timeout
	// period, an error message is shown.
	app.connectTimer = setTimeout(
		function()
		{
			app.showInfo('Status: Scanning... ' +
				'Please press the activate button on the tags.');
		},
		app.CONNECT_TIMEOUT)
}

app.stopConnectTimer = function()
{
	clearTimeout(app.connectTimer);
}

app.startScan = function()
{
	// Clean up any previous devices.
	app.cc2650.devices = [];

	// Ensure we don't get duplicates.
	evothings.easyble.reportDeviceOnce(true);

	evothings.easyble.startScan(
		function(device)
		{
			// Connect if we have found a sensor tag.
			if (app.deviceIsSensorTag(device))
			{
				app.showInfo('Status: Device found: ' + device.name + '.');
				console.log(JSON.stringify(device.advertisementData));
				var s = device.advertisementData.kCBAdvDataServiceUUIDs;
				var name = device.advertisementData.kCBAdvDataLocalName;
				if(name == "CC2650 SensorTag") {
				//if(s && s[0] == "0000aa80-0000-1000-8000-00805f9b34fb") {
					app.cc2650.devices.push(device);
					console.log("detected devices: "+app.cc2650.devices.length);
				}
				if (app.cc2650.devices.length == app.NUM_DEVICES) { 
                    evothings.easyble.stopScan();
					app.stopConnectTimer();
					var i, start;
					for (i = 0; i < app.cc2650.devices.length; i++) {
						app.cc2650.devices[i].index = i;
						app.cc2650.dataPoints.push([[], [], []]);
						app.connectToDevice(app.cc2650.devices[i]);
						app.avg_x.push(0);
						app.avg_y.push(0);
						app.avg_z.push(0);
						app.gi.push(0);
						app.lower.push(10);
						app.higher.push(51);
						app.quarternions.push({q0: 1.0, q1: 0.0, q2: 0.0, q3: 0.0});
						//app.sleep(500).then();
						//start = new Date().getTime();
						//console.log(i+" before: "+start);
						//while (new Date().getTime() - start < 2000);
						//console.log(i+" after: "+new Date().getTime());

					}
					//app.connectToDevice(app.cc2650.device);
				}
			}
		},
		function(errorCode)
		{
			app.showInfo('Error: startScan: ' + errorCode + '.');
			// TODO: add restart
		});
};

app.deviceIsSensorTag = function(device)
{
	if (device.name) {
		console.log('device name: ' + device.name);
	}
	return (device != null) &&
		(device.name != null) &&
		(device.name.indexOf('Sensor Tag') > -1 ||
			device.name.indexOf('SensorTag') > -1);
};

/**
 * Read services for a device.
 */
app.connectToDevice = function(device)
{
	app.showInfo('Connecting...');
	device.connect(
		function(device)
		{
			app.showInfo('Status: Connected - reading SensorTag services...');
			app.readServices(device);
		},
		function(errorCode)
		{
			app.showInfo('Connection error: ' + errorCode);
		});
};

app.readServices = function(device)
{
	device.readServices(
		null,
		// Function that monitors accelerometer data.
		app.startAccelerometerNotification,
		// Use this function to monitor magnetometer data
		// (comment out the above line if you try this).
		//app.startMagnetometerNotification,
		function(errorCode)
		{
			console.log('Error: Failed to read services: ' + errorCode + '.');
		});
};

// Determine which sort of device we have, then call the appropriate start function.
app.startAccelerometerNotification = function(device)
{
	if(device.__uuidMap[app.cc2650.MOVEMENT_DATA])
		app.startCC2650AccelerometerNotification(device)
	else
		app.showInfo('Unknown device connected!');
}

/**
 * Read accelerometer data.
 */
app.startCC2650AccelerometerNotification = function(device)
{
	app.showInfo('Status: Starting CC2650 accelerometer notification...');

	// Set accelerometer configuration to ON.
	// magnetometer on: 64 (1000000) (seems to not work in ST2 FW 0.89)
	// 3-axis acc. on: 56 (0111000)
	// 3-axis gyro on: 7 (0000111)
	// 3-axis acc. + 3-axis gyro on: 63 (0111111)
	// 3-axis acc. + 3-axis gyro + magnetometer on: 127 (1111111)
	device.writeCharacteristic(
		app.cc2650.MOVEMENT_CONFIG,
		new Uint8Array([127,0]),
		function()
		{
			console.log('Status: writeCharacteristic ok.');
		},
		function(errorCode)
		{
			console.log('Error: writeCharacteristic: ' + errorCode + '.');
		});

	// Set accelerometer period to 100 ms.
	device.writeCharacteristic(
		app.cc2650.MOVEMENT_PERIOD,
		new Uint8Array([10]),
		function()
		{
			console.log('Status: writeCharacteristic ok.');
		},
		function(errorCode)
		{
			console.log('Error: writeCharacteristic: ' + errorCode + '.');
		});

	// Set accelerometer notification to ON.
	device.writeDescriptor(
		app.cc2650.MOVEMENT_DATA,
		app.cc2650.MOVEMENT_NOTIFICATION, // Notification descriptor.
		new Uint8Array([1,0]),
		function()
		{
			console.log('Status: writeDescriptor ok.');
		},
		function(errorCode)
		{
			// This error will happen on iOS, since this descriptor is not
			// listed when requesting descriptors. On iOS you are not allowed
			// to use the configuration descriptor explicitly. It should be
			// safe to ignore this error.
			console.log('Error: writeDescriptor: ' + errorCode + '.');
			console.log("uuid map: "+device.__uuidMap);
		});

	// Start accelerometer notification.
	device.enableNotification(
		app.cc2650.MOVEMENT_DATA,
		function(data)
		{
			app.showInfo('Status: data stream active');
			var dataArray = new Uint8Array(data);
			
			var id = device.index;
			var acc_vals = app.getCC2650AccelerometerValues(dataArray);
			var gyr_vals = app.getCC2650GyroscopeValues(dataArray, id);
			var mag_vals = app.getCC2650MagnetometerValues(dataArray);
			//madgwickAHRSupdateIMU(gyr_vals.x, gyr_vals.y, gyr_vals.z, 
			//					acc_vals.x, acc_vals.y, acc_vals.z);

			if (app.gi[id] < app.higher[id]) {
                console.log(app.gi[id] + "/" + app.higher[id]);
                return;   
            }
			//console.log("Device "+id+" : Got enough data for madgwick");
			/*
			console.log('gyr: '+gyr_vals.x+' '+gyr_vals.y+' '+gyr_vals.z); 
			console.log('acc: '+acc_vals.x+' '+acc_vals.y+' '+acc_vals.z); 
			console.log('mag: '+mag_vals.x+' '+mag_vals.y+' '+mag_vals.z);
			*/
			var q = madgwickAHRSupdate(app.quarternions[id], gyr_vals, acc_vals, mag_vals);
			// if (q) {
			// 	console.log("Device "+id+": q0="+q.q0+" q1="+q.q1+" q2="+q.q2+" q3="+q.q3);
				app.quarternions[id] = q;
				updateBone(id, q);
			// }

			//app.drawDiagram(app.TYPE_ACC, acc_vals, device.index, app.cc2650.dataPoints);
			//app.drawDiagram(app.TYPE_GYR, gyr_vals, device.index, app.cc2650.dataPoints);
			//app.drawDiagram(app.TYPE_MAG, mag_vals, device.index, app.cc2650.dataPoints);
			//console.log("data length of "+device.index+": "+datalist.length);
		},
		function(errorCode)
		{
			console.log('Error: enableNotification: ' + errorCode + '.');
		});
};

/**
 * Calculate accelerometer values from raw data for SensorTag 2.
 * @param data - an Uint8Array.
 * @return Object with fields: x, y, z.
 */
app.getCC2650AccelerometerValues = function(data)
{
	var divisors = { x: -16384.0, y: -16384.0, z: -16384.0 };

	// Calculate accelerometer values.
	var ax = evothings.util.littleEndianToInt16(data, 6) / divisors.x;
	var ay = evothings.util.littleEndianToInt16(data, 8) / divisors.y;
	var az = evothings.util.littleEndianToInt16(data, 10) / divisors.z;
	// Return result.
	return { x: ax, y: ay, z: az };
};

app.getCC2650GyroscopeValues = function(data, id) {
	// Calculate gyroscope values.
	var gx = evothings.util.littleEndianToInt16(data, 0) * 250.0 / 32768.0;
	var gy = evothings.util.littleEndianToInt16(data, 2) * 250.0 / 32768.0;
	var gz = evothings.util.littleEndianToInt16(data, 4) * 250.0 / 32768.0;

	if (app.gi[id] < app.higher[id]) {
        //console.log(app.gi);
        if (app.gi[id] < app.lower[id]) {
            app.gi[id]++;
	         // return { x: gx, y: gy, z: gz }
	        return { x: 0, y: 0, z: 0}
        }
        app.avg_x[id] = ((app.gi[id] - app.lower[id]) * app.avg_x[id] + gx)/(app.gi[id] - app.lower[id] + 1);
        app.avg_y[id] = ((app.gi[id] - app.lower[id]) * app.avg_y[id] + gy)/(app.gi[id] - app.lower[id] + 1);
        app.avg_z[id] = ((app.gi[id] - app.lower[id]) * app.avg_z[id] + gz)/(app.gi[id] - app.lower[id] + 1);
        app.gi[id]++;
	    return { x: 0, y: 0, z: 0}
    }

	// Return result.
	// return { x: gx-app.avg_x[id],
    //          y: gy-app.avg_y[id],
    //          z: gz-app.avg_z[id] };
	return { x: app.to_rad(gx-app.avg_x[id]),
             y: app.to_rad(gy-app.avg_y[id]),
             z: app.to_rad(gz-app.avg_z[id]) };
}

app.getCC2650MagnetometerValues = function(data) {
	// Magnetometer values (Micro Tesla).
	var mx = -evothings.util.littleEndianToInt16(data, 12) * (4912.0 / 32768.0);
	var my = -evothings.util.littleEndianToInt16(data, 14) * (4912.0 / 32768.0);
	var mz = evothings.util.littleEndianToInt16(data, 16) * (4912.0 / 32768.0);
	// var mx = evothings.util.littleEndianToInt16(data, 12);
	// var my = evothings.util.littleEndianToInt16(data, 14);
	// var mz = evothings.util.littleEndianToInt16(data, 16);
    // console.log(mx, my, mz);
	/*
	if (my > app.max_ax) {
		app.max_ax = my;
	}
	if (my < app.min_ax) {
		app.min_ax = my;
	}
	console.log("max my="+app.max_ax);
	console.log("min my="+app.min_ax);
	*/ 
	// Return result.
	return { x: mx, y: my, z: mz };
}

/**
 * Plot diagram of sensor values.
 * Values plotted are expected to be between -1 and 1
 * and in the form of objects with fields x, y, z.
 */
app.drawDiagram = function(type, values, id, device_data)
{
	//console.log("Device "+id+" is drawing");
	var canvas_prefix = '';
	switch (type) {
		case app.TYPE_ACC:
			canvas_prefix = 'acc';
			break;
		case app.TYPE_GYR:
			canvas_prefix = 'gyr';
			break;
		case app.TYPE_MAG:
			canvas_prefix = 'mag';
			break;
	}
	if (canvas_prefix == '') {
		return;
	}
	var canvas = document.getElementById(canvas_prefix+id);
	var context = canvas.getContext('2d');

	// Add recent values.
	var dataPoints = device_data[id][type];
	dataPoints.push(values);

	// Remove data points that do not fit the canvas.
	if (dataPoints.length > canvas.width)
	{
		dataPoints.splice(0, (dataPoints.length - canvas.width));
	}

	// Value range: acc [-2, 2], gyr [-255, 255], mag [-1, 1]
	function calcDiagramY(value)
	{
		// Return Y coordinate for this value.
		var diagramY =
			((value / app.DIAGRAM_SCALER[type] * canvas.height) / 2)
			+ (canvas.height / 2);
		return diagramY;
	}

	function drawLine(axis, color)
	{
		context.strokeStyle = color;
		context.beginPath();
		var lastDiagramY = calcDiagramY(
			dataPoints[dataPoints.length-1][axis]);
		context.moveTo(0, lastDiagramY);
		var x = 1;
		for (var i = dataPoints.length - 2; i >= 0; i--)
		{
			var y = calcDiagramY(dataPoints[i][axis]);
			context.lineTo(x, y);
			x++;
		}
		context.stroke();
	}

	// Clear background.
	context.clearRect(0, 0, canvas.width, canvas.height);

	// Draw lines.
	drawLine('x', '#f00');
	drawLine('y', '#0f0');
	drawLine('z', '#00f');
};

// Initialize the app.
app.initialize();
