# Accurate Body Motion Tracking

This is an IoT project that aims to track human body motion using TI Sensortag CC2650 and visualize the real-time movements in 3D on an Android app. It is developed by Team Io_oT: Sijun Zhu, Yi Xiao and Ziming Zheng.

## Prerequisites

To run the system, you will need the following:
* TI Sensortag CC2650 with default firmware
* Android smartphone or tablet with Bluetooth enabled and Android version 7.0 or above
* Any elastic bands for wearing the Sensortag on arms or legs

To install the Android app, you may need the Android Debug Bridge `adb` installed on a computer connected to the Android device, see [the official Android documentation](https://developer.android.com/studio/command-line/adb).

## Installing

* Make sure the default firmware is running on the Sensortag.
* Install the app from APK: 
    * The apk file is located at: `platforms/android/app/build/outputs/apk/debug/app-debug.apk`.
    * Connect your Android device with your computer and install the app using ADB: `adb install -r /path/to/apk`. Note that the path to the APK file is dependent on where you downloaded this project repository. Also note that you might need to give permissions on your phone to allow USB debugging.

* Install the app from source:
    * Alternatively, you may build the app from the source code and generate your APK file to be installed. This requires that you have Cordova installed on your computer.
    * Once you have Cordova installed, run this command in the project root directory: `cordova build android`. This will generate an APK file located at the above mentioned path. You may follow the above steps to install the APK.

* Note: The app has been tested on Nexus 5X with Android 8.0. However every Android device is slightly different, so let us know if you encounter any problems with your specific device.

## Built With

* [Apache Cordova](https://cordova.apache.org) - The app is written in Javascript and built with Cordova in order to run natively on Anroid.
* [EasyBLE](https://evothings.com/doc/lib-doc/evothings.easyble.html) - The BLE library used to retrieve sensor data from the Sensortag.  
* [Three.js](https://threejs.org/) - Used to render the 3D human body model.

## Acknowledgments

We have taken reference from several official examples from [Evothings EasyBLE](https://evothings.com/doc/examples/examples.html) and [Three.js](https://threejs.org/examples/) to build the Bluetooth communication stack and the 3D model respectively. We give our thanks to the people who created these examples.
