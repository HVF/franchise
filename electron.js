const { app, Menu, BrowserWindow } = require('electron')
const path = require('path')
const url = require('url')

const WebSocket = require('ws')
const port = parseInt('bat', 36)

const response = require('./response.js')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1100,
    height: 650,
    titleBarStyle: 'hidden-inset', webPreferences: {
      nodeIntegration: false
    }
  })

  startServer()

  // win.openDevTools()

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'bundle/index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  // win.webContents.openDevTools()

	// Create the Application's main menu
	var template = [{
		label: "Franchise",
		submenu: [
			{ label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
		]}, {
		label: "Edit",
		submenu: [
			{ label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
			{ label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
			{ type: "separator" },
			{ label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
			{ label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
			{ label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
			{ label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
		]}
	];
	Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

function _asyncToGenerator(fn) {
  return function () {
    var gen = fn.apply(this, arguments)
    return new Promise(function (resolve, reject) {
      function step(key, arg) {
        try {
          var info = gen[key](arg)
          var value = info.value
        } catch (error) {
          reject(error)
          return
        }
        if (info.done) {
          resolve(value)
        } else {
          return Promise.resolve(value).then(function (value) {
            step("next", value)
          }, function (err) {
            step("throw", err)
          })
        }
      }

      return step("next")
    })
  }
}

function startServer() {
  const wss = new WebSocket.Server({port})
  console.log("franchise-client listening on port:", port)
  wss.on('connection', ws => {
    console.log('opened connection')

    const ctx = {}

    ws.on('message', (() => {
      var _ref = _asyncToGenerator(function* (message) {
        console.log('received:', message)

        message = JSON.parse(message)
        const {id} = message

        const res = yield response(message, ctx)

        ws.send(JSON.stringify(Object.assign({id}, res)))
      })

      return function (_x) {
        return _ref.apply(this, arguments)
      }
    })())
  })
}
