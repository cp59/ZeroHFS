import os, json, secrets, sys
from werkzeug.security import generate_password_hash

print("ZeroHFS configure tool v1.0")
if os.path.isdir("configs"):
    print(
        'ZeroHFS server configuration folder already exists, if you want to reset all settings, please delete the "configs" folder!'
    )
    sys.exit(0)
os.mkdir("configs")
os.mkdir("configs/avatars")
open("configs/ipAccessControl.json", "w",
     encoding="utf-8").write(json.dumps({
         "mode": 0,
         "ips": {}
     }))
open("configs/folderInfo.json", "w", encoding="utf-8").write(json.dumps({}))
open("configs/loginSessions.json", "w", encoding="utf-8").write(json.dumps({}))
open("configs/users.json", "w", encoding="utf-8").write(
    json.dumps({
        "0": {
            "userId": 0,
            "name": "Guest",
            "role": "guest"
        },
        "1": {
            "userId":
            1,
            "name":
            input("Enter the new administrator account name (default: admin):")
            or "admin",
            "password":
            generate_password_hash(
                input(
                    "Enter the new administrator account password (default: admin):"
                ) or "admin"),
            "role":
            "admin"
        }
    }))
open("configs/configs.json", "w", encoding="utf-8").write(
    json.dumps({
        "rootPath":
        input("Enter root path:"),
        "folderArchivePath":
        input("Enter the path to store the temporary folder archive files:"),
        "serverName":
        "ZeroHFS",
        "serverLogoPath":
        "resources/favicon.png",
        "nextUserId":
        2,
        "canPreviewFileTypes": {
            "image": "png,jpg,jpeg,gif",
            "video": "mp4,avi,flv,mov,wmv,mpg,mpeg",
            "audio": "mp3,wav,ogg,flac,aac",
            "plainTextDocument": "txt,py,pyw,css,json,js",
            "html": "html,htm,shtml,xhtml",
            "folder": "",
            "file": ""
        },
        "webServer": {
            "secretKey": secrets.token_hex(64),
            "port": 8000,
            "host": "0.0.0.0",
            "useSSL": False,
            "ssl": {
                "key": "",
                "cert": ""
            },
            "debug": False
        },
        "configVersion":
        2,
        "findFolderIndex":
        False
    }))
print(
    "ZeroHFS server profile initialization is complete, you can now run ZeroHFS server!"
)
