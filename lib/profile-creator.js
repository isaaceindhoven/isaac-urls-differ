const util = require('./util.js')
const copydir = require('copy-dir');

const copyDirAsync = require('util').promisify(copydir)

const exitIfProfileFolderAlreadyExists = async (profileConfigFile, profileName) => {
    if (await util.doesDirExist(profileConfigFile)) {
        util.logError(`Folder for profile '${profileName}' already exists.`)
        process.exit(1)
    }
}

module.exports = async (profileName) => {
    const profilesRootFolder = `${process.cwd()}/profiles`
    util.createDirIfNotExists(profilesRootFolder)
    
    const profileFolder = `${profilesRootFolder}/${profileName}`
    await exitIfProfileFolderAlreadyExists(profileFolder, profileName)
    util.createDirIfNotExists(profileFolder)

    await copyDirAsync(`${__dirname}/profile-template`, profileFolder)
    console.log(`Profile '${profileName}' folder and default config created in '${profileFolder}'.`)
}