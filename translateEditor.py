from PyQt5 import QtWidgets,QtGui,QtCore
from qdarkstyle import load_stylesheet_pyqt5
import sys,json
darkMode = True
supportTranslates = json.load(open("translates/supportLang.json",encoding="utf-8"))
translates={}
for supportTranslate in supportTranslates.keys():
    translates[supportTranslate] = json.load(open("translates/"+supportTranslate+".json",encoding="utf-8"))
class VLine(QtWidgets.QFrame):
    def __init__(self):
        super(VLine, self).__init__()
        self.setFrameShape(self.VLine|self.Sunken)
class window(QtWidgets.QMainWindow):
    def __init__(self, parent=None):
        super().__init__(parent)
        if darkMode:
            self.setStyleSheet(load_stylesheet_pyqt5())
        self.defaultStatusBarMsg = "Ctrl+S to save translates"
        self.wtitle = "SimpleString GUI Translation Editor (v0.7 (Public Beta))"
        self.setWindowTitle(self.wtitle)
        self.setGeometry(QtCore.QRect(640,360,640,480))
        self.showMaximized()
        self.statusBar = QtWidgets.QStatusBar()
        self.statusBar.showMessage(self.defaultStatusBarMsg)
        self.sbRightLabel = QtWidgets.QLabel(str(len(translates["zh_TW"]))+" translates are loaded")
        self.sbRightLabel2 = QtWidgets.QLabel("Copyright 2022, ZeroApp Innovation Technolgy")
        self.statusBar.addPermanentWidget(self.sbRightLabel)
        self.statusBar.addPermanentWidget(VLine())
        self.statusBar.addPermanentWidget(self.sbRightLabel2)
        self.toolBar = QtWidgets.QToolBar()
        self.actionSave = QtWidgets.QAction("Save", self)
        self.actionSave.setShortcut(QtGui.QKeySequence("Ctrl+S"))
        self.actionSave.triggered.connect(self.save)
        self.addAction(self.actionSave)
        self.actionNewKey = QtWidgets.QAction("Add key...", self)
        self.actionNewKey.setShortcut(QtGui.QKeySequence("Ctrl+N"))
        self.actionNewKey.triggered.connect(self.addKey)
        self.addAction(self.actionNewKey)
        self.tableWidget = QtWidgets.QTableWidget(self)
        self.tableWidget.setColumnCount(len(supportTranslates)+1)
        self.tableWidget.setHorizontalHeaderLabels(["Key"]+list(supportTranslates.keys()))
        self.tableWidget.setRowCount(len(translates["zh_TW"]))
        header = self.tableWidget.horizontalHeader()       
        header.setSectionResizeMode(1, QtWidgets.QHeaderView.Stretch)
        header.setSectionResizeMode(2, QtWidgets.QHeaderView.Stretch)
        header.setSectionResizeMode(3, QtWidgets.QHeaderView.Stretch)
        index = 0
        perPercent = 1/(len(translates["zh_TW"])*len(supportTranslates))*100
        stl=len(supportTranslates)
        for strName in translates["zh_TW"].keys():
            self.tableWidget.setItem(index,0, QtWidgets.QTableWidgetItem(strName))
            tindex = 1
            for t in supportTranslates.keys():
                if strName in translates[t]:
                    self.tableWidget.setItem(index,tindex, QtWidgets.QTableWidgetItem(translates[t][strName]))
                cPercent=int((index*stl+tindex)*perPercent)
                self.setWindowTitle(str(cPercent)+"% - "+self.wtitle)
                tindex+=1
            index+=1
        self.setWindowTitle(self.wtitle)
        self.setCentralWidget(self.tableWidget)
        self.setStatusBar(self.statusBar)
    def resetStatusBar(self):
        self.statusBar.showMessage(self.defaultStatusBarMsg)
    def addKey(self):
        self.tableWidget.insertRow(self.tableWidget.rowCount()) 
    def save(self):
        self.statusBar.showMessage("Saving translates...")
        st = list(supportTranslates.keys())
        for t in st:
            translates[t]={}
        for row in range(self.tableWidget.rowCount()):
            strName = self.tableWidget.item(row,0).text()
            for column in range(1,self.tableWidget.columnCount()):
                try:
                    translates[st[column-1]][strName] = self.tableWidget.item(row,column).text()
                except:
                    pass
        for t in st:
            with open("translates/{}.json".format(t),"w",encoding="utf-8") as w:
                w.write(json.dumps(translates[t]))
        self.statusBar.showMessage("All translates has been saved!")
        QtCore.QTimer.singleShot(2000,self.resetStatusBar)
app = QtWidgets.QApplication(sys.argv)
w = window()
w.show()
app.exec()