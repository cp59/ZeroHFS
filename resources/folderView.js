window.addEventListener("beforeunload", function (e) {
    var canQuit = true;
    for (var i = 0; i < xhrDoneList.length; i++) {
        if (!xhrDoneList[i]) {
            canQuit = false;
        }
    }
    if (!canQuit) {
        e.preventDefault();
        e.returnValue = '';
    };
});
document.documentElement.ondragover = function (e) {
    e.preventDefault();
    $("#dropFileTipModal").modal("open");
};
document.documentElement.ondragleave = function (e) {
    e.preventDefault();
    $("#dropFileTipModal").modal("close");
};
document.documentElement.addEventListener("drop", function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    $("#dropFileTipModal").modal("close");
    if (ev.dataTransfer) {
        if (ev.dataTransfer.files.length) {
            var formData = new FormData();
            for (var i = 0; i < ev.dataTransfer.files.length; i++) {
                formData.append("file" + i, ev.dataTransfer.files[i]);
            }
            createUploadTask(formData, ev.dataTransfer.files.length + " {{gstr('unitFile')}}", false);
        }
    }
}, true);
$(document).keyup(function (e) {
    if (e.key === "Escape") {
        if (previewMode) {
            closePreviewModal();
        }
    }
});
var currentPath = "";
var reloadFolder = false;
var previewMode = false;
function resize() {
    var path = currentPath.split("/");
    var swidth = $(document).width();
    if (swidth >= 994) {
        document.getElementById("tableBreadcrumbDiv").style.width = swidth - document.getElementById("deskNavAction").clientWidth;
        var cwidth = document.getElementById("deskNavAction").clientWidth + 15;
    } else {
        var cwidth = 150;
    }
    var bdList = document.getElementsByClassName("breadcrumb");
    var pathSideNavList = document.getElementById("pathNavSidenav").getElementsByTagName("li");
    var needShowMoreNavButton = false;
    if (currentPath == "/") {

    } else {
        for (var i = 1; i < path.length + 1; i++) {
            bdList[bdList.length - i].style.display = "inline-block";
            pathSideNavList[i - 1].style.display = "none";
            var rect = bdList[bdList.length - i].getBoundingClientRect();
            var width;
            if (rect.width) {
                width = rect.width;
            } else {
                width = rect.right - rect.left;
            }
            cwidth += width;
            if (cwidth > swidth) {
                bdList[bdList.length - i].style.display = "none";
                pathSideNavList[i - 1].style.display = "block";
                needShowMoreNavButton = true;
            }
        }
    }
    if (needShowMoreNavButton) {
        $("#morePathNavButton").show();
    } else {
        $("#morePathNavButton").hide();
    }
}
$(window).on("resize", resize);
function loadFolder(path) {
    if (path == currentPath && !reloadFolder) {
        return;
    }
    reloadFolder = false;
    $("#tableNewFolderBtn").hide();
    $("#tableUploadBtn").hide();
    $("#tableDownloadFolderBtn").hide();
    $("#mobileUploadLi").hide();
    $("#mobileNewFolderLi").hide();
    $("#mobilDownloadFolderLi").hide();
    currentPath = path;
    history.pushState({}, null, path);
    document.title = path + " - ZeroHFS";
    $("#datatable").dataTable().fnClearTable();
    document.getElementsByClassName("dataTables_empty")[0].innerHTML = "&emsp;&emsp;Loading...";
    {% if current_user.role == "admin" %}
    document.getElementById("tableFilePropertiesBtn").onclick = function () { showFilesOption(path); };
    document.getElementById("mobilePropertiesBtn").getElementsByTagName("a")[0].onclick = function () { showFilesOption(path); };
    {% endif %}
    var tableBreadcrumbDiv = document.getElementById("tableBreadcrumbDiv");
    var pathNavSidenavDiv = document.getElementById("pathNavSidenav");
    var pathSidenavHtml = "";
    var breadcrumbHtml = "";
    tableBreadcrumbDiv.querySelectorAll(".noHref").forEach(function (bc) { bc.remove(); });
    var pathList = path.split("/");
    if (path != "/") {
        breadcrumbHtml += `<a onclick="loadFolder('/')" class="breadcrumb noHref">{{request.host}}</a>`;
        pathSidenavHtml = `<li><a class="waves-effect" onclick="$('#pathNavSidenav').sidenav('close');loadFolder('/')"><i class="material-icons">storage</i>{{request.host}}</a></li>`;
        folderName = pathList.at(-1);
        var currentLoopPath = "";
        for (var i = 1; i < (pathList.length - 1); i++) {
            currentLoopPath += ("/" + pathList[i]);
        }
        var currentLoopPath = "";
        for (var i = 1; i < pathList.length; i++) {
            currentLoopPath += ("/" + pathList[i]);
            breadcrumbHtml += `<a onclick="loadFolder('` + currentLoopPath + `')" class="breadcrumb noHref">` + pathList[i] + `</a>`;
            pathSidenavHtml = `<li><a class="waves-effect" onclick="$('#pathNavSidenav').sidenav('close');loadFolder('` + currentLoopPath + `')"><i class="material-icons">folder</i>` + pathList[i] + `</a></li>` + pathSidenavHtml;
        }
    } else {
        folderName = "{{request.host}}";
        breadcrumbHtml = `<a onclick="loadFolder('/')" class="breadcrumb noHref">{{request.host}}</a>`;
        pathSidenavHtml = `<li><a onclick="loadFolder('/')"{{request.host}}></a></li>`;
    }
    tableBreadcrumbDiv.innerHTML += breadcrumbHtml;
    pathNavSidenavDiv.innerHTML = pathSidenavHtml;
    resize();
    document.getElementById("mobileList").innerHTML = "";
    document.getElementById("mobileList").innerHTML += `
    <li class="collection-item avatar waves-effect mobileFileListItem" id="mobileLoadingLi">
        <i class="material-icons circle blue">autorenew</i>
        <span class="title truncate" style="margin-top: 10px;">Loading...</span>
    </li>`;
    fetch(path + "?format=json")
        .then(function (response) {
            if (response.ok) {
                return response.json();
            } else if (response.status == 401) {
                document.getElementsByClassName("dataTables_empty")[0].innerHTML = "&emsp;&emsp;{{gstr('accessDenied')}}";
                $("#mobileLoadingLi").remove();
                document.getElementById("mobileList").innerHTML += `
                <li class="collection-item avatar waves-effect mobileFileListItem" id="mobileLoadingLi">
                    <i class="material-icons circle blue">do_not_disturb</i>
                    <span class="title truncate" style="margin-top: 10px;">{{gstr("accessDenied")}}</span>
                </li>`;
            } else if (response.status == 404) {
                document.getElementsByClassName("dataTables_empty")[0].innerHTML = "&emsp;&emsp;{{gstr('pathNotFound')}}";
                $("#mobileLoadingLi").remove();
                document.getElementById("mobileList").innerHTML += `
                <li class="collection-item avatar waves-effect mobileFileListItem" id="mobileLoadingLi">
                    <i class="material-icons circle blue">error_outline</i>
                    <span class="title truncate" style="margin-top: 10px;">{{gstr("pathNotFound")}}</span>
                </li>`;
            } else {
                document.getElementsByClassName("dataTables_empty")[0].innerHTML = "&emsp;&emsp;{{gstr('unableToProcessChanges')}}";
                $("#mobileLoadingLi").remove();
                document.getElementById("mobileList").innerHTML += `
                <li class="collection-item avatar waves-effect mobileFileListItem" id="mobileLoadingLi">
                    <i class="material-icons circle blue">error_outline</i>
                    <span class="title truncate" style="margin-top: 10px;">{{gstr("unableToProcessChanges")}}</span>
                </li>`;
            }
        })
        .then(function (jsonResp) {
            if (jsonResp == undefined) {
                return;
            }
            $("#tableDownloadFolderBtn").show();
            $("#mobilDownloadFolderLi").show();
            if (jsonResp.canUpload) {
                $("#tableNewFolderBtn").show();
                $("#tableUploadBtn").show();
                $("#mobileUploadLi").show();
                $("#mobileNewFolderLi").show();
            }
            if ((Object.keys(jsonResp).length - 3) == 0) {
                document.getElementsByClassName("dataTables_empty")[0].innerHTML = "&emsp;&emsp;{{gstr('noFilesInThisFolder')}}";
                document.getElementById("mobileList").innerHTML += `
                <li class="collection-item avatar waves-effect mobileFileListItem">
                    <i class="material-icons circle blue">folder_off</i>
                    <span class="title truncate" style="margin-top: 10px;">{{gstr('noFilesInThisFolder')}}</span>
                </li>
                `;
            }
            var filePaths = Object.keys(jsonResp);
            var filesLength = filePaths.length - 3;
            var mobileListHtml = "";
            for (var i = 0; i < filesLength; i++) {
                var filePath = filePaths[i];
                var fileName = filePath.split("/").at(-1);
                var fileInfo = jsonResp[filePath];
                var fileType = fileInfo.filetype;
                var listForTable = [];
                var fileTypeTranslate = "";
                var divForMobileList = `<li class="collection-item avatar waves-effect mobileFileListItem" id="mobileFileItem` + i + `" onclick='`;
                if (fileType == "video") {
                    fileTypeTranslate = "{{gstr('video')}}";
                    listForTable.push("<i class='material-icons tableItemIcon'>video_file</i>");
                    listForTable.push(`<a path='javascript:previewVideo("` + filePath + `")' fileType="` + fileType + `">` + fileName + `</a>`);
                    divForMobileList += `previewVideo("` + filePath + `")'>
                    <i class="material-icons circle blue">video_file</i>`;
                } else if (fileType == "audio") {
                    fileTypeTranslate = "{{gstr('audio')}}";
                    listForTable.push("<i class='material-icons tableItemIcon'>audio_file</i>");
                    listForTable.push(`<a path='javascript:previewAudio("` + filePath + `")' fileType="` + fileType + `">` + fileName + `</a>`);
                    divForMobileList += `previewAudio("` + filePath + `")'>
                    <i class="material-icons circle blue">audio_file</i>`;
                } else if (fileType == "image") {
                    fileTypeTranslate = "{{gstr('image')}}";
                    listForTable.push("<i class='material-icons tableItemIcon'>image</i>");
                    listForTable.push(`<a path='javascript:previewImage("` + filePath + `")' fileType="` + fileType + `">` + fileName + `</a>`);
                    divForMobileList += `previewImage("` + filePath + `")'>
                    <i class="material-icons circle blue">image</i>`;
                } else if (fileType == "plainTextDocument") {
                    fileTypeTranslate = "{{gstr('plainTextDocument')}}";
                    listForTable.push("<i class='material-icons tableItemIcon'>description</i>");
                    listForTable.push(`<a path='javascript:previewTextFile("` + filePath + `")' fileType="` + fileType + `">` + fileName + `</a>`);
                    divForMobileList += `previewTextFile("` + filePath + `")'>
                    <i class="material-icons circle blue">description</i>`;
                } else if (fileType == "folder") {
                    fileTypeTranslate = "{{gstr('folder')}}";
                    listForTable.push("<i class='material-icons tableItemIcon'>folder</i>");
                    listForTable.push(`<a path='javascript:loadFolder("` + filePath + `")' fileType="` + fileType + `">` + fileName + `</a>`);
                    divForMobileList += `loadFolder("` + filePath + `")'>
                    <i class="material-icons circle blue">folder</i>`;
                } else {
                    fileTypeTranslate = "{{gstr('file')}}";
                    listForTable.push("<i class='material-icons tableItemIcon'>insert_drive_file</i>");
                    listForTable.push(`<a path="` + filePath + `")' fileType="` + fileType + `">` + fileName + `</a>`);
                    divForMobileList += `location.href="` + filePath + `"'>
                    <i class="material-icons circle blue">insert_drive_file</i>`;
                }
                divForMobileList += `
                    <span class="title truncate" style="margin-right: 30px;">`+ fileName + `</span>
                    <p style="margin-right:30px">`+ fileInfo.modifyTime + `&nbsp;
                    `+ fileTypeTranslate + `&nbsp;
                    `+ fileInfo.filesize + `
                    </p>
                `;
                listForTable.push(fileInfo.modifyTime);
                listForTable.push(fileTypeTranslate);
                listForTable.push(fileInfo.filesize);
                if (fileType == "folder") {
                    listForTable.push(`<a class="waves-effect waves-light btn noHref" onclick="javascript:showFilesOption('` + filePath + `',true)"><i class="material-icons" style="color: white ;">more_vert</i></a>`);
                    divForMobileList += `
                        <a onclick="document.getElementById('mobileFileItem`+ i + `')._onclick = document.getElementById('mobileFileItem` + i + `').onclick;document.getElementById('mobileFileItem` + i + `').onclick = null;showFilesOption('` + filePath + `',true,` + i + `);"class="secondary-content waves-effect btn noHref" style="padding-left: 5px;padding-right:5px;"><i class="material-icons">more_vert</i></a>
                    </li>`;
                } else {
                    listForTable.push(`<a class="waves-effect waves-light btn noHref" onclick="javascript:showFilesOption('` + filePath + `',false)"><i class="material-icons" style="color: white ;">more_vert</i></a>`);
                    divForMobileList += `
                    <a onclick="document.getElementById('mobileFileItem`+ i + `')._onclick = document.getElementById('mobileFileItem` + i + `').onclick;document.getElementById('mobileFileItem` + i + `').onclick = null;showFilesOption('` + filePath + `',false,` + i + `);"class="secondary-content waves-effect btn noHref" style="padding-left: 5px;padding-right:5px;"><i class="material-icons">more_vert</i></a>
                    </li>`;
                }
                $("#datatable").dataTable().fnAddData(listForTable, false);
                mobileListHtml += divForMobileList;
            }
            $("#datatable").dataTable().fnDraw();
            document.getElementById("mobileList").innerHTML += mobileListHtml;
            $("#mobileLoadingLi").remove();
        })
        .catch(function (e) {
            document.getElementsByClassName("dataTables_empty")[0].innerHTML = "&emsp;&emsp;{{gstr('unableToProcessChanges')}}";
            $("#mobileLoadingLi").remove();
            document.getElementById("mobileList").innerHTML += `
                <li class="collection-item avatar waves-effect mobileFileListItem" id="mobileLoadingLi">
                    <i class="material-icons circle blue">error_outline</i>
                    <span class="title truncate" style="margin-top: 10px;">{{gstr("unableToProcessChanges")}}</span>
                </li>`;
        });
}
function setupPreview(file, frameCode) {
    previewMode = true;
    filename = file.split("/")[file.split("/").length - 1];
    document.getElementById("previewModalDownloadBtn").setAttribute("href", file);
    document.getElementById("previewModalShareBtn").setAttribute("onclick", "openShareModal('" + file + "')");
    document.getElementById("previewModalFilenameLabel").innerHTML = filename;
    document.getElementById("previewFrame").innerHTML = frameCode;
    $("#newPreviewModal").fadeIn(200);
}
function closePreviewModal() {
    previewMode = false;
    document.getElementById("previewFrame").innerHTML = "";
    $("#newPreviewModal").fadeOut(200);
}
function previewVideo(file) {
    setupPreview(file, `
<video style='max-width:100%;max-height:100%;' controls autoplay>
<source src="`+ file + `" type="video/mp4">
Your browser does not support the video tag.
</video>
    `);
}
function previewAudio(file) {
    setupPreview(file, `
<audio style='width:calc(100% - 20px)' controls autoplay>
<source src="`+ file + `" type="audio/mp3">
Your browser does not support the audio tag.
</video>
    `);
}
function previewImage(file) {
    setupPreview(file, "<img style='max-width:100%;max-height:100%;' src='" + file + "'/>");
    $('.materialboxed').materialbox();
}
function previewTextFile(file) {
    setupPreview(file, "");
    fetch(file).then(resp => resp.text()).then(resp => {
        document.getElementById("previewFrame").innerHTML = `<textarea style="resize:none;background-color:white;height: calc(100% - 64px);" readonly>` + resp + `</textarea>`;
    });
}
function fullscreen() {
    var isInFullScreen = (document.fullscreenElement && document.fullscreenElement !== null) ||
        (document.webkitFullscreenElement && document.webkitFullscreenElement !== null) ||
        (document.mozFullScreenElement && document.mozFullScreenElement !== null) ||
        (document.msFullscreenElement && document.msFullscreenElement !== null);

    var docElm = document.documentElement;
    if (!isInFullScreen) {
        if (docElm.requestFullscreen) {
            docElm.requestFullscreen();
        } else if (docElm.mozRequestFullScreen) {
            docElm.mozRequestFullScreen();
        } else if (docElm.webkitRequestFullScreen) {
            docElm.webkitRequestFullScreen();
        } else if (docElm.msRequestFullscreen) {
            docElm.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}
function mobileCopyTable() {
    $('#filesOptionsMenu').sidenav('close');
    $("#largeTable").removeClass("hide-on-med-and-down");
    $('.buttons-copy').click();
    $("#largeTable").addClass("hide-on-med-and-down");
}
function openShareModal(url) {
    surl = "{{request.host_url}}" + url.substring(1);
    document.getElementById("copyUrlInput").value = surl;
    document.getElementById("shareToFacebookBtn").setAttribute("href", "https://www.facebook.com/sharer.php?u=" + surl);
    document.getElementById("shareToRedditBtn").setAttribute("href", "https://reddit.com/submit?url=" + surl);
    document.getElementById("shareToTwitterBtn").setAttribute("href", "https://twitter.com/share?url=" + surl);
    $("#shareQrc").html("");
    $("#shareQrc").qrcode(surl);
    $("#previewModal").modal("close");
    $("#shareModal").modal("open");
}
function copyShareUrl() {
    var copyUrlInput = document.getElementById("copyUrlInput");
    copyUrlInput.select();
    document.execCommand("copy");
    var copyUrl = copyUrlInput.value;
    copyUrlInput.value = "";
    copyUrlInput.value = copyUrl;
    document.getElementById("copyShareUrlBtn").innerHTML = "<i class='material-icons center'>done</i>";
    document.getElementById("copyShareUrlBtn").classList.add("green");
    setTimeout(function () {
        document.getElementById("copyShareUrlBtn").innerHTML = "<i class='material-icons center'>content_copy</i>";
        document.getElementById("copyShareUrlBtn").classList.remove("green");
    }, 2000);
}
var newUploadIndex = 0;
var xhrDoneList = [];
var xhrList = [];
function sizeof_fmt(bytes, decimals = "2") {
    if (bytes == 0) return '0 Bytes';
    var k = 1024,
        dm = decimals || 2,
        sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
function upload() {
    $("#uploadSidenav").sidenav("close");
    var inputFile = document.getElementById("tableUploadInput");
    var formData = new FormData();
    for (var i = 0; i < inputFile.files.length; i++) {
        var file = inputFile.files[i];
        formData.append("file" + i, file);
    }
    if (inputFile.files.length == 1) {
        createUploadTask(formData, inputFile.files[0].name, false);
    } else {
        createUploadTask(formData, inputFile.files.length + " {{gstr('unitFile')}}", false);
    }
    inputFile.value = '';
}
function uploadFolder() {
    var inputFolder = document.getElementById("tableUploadFolderInput");
    var formData = new FormData();
    var filePathList = [];
    for (var i = 0; i < inputFolder.files.length; i++) {
        var file = inputFolder.files[i];
        formData.append("file" + i, file);
        filePathList.push(file.webkitRelativePath);
    }
    formData.append("filePathList", JSON.stringify(filePathList));
    createUploadTask(formData, inputFolder.files[0].webkitRelativePath.split("/")[0], true);
    inputFolder.value = '';

}
function sizeof_fmt(bytes, decimals = "2") {
    if (bytes == 0) return '0 Bytes';
    var k = 1024,
        dm = decimals || 2,
        sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
function uploadCloseBtnClicked(cid) {
    var clickedId = parseInt(cid.substring(18));
    if (xhrDoneList[clickedId]) {
        $("#uploadTask" + clickedId).animate({ opacity: 0 }, {
            duration: 200, complete: function () {
                var h = parseInt(document.getElementById("uploadTask" + clickedId).clientHeight);
                $("#uploadTask" + clickedId).html("");
                document.getElementById("uploadTask" + clickedId).style.height = h + "px";
                $("#uploadTask" + clickedId).animate({ height: 0, margin: 0 }, {
                    duration: 200, complete: function () {
                        $("#uploadTask" + clickedId).remove();
                        if (document.getElementsByClassName("uploadTaskCard").length == 0) {
                            $("#upload-task-card").fadeOut(300);
                        }
                    }
                });
            }
        });
    } else {
        xhrList[clickedId].abort();
    }
}
function createUploadTask(formData, fname, uploadFolder) {
    $('#upload-task-card').fadeIn(300);
    var currentUploadTask = newUploadIndex;
    var uploadPath = currentPath;
    document.getElementById("uploadTaskCardContent").innerHTML += `
    <div class="card uploadTaskCard" id="uploadTask`+ newUploadIndex + `">
      <div class="card-content">
        <h6 style="display:inline-block;margin-top:5px;" class="truncate">`+ fname + `</h6>
        <a style="display: inline-block;margin-bottom: 5px;" class="btn-flat waves-effect right" id="uploadTaskCloseBtn`+ currentUploadTask + `" onclick="uploadCloseBtnClicked(this.id)"><i class="material-icons center">close</i></a>
        <span style="
        display: block;
        line-height: 5px;
    " id="uploadStatusLabel`+ newUploadIndex + `"></span>
      </div>
      <div class="progress">
          <div id="uploadProgress`+ newUploadIndex + `" class="determinate" style="width: 0%"></div>
        </div>  
    </div>`;
    document.getElementById("uploadTaskCardContent").innerHTML += `
    <div id="animateUploadTask`+ newUploadIndex + `" style="height:0px"></div>
    `;
    $("#animateUploadTask" + newUploadIndex).animate({ height: document.getElementById("uploadTask" + newUploadIndex).clientHeight + 20 + "px" }, {
        duration: 200, complete: function () {
            $("#animateUploadTask" + currentUploadTask).remove();
            $("#uploadTask" + currentUploadTask).fadeIn(200);
        }
    });
    $("#uploadTask" + newUploadIndex).hide();

    var xhr = new XMLHttpRequest();
    xhrList[currentUploadTask] = xhr;
    xhrDoneList[currentUploadTask] = false;
    xhr.upload.addEventListener("progress", function (event) {
        var statusText = "";
        var percent = (event.loaded / event.total) * 100;
        statusText += Math.round(percent) + "% | " + sizeof_fmt(event.loaded) + "/" + sizeof_fmt(event.total);
        document.getElementById("uploadProgress" + currentUploadTask).style.width = (percent + "%");
        $("#uploadStatusLabel" + currentUploadTask).text(statusText);
    }, false);
    xhr.addEventListener("load", function (event) {
        xhrDoneList[currentUploadTask] = true;
        if (xhr.status == 403) {
            $("#uploadStatusLabel" + currentUploadTask).text("{{gstr('noPermissionToDo')}}");
            document.getElementById("uploadProgress" + currentUploadTask).classList.add("red");
        } else if (xhr.status == 200) {
            $("#uploadStatusLabel" + currentUploadTask).text(event.target.responseText);
            document.getElementById("uploadProgress" + currentUploadTask).classList.add("green");
        } else {
            $("#uploadStatusLabel" + currentUploadTask).text("{{gstr('uploadFailed')}}");
            document.getElementById("uploadProgress" + currentUploadTask).classList.add("red");
        }
        if (currentPath == uploadPath) {
            reloadFolder = true;
            loadFolder(currentPath);
        }
    }, false);
    xhr.addEventListener("error", function (event) {
        xhrDoneList[currentUploadTask] = true;
        $("#uploadStatusLabel" + currentUploadTask).text("{{gstr('uploadFailed')}}");
        document.getElementById("uploadProgress" + currentUploadTask).style.width = ("100%");
        document.getElementById("uploadProgress" + currentUploadTask).classList.add("red");
    }, false);
    xhr.addEventListener("abort", function (event) {
        xhrDoneList[currentUploadTask] = true;
        $("#uploadStatusLabel" + currentUploadTask).text("{{gstr('uploadFailed')}}");
        document.getElementById("uploadProgress" + currentUploadTask).style.width = ("100%");
        document.getElementById("uploadProgress" + currentUploadTask).classList.add("red");
    }, false);
    //xhr.addEventListener("abort", abortHandler, false);
    if (uploadFolder) {
        xhr.open("POST", "?action=uploadFolder");
    } else {
        xhr.open("POST", "?action=upload");
    }
    xhr.setRequestHeader("X-CSRFToken", " {{ csrf_token() }}");
    xhr.send(formData);
    newUploadIndex++;
}
function newFolder() {
    $("#newFolderModal").modal("close");
    $("#loadOptionsModal").modal("open");
    var formData = new FormData();
    formData.append("newFolderName", document.getElementById("newFolderName").value);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "?action=newFolder");
    xhr.setRequestHeader("X-CSRFToken", "{{ csrf_token() }}");
    xhr.addEventListener("load", function (event) {
        $("#loadOptionsModal").modal("close");
        if (xhr.status == 200) {
            document.getElementById("newFolderName").value = "";
        } else {
            $("#newFolderModal").modal("open");
            alert("{{gstr('unableToProcessChanges')}}");
        }
        reloadFolder = true;
        loadFolder(currentPath);
    });
    xhr.addEventListener("error", function (e) {
        $("#loadOptionsModal").modal("close");
        $("#newFolderModal").modal("open");
        alert("{{gstr('unableToProcessChanges')}}");
        reloadFolder = true;
        loadFolder(currentPath);
    });
    xhr.send(formData);
}
function deleteItem(path) {
    $("#filesOptionModal").modal("close");
    $("#loadOptionsModal").modal("open");
    var xhr = new XMLHttpRequest();
    xhr.open("POST", path + "?action=delete");
    xhr.setRequestHeader("X-CSRFToken", "{{ csrf_token() }}");
    xhr.addEventListener("load", function (event) {
        $("#loadOptionsModal").modal("close");
        if (xhr.status != 200) {
            alert("{{gstr('unableToProcessChanges')}}");
        }
        reloadFolder = true;
        loadFolder(currentPath);
    });
    xhr.addEventListener("error", function (e) {
        $("#loadOptionsModal").modal("close");
        alert("{{gstr('unableToProcessChanges')}}");
        reloadFolder = true;
        loadFolder(currentPath);
    });
    xhr.send();
}
function showFilesOption(file, checkUpload = true, mobileIndex = undefined) {
    $('#filesOptionsMenu').sidenav('close');
    $("#loadOptionsModal").modal("open");
    if (file.split("/")[file.split("/").length - 1] == "") {
        $("#filesOptionModalFilename").text("{{request.host}}");
    } else {
        $("#filesOptionModalFilename").text(file.split("/")[file.split("/").length - 1]);
    }

    {% if current_user.role == "admin" %}
    document.getElementById("canAccessUsersSelectWidget").innerHTML = "";
    document.getElementById("canUploadUsersSelectWidget").innerHTML = "";
    document.getElementById("canDeleteUsersSelectWidget").innerHTML = "";
    $("#filesOptionForm").attr("action", file + "?action=setFilesOptions");
    $("#removePermissionSettingForm").attr("action", file + "?action=removeFilesOptions");
    fetch(file + "?action=getUserPermission", { headers: { 'Cache-Control': 'no-cache' } })
        .then(resp => resp.json()).then(resp => {
            if (resp["{{current_user.id}}"].canDelete) {
                $("#deleteFilesLi").show();
                document.getElementById("deleteBtn").onclick = function () { deleteItem(file); };
            } else {
                $("#deleteFilesLi").hide();
            }
            resp[0].userName = "{{gstr('guest')}}";
            for (var i = 0; i < resp.length; i++) {
                var userPermission = resp[i];
                var uid = userPermission.userId;
                if (userPermission.canAccess) {
                    document.getElementById("canAccessUsersSelectWidget").innerHTML += `<p><label><input type="checkbox" class="filled-in" checked="checked" name="accessUser` + uid + `"/><span>` + userPermission.userName + `</span></label></p>`;
                } else {
                    document.getElementById("canAccessUsersSelectWidget").innerHTML += `<p><label><input type="checkbox" class="filled-in" name="accessUser` + uid + `"/><span>` + userPermission.userName + `</span></label></p>`;
                }
                if (checkUpload) {
                    $("#canUploadUsersSelectWidgetLi").show();
                    if (userPermission.canUpload) {
                        document.getElementById("canUploadUsersSelectWidget").innerHTML += `<p><label><input type="checkbox" class="filled-in" checked="checked" name="uploadUser` + uid + `"/><span>` + userPermission.userName + `</span></label></p>`;
                    } else {
                        document.getElementById("canUploadUsersSelectWidget").innerHTML += `<p><label><input type="checkbox" class="filled-in" name="uploadUser` + uid + `"/><span>` + userPermission.userName + `</span></label></p>`;
                    }
                } else {
                    $("#canUploadUsersSelectWidgetLi").hide();
                }
                if (userPermission.canDelete) {
                    document.getElementById("canDeleteUsersSelectWidget").innerHTML += `<p><label><input type="checkbox" class="filled-in" checked="checked" name="deleteUser` + uid + `"/><span>` + userPermission.userName + `</span></label></p>`;
                } else {
                    document.getElementById("canDeleteUsersSelectWidget").innerHTML += `<p><label><input type="checkbox" class="filled-in" name="deleteUser` + uid + `"/><span>` + userPermission.userName + `</span></label></p>`;
                }
            }
            $("#loadOptionsModal").modal("close");
            $("#filesOptionModal").modal("open");
        });
    {% else %}
    $("#canAccessUsersSelectWidgetLi").hide();
    $("#canUploadUsersSelectWidgetLi").hide();
    $("#canDeleteUsersSelectWidgetLi").hide();
    $("#filesOptionModalFooter").hide();
    fetch(file + "?action=canDelete").then(resp => resp.text()).then(resp => {
        if (resp == "1") {
            $("#deleteFilesLi").show();
            document.getElementById("deleteBtn").onclick = function () { deleteItem(file); };
        } else {
            $("#deleteFilesLi").hide();
        }
        $("#loadOptionsModal").modal("close");
        $("#filesOptionModal").modal("open");
    });
    {% endif %}
    if (mobileIndex != undefined) {
        setTimeout(() => {
            document.getElementById("mobileFileItem" + mobileIndex).onclick = document.getElementById("mobileFileItem" + mobileIndex)._onclick;
        }, 10);
    }
}
$(window).on('popstate', function (e) {
    loadFolder(decodeURI(window.location.pathname));
});