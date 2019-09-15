const fs = require('fs').promises
const logError = require('./util').logError

module.exports = async (urlsDirectory) => {
    try {
        const allFolderItems = await fs.readdir(urlsDirectory, { withFileTypes: true })
        const fileNames = allFolderItems.filter(item => item.isFile()).map(item => `${urlsDirectory}/${item.name}`)
        
        if (fileNames.length === 0) {
            logError(`No urls files found in folder ${urlsDirectory}. Please provide at least one file that contains a json array with urls.`);
            process.exit(1)
        }

        const fileContent = await Promise.all(fileNames.map(file => fs.readFile(file, 'utf8')))

        return fileContent.reduce((prev, curr) => {
            const cleanUrls = JSON.parse(curr).map(url => 
                (typeof url === "object") ? url : { oldUrl: url, newUrl: url }
            )
            return prev.concat(cleanUrls)
        }, [])
    } catch (err) {
        logError(`Error reading one or more url files in directory '${urlsDirectory}'`, err);
        process.exit(1)
    }
}
