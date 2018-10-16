// JavaScript code for the TI SensorTag Demo app.

/**
 * Object that holds application data and functions.
 */
var app = {};

/**
 * Timeout (ms) after which a message is shown if the SensorTag wasn't found.
 */
app.CONNECT_TIMEOUT = 3000;

/**
 * Object that holds SensorTag UUIDs.
 */
app.cc2541 = {};

app.cc2541.ACCELEROMETER_SERVICE = 'f000aa10-0451-4000-b000-000000000000';
app.cc2541.ACCELEROMETER_DATA = 'f000aa11-0451-4000-b000-000000000000';
app.cc2541.ACCELEROMETER_CONFIG = 'f000aa12-0451-4000-b000-000000000000';
app.cc2541.ACCELEROMETER_PERIOD = 'f000aa13-0451-4000-b000-000000000000';
app.cc2541.ACCELEROMETER_NOTIFICATION = '00002902-0000-1000-8000-00805f9b34fb';

/**
 * Data that is plotted on the canvas.
 */
app.cc2541.dataPoints = [];

// UUIDs for movement services and characteristics.
app.cc2650 = {};
app.cc2650.MOVEMENT_SERVICE = 'f000aa80-0451-4000-b000-000000000000';
app.cc2650.MOVEMENT_DATA = 'f000aa81-0451-4000-b000-000000000000';
app.cc2650.MOVEMENT_CONFIG = 'f000aa82-0451-4000-b000-000000000000';
app.cc2650.MOVEMENT_PERIOD = 'f000aa83-0451-4000-b000-000000000000';
app.cc2650.MOVEMENT_NOTIFICATION = '00002902-0000-1000-8000-00805f9b34fb';

app.cc2650.dataPoints = [];
app.cc2650.devices = [];

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
	//app.cc2541.device = false;
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
				if(s && s[0] == "0000aa80-0000-1000-8000-00805f9b34fb") {
					app.cc2650.devices.push(device);
					console.log(app.cc2650.devices.length);
				} else {
					app.cc2541.device = device;
				}
				if (app.cc2650.devices.length == 2) { //&& app.cc2541.device) {
					evothings.easyble.stopScan();
					app.stopConnectTimer();
					var i;
					for (i = 0; i < app.cc2650.devices.length; i++) {
						app.cc2650.devices[i].index = i;
						app.cc2650.dataPoints.push([]);
						app.connectToDevice(app.cc2650.devices[i]);
					}
					//app.connectToDevice(app.cc2650.device);
					//app.connectToDevice(app.cc2541.device);
				}
			}
		},
		function(errorCode)
		{
			app.showInfo('Error: startScan: ' + errorCode + '.');
		});
};

app.deviceIsSensorTag = function(device)
{
	console.log('device name: ' + device.name);
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
	if(device.__uuidMap[app.cc2541.ACCELEROMETER_DATA])
		app.startCC2541AccelerometerNotification(device)
	else if(device.__uuidMap[app.cc2650.MOVEMENT_DATA])
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
		new Uint8Array([56,0]),
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
		});

	// Start accelerometer notification.
	device.enableNotification(
		app.cc2650.MOVEMENT_DATA,
		function(data)
		{
			app.showInfo('Status: data stream active');
			var dataArray = new Uint8Array(data);
			var values = app.getCC2650AccelerometerValues(dataArray);
			app.drawDiagram(values, device.index, app.cc2650.dataPoints[device.index]);
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
	var divisors = { x: -16384.0, y: 16384.0, z: -16384.0 };

	// Calculate accelerometer values.
	var ax = evothings.util.littleEndianToInt16(data, 6) / divisors.x;
	var ay = evothings.util.littleEndianToInt16(data, 8) / divisors.y;
	var az = evothings.util.littleEndianToInt16(data, 10) / divisors.z;

	// Return result.
	return { x: ax, y: ay, z: az };
};

/**
 * Read accelerometer data.
 * http://processors.wiki.ti.com/index.php/SensorTag_User_Guide#Accelerometer_2
 * http://processors.wiki.ti.com/index.php/File:BLE_SensorTag_GATT_Server.pdf
 */
app.startCC2541AccelerometerNotification = function(device)
{
	app.showInfo('Status: Starting CC2541 accelerometer notification...');

	// Set accelerometer configuration to ON.
	device.writeCharacteristic(
		app.cc2541.ACCELEROMETER_CONFIG,
		new Uint8Array([1]),
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
		app.cc2541.ACCELEROMETER_PERIOD ,
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
		app.cc2541.ACCELEROMETER_DATA,
		app.cc2541.ACCELEROMETER_NOTIFICATION, // Notification descriptor.
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
		});

	// Start accelerometer notification.
	device.enableNotification(
		app.cc2541.ACCELEROMETER_DATA,
		function(data)
		{
			app.showInfo('Status: data stream active');
			var dataArray = new Uint8Array(data);
			var values = app.getCC2541AccelerometerValues(dataArray);
			app.drawDiagram(values, 1, app.cc2541.dataPoints);
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
app.getCC2541AccelerometerValues = function(data)
{
	// TODO: Set divisor based on firmware version.
	var divisors = {x: 32.0, y: -32.0, z: 32.0}

	// Calculate accelerometer values.
	var ax = evothings.util.littleEndianToInt8(data, 0) / divisors.x;
	var ay = evothings.util.littleEndianToInt8(data, 1) / divisors.y;
	var az = evothings.util.littleEndianToInt8(data, 2) / divisors.z;

	// Return result.
	return { x: ax, y: ay, z: az };
};

/**
 * Plot diagram of sensor values.
 * Values plotted are expected to be between -1 and 1
 * and in the form of objects with fields x, y, z.
 */
app.drawDiagram = function(values, id, dataPoints)
{
	var canvas = document.getElementById('canvas'+id);
	var context = canvas.getContext('2d');

	// Add recent values.
	dataPoints.push(values);

	// Remove data points that do not fit the canvas.
	if (dataPoints.length > canvas.width)
	{
		dataPoints.splice(0, (dataPoints.length - canvas.width));
	}

	// Value is an accelerometer reading between -1 and 1.
	function calcDiagramY(value)
	{
		// Return Y coordinate for this value.
		var diagramY =
			((value * canvas.height) / 2)
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
