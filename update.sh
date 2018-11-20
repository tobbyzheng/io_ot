#!/bin/bash

cd www
rm -rf *
cp -r ~/EvothingsStudio/MyApps/body_motion/* .
cd ..
echo "contents of www is now updated to: "
ls www
echo "Run 'cordova build android' to build"
