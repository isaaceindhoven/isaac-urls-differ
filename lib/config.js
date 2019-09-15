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

module.exports = async (profileName) => {
    const profileFolder = `${process.cwd()}/profiles/${profileName}`
    await exitIfProfileFolderDoesNotExists(profileFolder, profileName)

    const profileConfigFile = getProfileConfigFile(profileFolder)
    await exitIfProfileConfigFileDoesNotExists(profileConfigFile, profileName)

    const fileContent = await fs.promises.readFile(profileConfigFile, 'utf8')
    const json = parseConfigToJson(fileContent, profileName)

    await exitIfJsonDoesNotMatchSchema(json, profileName)
    return addPathInfoToConfig(json, profileFolder, profileName)
}