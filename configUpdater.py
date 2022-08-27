import json
c=json.load(open("configs/configs.json"))
c["configVersion"]=1
open("configs/configs.json", "w").write(json.dumps(c))
print("成功更新ZeroHFS伺服器設定檔!")