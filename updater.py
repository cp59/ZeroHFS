import requests
import shutil
import os
import zipfile
from glob import glob
from tqdm import tqdm
os.system("cls")
print("ZeroHFS更新工具 (版本: 1.0)")
print("==========================================================")
input("按Enter來開始下載並安裝最新版本的ZeroHFS，或按Ctrl+C離開。")
print("==========================================================")
print("正在下載最新版本的ZeroHFS...")
url = "https://local.zeroapp.tk/updateService/zhfs/lastest.zip"
updateReq = requests.get(url, stream=True)
total_size_in_bytes= int(updateReq.headers.get('content-length', 0))
block_size = 1024
progress_bar = tqdm(total=total_size_in_bytes, unit='iB', unit_scale=True)
with open('update.zip', 'wb') as file:
    for data in updateReq.iter_content(block_size):
        progress_bar.update(len(data))
        file.write(data)
progress_bar.close()
if total_size_in_bytes != 0 and progress_bar.n != total_size_in_bytes:
    print("ERROR, something went wrong")
print("==========================================================")
print("正在移除原有的ZeroHFS版本(網站設定值將會保留)...")
for file in tqdm(glob('*')):
    if file != 'update.zip' and file != "configs" and file != "updater.py":
        if os.path.isdir(file):
            shutil.rmtree(file)
        else:
            os.remove(file)
print("==========================================================")
print("正在解壓縮最新版本的ZeroHFS...")
with zipfile.ZipFile('update.zip', 'r') as zipObj:
       listOfFileNames = zipObj.namelist()
       for fileName in tqdm(listOfFileNames):
            if fileName.startswith('configs')==False:
               zipObj.extract(fileName)
print("==========================================================")
print("正在安裝最新版本的ZeroHFS...")
os.system("pip install -r requirements.txt")
os.system("configUpdater.py")
print("==========================================================")
print("正在清除快取...")
os.remove("update.zip")
os.remove("configUpdater.py")
print("==========================================================")
print("最新版本的ZeroHFS已成功安裝至此資料夾，請重新啟動ZeroHFS來完成更新。")
input("按Enter來關閉程式")
