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
app.DIAGRAM_SCALER = [2, 255];

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

app.max_ax = 0;
app.min_ax = 0;

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
		// $(window).resize(app.respondCanvas);

		// Adjust the canvas size when the document has loaded.
		// app.respondCanvas();
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
		// document.getElementById('info').innerHTML = info;
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
				var name = device.advertisementData.kCBAdvDataLocalName;
				if(name == "CC2650 SensorTag") {
				//if(s && s[0] == "0000aa80-0000-1000-8000-00805f9b34fb") {
					app.cc2650.devices.push(device);
					console.log("detected devices: "+app.cc2650.devices.length);
				} else {
					//app.cc2541.device = device;
				}
				if (app.cc2650.devices.length == app.NUM_DEVICES) { //&& app.cc2541.device) {
                    evothings.easyble.stopScan();
					app.stopConnectTimer();
					var i, start;
					for (i = 0; i < app.cc2650.devices.length; i++) {
						app.cc2650.devices[i].index = i;
						app.cc2650.dataPoints.push([[], []]);
						app.connectToDevice(app.cc2650.devices[i]);
						//app.sleep(500).then();
						//start = new Date().getTime();
						//console.log(i+" before: "+start);
						//while (new Date().getTime() - start < 2000);
						//console.log(i+" after: "+new Date().getTime());

					}
					//app.connectToDevice(app.cc2650.device);
					//app.connectToDevice(app.cc2541.device);
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
		new Uint8Array([63,0]),
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
			var acc_vals = app.getCC2650AccelerometerValues(dataArray);
			var gyr_vals = app.getCC2650GyroscopeValues(dataArray);
            // add to device.enableNotification()
            var mag_vals = app.getCC2650MagnetometerValues(dataArray);
            // the values are mag_vals.x, .y, .z
            if (gi < higher) return;

                // mahonyAHRSupdateIMU(gy, -gx, gz,
								  // acc_vals.y, -acc_vals.x, acc_vals.z); 
            madgwickAHRSupdate(gyr_vals.x, gyr_vals.y, gyr_vals.z, acc_vals.x, acc_vals.y, acc_vals.z , mag_vals.x, mag_vals.y, mag_vals.z);
                // mahonyAHRSupdate(gy, -gx, gz, acc_vals.y, -acc_vals.x, acc_vals.z, mag_vals.y, -mag_vals.x, mag_vals.z);
                // mahonyAHRSupdate(gy, -gx, gz, gyr_vals.y, -gyr_vals.x, gyr_vals.z, mag_vals.y, -mag_vals.x, mag_vals.z);
                // madgwickAHRSupdateIMU(to_ms2(gy), -to_ms2(gx), to_ms2(gz),
								      // to_ms2(acc_vals.y), -to_ms2(acc_vals.x), to_ms2(acc_vals.z));
            // }
			// console.log("q0="+q0+" q1="+q1+" q2="+q2+" q3="+q3);

			// app.drawDiagram(app.TYPE_ACC, acc_vals, device.index, app.cc2650.dataPoints);
			// app.drawDiagram(app.TYPE_GYR, gyr_vals, device.inde x, app.cc2650.dataPoints);
			//console.log("data length of "+device.index+": "+datalist.length);
		},
		function(errorCode)
		{
			console.log('Error: enableNotification: ' + errorCode + '.');
		});
};

var cur_px = 0;
var cur_py = 0;
var cur_pz = 0;

var cur_sx = 0;
var cur_sy = 0;
var cur_sz = 0;

var cur_ax = 0;
var cur_ay = 0;
var cur_az = 0;

var old_time = 0;

var slow_print_cnt = 0;
var ggx = 0;
var ggy = 0;
var ggz = 0;
var to_test = 0;
var lower = 50;
var higher = 150;
var to_ms2 = (x) => {return x * (-9.81);};

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


    // if (to_test < higher) {
    //     console.log("TEST " + to_test);
    //     if (to_test < lower) {
    //         to_test++;
	//         return { x: ax, y: ay, z: az };
    //     }
    //     ggx = (ggx * (to_test - lower) + ax) / (to_test+1 - lower);
    //     ggy = (ggy * (to_test - lower) + ay) / (to_test+1 - lower);
    //     ggz = (ggz * (to_test - lower) + az) / (to_test+1 - lower);
    //     to_test++;
	//     return { x: ax, y: ay, z: az };
    // }

    // cur_ax = to_ms2(ax-ggx);
    // cur_ay = to_ms2(ay-ggy);
    // cur_az = to_ms2(az-ggz);


    // var curr_time = (new Date()).getTime();
    // if (old_time != 0) {
    //     let diffTime = curr_time - old_time;
    //     cur_px += cur_sx * diffTime / 1000;
    //     cur_py += cur_sy * diffTime / 1000;
    //     cur_pz += cur_sz * diffTime / 1000;

    //     cur_sx += cur_ax * diffTime / 1000;
    //     cur_sy += cur_ay * diffTime / 1000;
    //     cur_sz += cur_az * diffTime / 1000;
    // }

    // old_time = curr_time;

    // if (slow_print_cnt++ % 10 == 0) {
        // console.log(cur_px + " " + cur_py + " " + cur_pz + "/ " + cur_az);
    // }

	/*if (ax > app.max_ax) {
		app.max_ax = ax;
	}
	if (ax < app.min_ax) {
		app.min_ax = ax;
	}
	console.log("max gx="+app.max_ax);
	console.log("min gx="+app.min_ax);
	*/
	// Return result.
	return { x: ax, y: ay, z: az };
};

var avg_x = 0;
var avg_y = 0;
var avg_z = 0;
var gi = 0;
// var to_rad = (x) => {return x/360.0 * 3.1415926 * 2};
var to_rad = (x) => {return x/6.0};

app.getCC2650GyroscopeValues = function(data) {
	// Calculate gyroscope values.
	var gx = evothings.util.littleEndianToInt16(data, 0) * 255.0 / 32768.0;
	var gy = evothings.util.littleEndianToInt16(data, 2) * 255.0 / 32768.0;
	var gz = evothings.util.littleEndianToInt16(data, 4) * 255.0 / 32768.0;
    if (gi < higher) {
        console.log(gi);
        if (gi < lower) {
            gi++;
	         // return { x: gx, y: gy, z: gz }
	        return { x: 0, y: 0, z: 0}
        }
        avg_x = ((gi - lower) * avg_x + gx)/(gi - lower + 1);
        avg_y = ((gi - lower) * avg_y + gy)/(gi - lower+ 1);
        avg_z = ((gi - lower) * avg_z + gz)/(gi  - lower+ 1);
        gi++;
	    return { x: 0, y: 0, z: 0}
    }

	// Return result.
	return { x: to_rad(gx-avg_x),
             y: to_rad(gy-avg_y),
             z: to_rad(gz-avg_z) };
}


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
		new Uint8Array([20]),
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
			//app.drawDiagram(values, 1, app.cc2541.dataPoints);
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

// add this function somewhere
// unit is uT, max range can be -4900 to +4900
app.getCC2650MagnetometerValues = function(data) {
	// Magnetometer values (Micro Tesla).
	var mx = evothings.util.littleEndianToInt16(data, 12) * (4912.0 / 32768.0);
	var my = evothings.util.littleEndianToInt16(data, 14) * (4912.0 / 32768.0);
	var mz = evothings.util.littleEndianToInt16(data, 16) * (4912.0 / 32768.0);
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

	// Value range: acc [-2, 2], gyr [-255, 255]
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
