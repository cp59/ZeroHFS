from werkzeug.security import generate_password_hash
import json
users=json.load(open("configs/users.json",encoding="utf-8"))
i=0
for user in users:
    if i!=0:
        users[user]["password"]=generate_password_hash(users[user]["password"])
    i+=1
open("configs/users.json","w").write(json.dumps(users))
input("成功更新設定檔，請啟動ZeroHFS來完成更新。按Enter來關閉程式。")