from PyQt5 import QtWidgets, QtGui, QtCore
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEnginePage
from qdarkstyle import load_stylesheet_pyqt5
import sys, json

darkMode = True
isEnabled = True


class WebEnginePage(QWebEnginePage):

    def javaScriptConsoleMessage(self, level, message, lineNumber, sourceID):
        print(message)
        if lineNumber == 156:
            w.show()


class window(QtWidgets.QMainWindow):

    def __init__(self, parent=None):
        super().__init__(parent)
        if darkMode:
            self.setStyleSheet(load_stylesheet_pyqt5())
        self.setWindowTitle("Snapdrop For Windows")
        self.setGeometry(QtCore.QRect(640, 360, 640, 480))
        self.showMaximized()
        self.webBrowser = QWebEngineView()
        self.webBrowser.setPage(WebEnginePage(self.webBrowser))
        self.webBrowser.setUrl(QtCore.QUrl("https://snapdrop.net"))
        self.webBrowser.page().profile().downloadRequested.connect(
            self.downloadReq)
        self.setCentralWidget(self.webBrowser)
        self.icon = QtGui.QIcon("D:\\unnamed.png")
        self.tray = QtWidgets.QSystemTrayIcon(self)
        self.tray.setIcon(self.icon)
        self.tray.setVisible(True)
        self.tray.messageClicked.connect(self.show)
        self.tray.activated.connect(self.show)
        menu = QtWidgets.QMenu(self)
        show = QtWidgets.QAction("Show", self)
        show.triggered.connect(self.show)
        menu.addAction(show)
        self.onOffSwitch = QtWidgets.QAction("Disable Snapdrop")
        self.onOffSwitch.triggered.connect(self.switchMode)
        menu.addAction(self.onOffSwitch)
        quit = QtWidgets.QAction("Quit", self)
        quit.triggered.connect(self.close)
        menu.addAction(quit)
        self.tray.setContextMenu(menu)
        self.tray.show()

    def switchMode(self):
        global isEnabled
        if isEnabled:
            self.onOffSwitch.setText("Enable Snapdrop")
            self.webBrowser.setHtml(
                "<span>Snapdrop discovery mode has been disabled<br />Enable by right click on the system tray and select 'Enable Snapdrop'</span>"
            )
            isEnabled = False
        else:
            self.onOffSwitch.setText("Disable Snapdrop")
            self.webBrowser.setHtml(
                "<span>Enabling Snapdrop<br />this may take a few seconds</span>"
            )
            self.webBrowser.setUrl(QtCore.QUrl("https://snapdrop.net"))
            isEnabled = True

    def trayClicked(self, r):
        if r == QtWidgets.QSystemTrayIcon.Context:
            self.show()

    def closeEvent(self, event):
        close = QtWidgets.QMessageBox.question(
            self, "QUIT", "Are you sure want to stop process?",
            QtWidgets.QMessageBox.Yes | QtWidgets.QMessageBox.No)
        if close == QtWidgets.QMessageBox.Yes:
            self.webBrowser.setUrl(QtCore.QUrl("about:blank"))
            event.accept()
        else:
            event.ignore()
            self.hide()

    def downloadReq(self, item):
        item.accept()


app = QtWidgets.QApplication(sys.argv)
w = window()
w.show()
app.exec()