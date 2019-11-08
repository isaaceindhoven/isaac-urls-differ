const fs = require('fs')
var validator = require('is-my-json-valid')
const util = require('./util')

const getConfigJsonSchema = async () => {
    return fs.promises.readFile(`${__dirname}/config-schema.json`, 'utf8')
}

const getProfileConfigFile = (profileFolder) => {
    return `${profileFolder}/config.json`
}

const exitIfProfileFolderDoesNotExists = async (profileFolder, profileName) => {
    if (!(await util.doesDirExist(profileFolder))) {
        util.logError(`Profile '${profileName}' folder not found at '${profileFolder}'.`)
        process.exit(1)
    }
}

const exitIfProfileConfigFileDoesNotExists = async (profileConfigFile, profileName) => {
    if (!(await util.doesFileExist(profileConfigFile))) {
        util.logError(`Profile '${profileName}' has no config.json file at '${profileConfigFile}'`)
        process.exit(1)
    }
}

const exitIfProfileConfigFileAlreadyExists = async (profileConfigFile, profileName) => {
    if (await util.doesFileExist(profileConfigFile)) {
        util.logError(`Profile '${profileName}' already has a valid config.json file.`)
        process.exit(1)
    }
}

const parseConfigToJson = (content, profileName) => {
    try {
        return JSON.parse(content)
    } catch (err) {
        util.logError(`Profile '${profileName}' has illegal JSON in its config.json.
            \n\n${err}`)
        process.exit(1)
    }
}

const exitIfJsonDoesNotMatchSchema = async (json, profileName) => {
    const schema = await getConfigJsonSchema()
    const validate = validator(schema)
    validate(json)
    if (validate.errors != null) {
        util.logError(`Profile '${profileName}' has JSON schema issues in its config.json.
            \n\n${JSON.stringify(validate.errors, null, 2)}`)
        process.exit(1)
    }
}

const makeFullPath = async (config, key, profilePath, profileName) => {
    if (config[key].includes('/') || config[key].includes('\\')) {
        if (!(await util.doesDirExist(config[key]))) {
            util.logError(`Profile '${profileName}' has absolute path for config setting '${key}', but it\ndoes not exist: '${config[key]}'.`)
            process.exit(1)
        }
        return config[key]
    } 
    return `${profilePath}/${config[key]}`
} 

const addPathInfoToConfig = async (json, profileFolder, profileName) => {
    const [
        cacheDirectory,
        urlsDirectory,
        reportDirectory,
        ignoreDirectory
    ] = await Promise.all([
        makeFullPath(json, 'cacheDirectory', profileFolder, profileName),
        makeFullPath(json, 'urlsDirectory', profileFolder, profileName),
        makeFullPath(json, 'reportDirectory', profileFolder, profileName),
        makeFullPath(json, 'ignoreDirectory', profileFolder, profileName)
    ])

    let copy = {...json}
    copy.cacheDirectory = cacheDirectory
    copy.urlsDirectory = urlsDirectory
    copy.reportDirectory = reportDirectory
    copy.ignoreDirectory = ignoreDirectory
    
    return copy
}

const upgradeConfig = async (fileContent, profileConfigFile) => {
    const template = await fs.promises.readFile(`${__dirname}/profile-template/config.json`, 'utf8');
    const newConfig = {...JSON.parse(template), ...fileContent}
    // console.log({old: fileContent, new: newConfig, countOld: Object.keys(fileContent).length, countNew: Object.keys(newConfig).length});
    if (Object.keys(fileContent).length !== Object.keys(newConfig).length) {
        try {
            await fs.promises.writeFile(profileConfigFile, JSON.stringify(newConfig, null, 2), 'utf8');
            console.log(`\nℹ️  The config.json of this profile uses an older format. I just upgraded it to the latest version so you'll have all those sweet new features.`)
        } catch (err) {
            util.logError(`Error while writing upgraded version of ${profileConfigFile}.`, err);
        }
    }
    return newConfig;
}

module.exports = async (profileName) => {
    const profileFolder = `${process.cwd()}/profiles/${profileName}`
    await exitIfProfileFolderDoesNotExists(profileFolder, profileName)

    const profileConfigFile = getProfileConfigFile(profileFolder)
    await exitIfProfileConfigFileDoesNotExists(profileConfigFile, profileName)

    const fileContent = await fs.promises.readFile(profileConfigFile, 'utf8')
    let fileContentAsJson = parseConfigToJson(fileContent, profileName)
    fileContentAsJson = await upgradeConfig(fileContentAsJson, profileConfigFile);

    await exitIfJsonDoesNotMatchSchema(fileContentAsJson, profileName)
    return addPathInfoToConfig(fileContentAsJson, profileFolder, profileName)
}