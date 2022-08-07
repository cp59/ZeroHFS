import os
import time
os.system("title ZeroHFS HttpFileServer")
os.system('cls' if os.name == 'nt' else 'clear')
print('''
 ______              _    _ ______ _____ 
|___  /             | |  | |  ____/ ____|
   / / ___ _ __ ___ | |__| | |__ | (___  
  / / / _ \ '__/ _ \|  __  |  __| \___ \ 
 / /_|  __/ | | (_) | |  | | |    ____) |
/_____\___|_|  \___/|_|  |_|_|   |_____/ 
================================================================
Version: 0.5.0.5 (Insider Edition)
Author:ZeroApp Technology Inc.
Powerd by Python3 Flask Flask-Login Werkzeug Flask-WTF Flask-CORS
================================================================
Importing modules...''')
from flask import Flask,render_template,request,send_file,render_template_string,redirect,flash,abort,session
from flask_login import LoginManager,login_user,logout_user,current_user,UserMixin,AnonymousUserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from flask_wtf.csrf import CSRFProtect,CSRFError
from datetime import datetime as dt
from flask_cors import CORS
from threading import Thread
import PIL.Image as Image
from glob import glob
import pathlib
import zipfile
import random
import string
import json
import shutil
print("================================================================")
print("Setting up server...")
users=[]
configs=[]
folderInfo=[]
filetypes=[]
loginSessionLists={}
rpath=""
def getRealPath(path):
    if path[-1]=="/" and path!="/":
        path=path[:-1]
    return os.path.join(rpath,path[1:])
def reloadData():
    global users,configs,folderInfo,filetypes,rpath,loginSessionLists
    users=json.load(open("configs/users.json","r",encoding="utf-8"))
    configs=json.load(open("configs/configs.json","r",encoding="utf-8"))
    folderInfo=json.load(open("configs/folderInfo.json","r",encoding="utf-8"))
    loginSessionLists=json.load(open("configs/loginSessions.json","r",encoding="utf-8"))
    filetypes=configs["canPreviewFileTypes"]
    rpath=configs["rootPath"]
reloadData()
for f in glob(os.path.join(configs["folderArchivePath"],"*")):
    os.remove(f)
class guestUser(AnonymousUserMixin):
    id=0
    role="guest"
app=Flask("main",static_url_path='',static_folder=rpath)
app._static_folder = rpath
app.config["SECRET_KEY"]=configs["webServer"]["secretKey"]
csrf = CSRFProtect(app)
login_manager = LoginManager()
login_manager.anonymous_user = guestUser
login_manager.init_app(app)
CORS(app)
class User(UserMixin):
    pass
@login_manager.user_loader
def load_user(user_id):
    loginSession = session.get("loginSession","")
    if loginSession not in loginSessionLists:
        session.pop("loginSession",None)
        return guestUser()
    if str(loginSessionLists[loginSession]["userId"]) not in users.keys():
        return guestUser()
    userData=users[str(loginSessionLists[loginSession]["userId"])]
    user=User()
    user.id=int(loginSessionLists[loginSession]["userId"])
    user.role=userData["role"]
    user.name=userData["name"]
    return user
supportLang=json.load(open("translates/supportLang.json",encoding="utf-8"))
langData={}
for lang in supportLang:
    langData[lang]=json.load(open("translates/"+lang+".json",encoding="utf-8"))
def gstr(strid):
    userLang=request.cookies.get("lang")
    if userLang==None or userLang not in supportLang.keys():
        userLang=request.accept_languages.best_match(supportLang.keys(),"en_US")
    return langData[userLang][strid]
def sizeof_fmt(num, suffix="B"):
    for unit in ["", "Ki", "Mi", "Gi", "Ti", "Pi", "Ei", "Zi"]:
        if abs(num) < 1024.0:
            return f"{num:3.1f}{unit}{suffix}"
        num /= 1024.0
    return f"{num:.1f}Yi{suffix}"
def getBestFolderInfo(path):
    needCheckList=[]
    for finfo in folderInfo:
        if finfo=="/":
            if (path+"/").startswith(finfo):
                needCheckList.append(finfo)
        else:
            if (path+"/").startswith(finfo+"/"):
                needCheckList.append(finfo)
    if needCheckList!=[]:
        return folderInfo[max(needCheckList, key=len)]
    else:
        return None
def checkUserCanAccess(path,userId=None):
    if userId==None:
        userId=current_user.id
    bestFolderInfo=getBestFolderInfo(path)
    if bestFolderInfo!=None:
        return userId in bestFolderInfo["canAccessUsers"]
    else:
        return True
def checkUserCanUpload(path,userId=None):
    if userId==None:
        userId=current_user.id
    bestFolderInfo=getBestFolderInfo(path)
    if bestFolderInfo!=None:
        return userId in bestFolderInfo["canUploadUsers"]
    else:
        return False
def checkUserCanDelete(path,userId=None):
    if userId==None:
        userId=current_user.id
    bestFolderInfo=getBestFolderInfo(path)
    if bestFolderInfo!=None:
        return userId in bestFolderInfo["canDeleteUsers"]
    else:
        return False
def isfolder(path):
    return os.path.isdir(getRealPath(path))
app.jinja_env.globals.update(gstr=gstr,supportLang=supportLang,getfilename=os.path.basename,isfolder=isfolder,checkUserCanAccess=checkUserCanAccess,checkUserCanUpload=checkUserCanUpload,serverName=configs["serverName"],grid=random.randint)
@app.errorhandler(400)
def handle_csrf_error(e):
    return render_template("400.html"), 400
@app.errorhandler(401)
def custom_401(error):
    return render_template("401.html"),401
@app.errorhandler(CSRFError)
def handle_csrf_error(e):
    return render_template("400.html"), 400
@app.errorhandler(404)
def custom_404(error):
    return render_template("404.html"),404
downloadFolderProcess={}
def newDownloadFolderProcess(doId,path,zipfilepath):
    global downloadFolderProcess
    downloadFolderProcess[doId]={"totalSize":0,"currentDoSize":0,"total":0,"currentZip":0,"zipFilePath":zipfilepath,"doId":doId,"stop":False,"folderPath":path}
    archive=zipfile.ZipFile(zipfilepath, mode="w")
    currentDoCount=0
    currentDoSize=0
    realPath=getRealPath(path)
    gr=glob(realPath+"/**/*", recursive=True)
    total=len(gr)
    fileSizeList=[os.stat(f).st_size for f in gr]
    downloadFolderProcess[doId]={"totalSize":sum(fileSizeList),"currentDoSize":currentDoSize,"total":total,"currentZip":currentDoCount,"zipFilePath":zipfilepath,"doId":doId,"stop":False,"folderPath":path}
    for fp in gr:
        archive.write(fp, arcname=fp.replace(realPath, ""))
        if downloadFolderProcess[doId]["stop"]==True:
            archive.close()
            os.remove(zipfilepath)
            downloadFolderProcess.pop(doId)
            break
        currentDoSize+=fileSizeList[currentDoCount]
        currentDoCount+=1
        downloadFolderProcess[doId]={"totalSize":sum(fileSizeList),"currentDoSize":currentDoSize,"total":total,"currentZip":currentDoCount,"zipFilePath":zipfilepath,"doId":doId,"stop":False,"folderPath":path}
    archive.close()
def getFolderSize(path):
    if os.path.isdir(getRealPath(path))==False:
        return "error"
    root_directory = pathlib.Path(getRealPath(path))
    return sizeof_fmt(sum(f.stat().st_size for f in root_directory.glob('**/*') if f.is_file()))
def login(usrList,rememberMe=False):
    session.permanent = rememberMe
    loginSession="".join([random.choice(string.ascii_letters + string.digits) for n in range(128)])
    session["loginSession"]=loginSession
    loginSessionLists[loginSession]={"userId":usrList["userId"]}
    open("configs/loginSessions.json","w",encoding="utf-8").write(json.dumps(loginSessionLists))
    reloadData()
    userClass=User()
    userClass.id=usrList["userId"]
    userClass.name=usrList["name"]
    login_user(userClass,remember=rememberMe)
oneTimeAccess={}
@app.before_request
def before_req():
    reqPath=request.path
    if reqPath[-1]=="/" and reqPath!="/":
        reqPath=reqPath[:-1]
    freqpath=os.path.join(rpath,reqPath[1:])
    account=request.args.get("account",None)
    password=request.args.get("password",None)
    isLoginByArgs=False
    if account!=None and password!=None:
        for user in users:
            if users[user]["name"]==account and check_password_hash(users[user]["password"],password):
                login(users[user])
                isLoginByArgs=True
        if isLoginByArgs==False:
            return json.dumps({"status":"error","msg":"login failed"})
    elif account=="0" and password==None:
        logout_user()
    else:
        csrf.protect()
    action=request.args.get("action",None)
    global downloadFolderProcess
    canUpload=False
    canDelete=False
    if action=="getResource":
        rfile=request.args.get("rname","")
        if os.path.isfile("resources/"+rfile)==False:
            return "Not Found"
        if rfile in "materialize.min.css":
            return send_file("resources/materialize.min.css")
        if rfile in "script.js":
            return render_template_string(open("resources/"+rfile,encoding="utf-8").read())
        return send_file("resources/"+rfile)
    elif action=="getOneTimeAccessToken":
        if checkUserCanAccess(reqPath):
            accessToken="".join(random.sample(string.ascii_letters + string.digits, 32))
            if isLoginByArgs:
                oneTimeAccess[accessToken]={"path":reqPath,"expire":time.time()+300,"userId":current_user.id}
            else:
                oneTimeAccess[accessToken]={"path":reqPath,"expire":time.time()+300,"userId":0}
        else:
            return abort(401)
        return accessToken
    elif action=="upload":
        if os.path.isdir(freqpath)==False:
            return abort(404)
        canUpload=checkUserCanUpload(reqPath)
        if canUpload==False:
            flash(gstr("noPermissionToDo"),category="error")
            return redirect(reqPath)
        if request.method=="POST":
            if request.files:
                file=request.files
                if file!=[]:
                    for file in file.values():    
                        filename=file.filename
                        if filename=="":
                            return gstr("noFileSelected")
                        if os.path.exists(os.path.join(freqpath+filename)):
                            return gstr("fileExists")
                        file.save(os.path.join(freqpath,filename))
                    return gstr("uploadSuccess")
            return gstr("noFileSelected")
        return render_template("upload.html",path=reqPath)
    elif action=="uploadFolder":
        if os.path.isdir(freqpath)==False:
            return abort(404)
        canUpload=checkUserCanUpload(reqPath)
        if canUpload==False:
            flash(gstr("noPermissionToDo"),category="error")
            return redirect(reqPath)
        if request.method=="POST":
            pathList=json.loads(request.form.get("filePathList",""))
            if request.files:
                file=request.files
                if file!=[]:
                    findex=0
                    for file in file.values():
                        cpath=""
                        for fpath in os.path.dirname(pathList[findex]).split("/"):
                            cpath+=fpath+"/"
                            if os.path.isdir(os.path.join(freqpath,cpath))==False:
                                os.mkdir(os.path.join(freqpath,cpath))
                        file.save(os.path.join(freqpath,pathList[findex]))
                        findex+=1
                    return gstr("uploadSuccess")
            return gstr("noFileSelected")
        return render_template("uploadFolder.html",path=reqPath)
    elif action=="download":
        if checkUserCanAccess(reqPath)==False:
            return abort(401)
        if os.path.isdir(freqpath)==False:
            return abort(404)
        doId="".join(random.choice(string.ascii_letters+string.digits) for _ in range(10))
        zipfilepath=os.path.join(configs["folderArchivePath"],reqPath.split("/")[-1]+dt.now().strftime("-%Y-%m-%d-%H-%M-%S")+".zip")
        Thread(target=newDownloadFolderProcess,args=(doId,reqPath,zipfilepath)).start()
        return render_template("downloadFolder.html",doId=doId)
    elif action=="cancelFolderDownload":
        doId=request.args.get("doId","")
        if doId not in downloadFolderProcess.keys():
            return abort(400)
        oldDownloadFolderProcess=downloadFolderProcess[doId]
        downloadFolderProcess[doId]["stop"]=True
        return redirect(oldDownloadFolderProcess["folderPath"])
    elif action=="getFolderDownloadProgress":
        doId=request.args.get("doId","")
        if doId not in downloadFolderProcess.keys():
            return json.dumps({"status":"error"})
        return json.dumps(downloadFolderProcess[doId])
    elif action=="getFolderZip":
        doId=request.args.get("doId","")
        if doId not in downloadFolderProcess.keys():
            return abort(400)
        zipFilePath=downloadFolderProcess[doId]["zipFilePath"]
        downloadFolderProcess.pop(doId)
        return send_file(zipFilePath,as_attachment=True)
    elif action=="login":
        next=request.args.get("next","/")
        if current_user.is_authenticated:
            return redirect(next)
        if request.method=="POST":
            formUser=request.form.get("username")
            password=request.form.get("password")
            for user in users:
                if users[user]["name"]==formUser and check_password_hash(users[user]["password"],password):
                    login(users[user],request.form.get("rememberMe",False))
                    return redirect(next)
            flash(gstr("loginFailed"),category="error")
            return render_template("login.html",next=next)
        return render_template("login.html",next=next)
    elif action=="logout":
        if session.get("loginSession","") in loginSessionLists.keys():
            loginSessionLists.pop(session.get("loginSession",""))
            open("configs/loginSessions.json","w").write(json.dumps(loginSessionLists))
            reloadData()
            session.pop("loginSession")
        logout_user()
        return redirect(request.args.get("next","/"))
    elif action=="checkUserCanAccess":
        if current_user.is_authenticated==False:
            return abort(401)
        if current_user.role!="admin":
            return abort(401)
        checkUserId=request.args.get("userId",current_user.id)
        try:
            checkUserId=checkUserId.split(",")
            r=[]
            for user in checkUserId:
               r.append(checkUserCanAccess(reqPath,int(user)))
            return json.dumps(r)
        except:
            return str(int(checkUserCanAccess(reqPath)))
    elif action=="checkUserCanUpload":
        if current_user.is_authenticated==False:
            return abort(401)
        if current_user.role!="admin":
            return abort(401)
        checkUserId=request.args.get("userId",current_user.id)
        try:
            checkUserId=checkUserId.split(",")
            r=[]
            for user in checkUserId:
               r.append(checkUserCanUpload(reqPath,int(user)))
            return json.dumps(r)
        except:
            return str(int(checkUserCanUpload(reqPath)))
    elif action=="checkUserCanDelete":
        if current_user.is_authenticated==False:
            return abort(401)
        if current_user.role!="admin":
            return abort(401)
        checkUserId=request.args.get("userId",current_user.id)
        try:
            checkUserId=checkUserId.split(",")
            r=[]
            for user in checkUserId:
               r.append(checkUserCanDelete(reqPath,int(user)))
            return json.dumps(r)
        except:
            return str(int(checkUserCanDelete(reqPath)))
    elif action=="delete":
        if request.method=="POST":
            if checkUserCanDelete(reqPath):
                if os.path.isdir(freqpath):
                    shutil.rmtree(freqpath)
                elif os.path.isfile(freqpath):
                    os.remove(freqpath)
                else:
                    return abort(404)
                if request.args.get("format","web")=="json":
                    return json.dumps({"status":"success"})
                if "/".join(reqPath.split("/")[:-1])=="":
                    return redirect("/")
                return redirect("/".join(reqPath.split("/")[:-1]))
            else:
                flash(gstr("noPermissionToDo"),category="error")
                return redirect(reqPath)
    elif action=="newFolder":
        if request.method=="POST":
            if checkUserCanUpload(reqPath):
                if os.path.isdir(freqpath)==False:
                    return abort(404)
                newFolderName=request.form.get("newFolderName",request.args.get("newFolderName",""))
                os.mkdir(os.path.join(freqpath,newFolderName))
                if request.args.get("format","web")=="json":
                    return json.dumps({"status":"success"})
                return redirect(reqPath)
            else:
                flash(gstr("noPermissionToDo"),category="error")
                return redirect(reqPath)
    elif action=="setFilesOptions":
        if current_user.is_authenticated==False:
            return redirect("/?action=login&next="+request.path)
        if current_user.role!="admin":
            return abort(401)
        canAccessUsers=[]
        canUploadUsers=[]
        canDeleteUsers=[]
        for user in users:
            if request.form.get('accessUser'+user):
                canAccessUsers.append(int(user))
            if request.form.get('uploadUser'+user):
                canUploadUsers.append(int(user))
            if request.form.get('deleteUser'+user):
                canDeleteUsers.append(int(user))
        if reqPath not in folderInfo:
            folderInfo[reqPath]={}
        folderInfo[reqPath]["canAccessUsers"]=canAccessUsers
        folderInfo[reqPath]["canUploadUsers"]=canUploadUsers
        folderInfo[reqPath]["canDeleteUsers"]=canDeleteUsers
        open("configs/folderInfo.json","w").write(json.dumps(folderInfo))
        reloadData()
        if os.path.isfile(freqpath):
            return redirect("/".join(request.path.split("/")[:-1]))
        return redirect(request.path)
    elif action=="adminDeleteAccount":
        if request.method=="POST":
            if current_user.is_authenticated==False:
                return redirect("/?action=login&next={}?action=adminManageAccount".format(reqPath))
            if current_user.role!="admin":
                return abort(401)
            if request.args.get("userId","") in users.keys():
                users.pop(request.args.get("userId",""))
                for f in glob("configs/avatars/{}.*".format(request.args.get("userId",""))):
                    os.remove(f)
                open("configs/users.json","w").write(json.dumps(users))
                reloadData()
            return redirect("/?action=serverControlPanel")
    elif action=="adminManageAccount":
        if current_user.is_authenticated==False:
            return redirect("/?action=login&next={}?action=adminManageAccount".format(reqPath))
        if current_user.role!="admin":
            return abort(401)
        if request.args.get("userId","") not in users.keys():
            return redirect("/?action=serverControlPanel")
        if request.method=="POST":
            usrId=request.args.get("userId",current_user.id)
            users[usrId]["name"]=request.form.get("username",current_user.name)
            if request.form.get("newPassword",users[usrId]["password"])!="":
                users[usrId]["password"]=generate_password_hash(request.form.get("newPassword",users[usrId]["password"]))
            open("configs/users.json","w").write(json.dumps(users))
            reloadData()
            flash(gstr("changesSaved"),category="success")
            return redirect("/?action=serverControlPanel")
        return render_template("adminManageAccount.html",user=users[request.args.get("userId",str(current_user.id))])
    elif action=="manageAccount":
        if current_user.is_authenticated==False:
            return redirect("/?action=login&next={}?action=manageAccount".format(reqPath))
        if request.method=="POST":
            users[str(current_user.id)]["name"]=request.form.get("username",current_user.name)
            if request.form.get("newPassword",users[str(current_user.id)]["password"])!="":
                users[str(current_user.id)]["password"]=generate_password_hash(request.form.get("newPassword",users[str(current_user.id)]["password"]))
            open("configs/users.json","w").write(json.dumps(users))
            reloadData()
            flash(gstr("changesSaved"),category="success")
            return redirect(reqPath)
        return render_template("manageAccount.html")
    elif action=="serverControlPanel":
        if current_user.is_authenticated==False:
            return redirect("/?action=login&next=/?action=serverControlPanel")
        if current_user.role!="admin":
            return abort(401)
        return render_template("serverControlPanel.html",serverName=configs["serverName"],users=users)
    elif action=="addUser":
        if current_user.is_authenticated==False:
            return redirect("/?action=login&next=/?action=addUser")
        if current_user.role!="admin":
            return abort(401)
        if request.method=="POST":
            users[configs["nextUserId"]]={"userId":configs["nextUserId"],"name":request.form.get("username"),"password":generate_password_hash(request.form.get("password")),"role":request.form.get("role",
            "user")}
            configs["nextUserId"]+=1
            open("configs/users.json","w").write(json.dumps(users))
            open("configs/configs.json","w").write(json.dumps(configs))
            reloadData()
            return redirect("/?action=serverControlPanel")
        return render_template("addUser.html")
    elif action=="getAvatar":
        if request.args.get("userId",None)==None:
            if current_user.is_authenticated==False:
                return send_file("resources/defaultAvatar.png",mimetype="image/png")
            avatarFile=glob("configs/avatars/"+str(current_user.id)+".*")
        else:
            if request.args.get("userId") not in users.keys():
                return abort(404)
            avatarFile=glob("configs/avatars/"+request.args.get("userId","")+".*")
        if len(avatarFile)==0:
            return send_file("resources/defaultAvatar.png",mimetype="image/png")
        return send_file(avatarFile[0],mimetype="image/png")
    elif action=="uploadAvatar":
        if current_user.is_authenticated==False:
            if request.args.get("userId",None)==None:
                return redirect("/?action=login&next=/?action=manageAccount")
            else:
                return redirect("/?action=login&next=?action=adminManageAccount&userId="+request.args.get("userId","1"))
        if request.args.get("userId",None)!=None and current_user.role!="admin":
            return abort(401)
        if request.args.get("userId",None)!=None and request.args.get("userId",None) not in users.keys():
            return redirect("/?action=serverControlPanel")
        uid=str(request.args.get("userId",current_user.id))
        if request.method=="POST":
            if "avatar-file-input" not in request.files:
                return redirect("?action=manageAccount")
            file=request.files["avatar-file-input"]
            for ofile in glob("configs/avatars/"+uid+".*"):
                os.remove(ofile)
            file.save("configs/avatars/"+uid+"."+file.filename.split(".")[-1])
            im = Image.open("configs/avatars/"+uid+"."+file.filename.split(".")[-1])
            width, height = im.size
            newLength=min(width,height)
            left = (width - newLength)/2
            top = (height - newLength)/2
            right = (width + newLength)/2
            bottom = (height + newLength)/2
            im = im.crop((left, top, right, bottom))
            im.save("configs/avatars/"+uid+"."+file.filename.split(".")[-1])
            #flash(gstr("fileUploaded"),category="success")
            if request.args.get("userId",None)==None:
                return redirect("?action=manageAccount")
            return redirect("?action=adminManageAccount&userId="+uid)
    elif action=="uploadServerLogo":
        if current_user.is_authenticated==False:
            return redirect("/?action=login&next=/?action=serverControlPanel")
        if current_user.role!="admin":
            return abort(401)
        if request.method=="POST":
            if "server-logo-file-input" not in request.files:
                return redirect("/?action=serverControlPanel")
            file=request.files["server-logo-file-input"]
            for ofile in glob("configs/serverLogo.*"):
                os.remove(ofile)
            file.save("configs/serverLogo."+file.filename.split(".")[-1])
            im = Image.open("configs/serverLogo."+file.filename.split(".")[-1])
            width, height = im.size
            newLength=min(width,height)
            left = (width - newLength)/2
            top = (height - newLength)/2
            right = (width + newLength)/2
            bottom = (height + newLength)/2
            im = im.crop((left, top, right, bottom))
            im.save("configs/serverLogo."+file.filename.split(".")[-1])
            configs["serverLogoPath"]="configs/serverLogo."+file.filename.split(".")[-1]
            open("configs/configs.json","w").write(json.dumps(configs))
            reloadData()
            #flash(gstr("fileUploaded"),category="success")
            return redirect("/?action=serverControlPanel")
    elif action=="getServerLogo":
        if "serverLogoPath" not in configs:
            return send_file("resources/favicon.png")
        return send_file(configs["serverLogoPath"])
    elif action=="IENotSupport":
        return render_template("IENotSupport.html")
    else:
        oneTimeAccessToken=request.args.get("oneTimeAccessToken","")
        if oneTimeAccessToken!="" and oneTimeAccessToken in oneTimeAccess.keys():
            if oneTimeAccess[oneTimeAccessToken]["expire"]>=time.time():
                userClass=User()
                userClass.id=int(oneTimeAccess[oneTimeAccessToken]["userId"])
                userClass.name=users[str(oneTimeAccess[oneTimeAccessToken]["userId"])]["name"]
                login_user(userClass)
            else:
                oneTimeAccess.pop(oneTimeAccessToken)
                return json.dumps({"status":"error","msg":"Expired"})   
        if checkUserCanAccess(reqPath)==False:
            return abort(401)
        canUpload=checkUserCanUpload(reqPath)
        canDelete=checkUserCanDelete(reqPath)
    if os.path.isdir(freqpath):
        files=glob(freqpath+"/*")
        filesDict={}
        if reqPath=="/":
            dreqpath="/"+request.host
            ppath=""
        else:
            dreqpath=reqPath
            ppath="<a href='/'>"+request.host+"</a>"
            ppathstr=dreqpath.split("/")[:-1]
            ct=""
            for path in ppathstr[1:]:
                ct+="/"
                ct+=path
                ppath+=" / <a href='"+ct+"'>"+path+"</a>"
        for file in files:
            fileInfo={}
            file=file.replace("\\","/")
            if reqPath=="/":
                fileUrl=reqPath+file.split("/")[-1]
            else:
                fileUrl=reqPath+"/"+file.split("/")[-1]
            fileInfo["name"]=fileUrl
            fileInfo["canDelete"]=checkUserCanDelete(fileUrl)
            if os.path.isdir(file):
                fileInfo["filetype"]="folder"
                fileInfo["filesize"]=""
            else:
                fileext=os.path.splitext(file)[-1].replace(".","")
                found=False
                for ftype in filetypes:
                    if fileext.lower() in filetypes[ftype]:
                        found=True
                        fileInfo["filetype"]=ftype
                        break
                if found==False:
                    fileInfo["filetype"]="file"
                fileInfo["filesize"]=sizeof_fmt(os.path.getsize(file))
            fileInfo["modifyTime"]=dt.fromtimestamp(os.path.getmtime(file)).strftime("%Y-%m-%d %H:%M:%S")
            filesDict[fileUrl]=fileInfo
        reqFormat=request.args.get("format","web")
        if reqFormat=="json":
            filesDict["canUpload"]=canUpload
            filesDict["canDelete"]=canDelete
            filesDict["serverInfo"]={"serverTime":dt.now().strftime("%Y-%m-%d %H:%M:%S"),"serverName":configs["serverName"]}
            return json.dumps(filesDict)
        elif reqFormat=="print":
            return render_template("printFileListsPage.html",files=filesDict,reqFolder=(reqPath.split("/")[-1]))
        return render_template("folder.html",files=filesDict,reqpath=dreqpath,ppath=ppath,ppathurl="/"+"/".join(reqPath[1:].split("/")[:-1]),canUpload=canUpload,users=users,canDelete=canDelete)
    else:
        pass
print("================================================================")
if configs["webServer"]["useSSL"]==True:
    app.run(host=configs["webServer"]["host"],port=configs["webServer"]["port"],debug=configs["webServer"]["debug"],ssl_context=(configs["webServer"]["ssl"]["cert"],configs["webServer"]["ssl"]["key"]),threaded=True)
else:
    app.run(host=configs["webServer"]["host"],port=configs["webServer"]["port"],debug=configs["webServer"]["debug"],threaded=True)