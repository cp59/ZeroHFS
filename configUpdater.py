import json
config=json.load(open("configs/configs.json",encoding="utf-8"))
if "configVersion" not in config:
    config["configVersion"]=1
if config["configVersion"]==1: #Update V1 to V2
    print("Server config is updated from version V1 to V2")
    config["findFolderIndex"]=False #Auto return index.html feature
    open("configs/ipAccessControl.json","w",encoding="utf-8").write("{}")
    config["configVersion"]=2
open("configs/configs.json", "w",encoding="utf-8").write(json.dumps(config))
print("ZeroHFS Config Updated!")
