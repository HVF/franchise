const { notarize } = require('electron-notarize')

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context
    if (electronPlatformName !== 'darwin') {
        return
    }
    console.log('afterSign hook triggered', context)

    const appName = context.packager.appInfo.productFilename

    try {
        await notarize({
            appBundleId: 'com.eponymous.franchise',
            appPath: `${appOutDir}/${appName}.app`,
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_PW,
        })
    } catch (err) {
        console.error(error)
    }

    console.log(`Done notarizing ${appName}`)
}
