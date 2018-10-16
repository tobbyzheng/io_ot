var avatar = new PIXI.Application({width: 256, height: 256});


onToggleAvatarButton = function() {
    let ele = document.getElementById('avatar-animation');
    if (ele.style.display == "none") {
        ele.style.display = "block";
        document.getElementById('avatar-animation').appendChild(avatar.view);
    } else {
        ele.style.display = "none";
    }
}
