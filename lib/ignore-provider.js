const fs = require('fs').promises
const cleanupDiff = require('./util').cleanupDiff

module.exports = async (ignoreDirectory) => {
    try {
        const allFolderItems = await fs.readdir(ignoreDirectory, { withFileTypes: true })
        const fileNames = allFolderItems.filter(item => item.isFile()).map(item => `${ignoreDirectory}/${item.name}`)
        
        if (fileNames.length === 0) {
            console.log(`No ignore rules found in ${ignoreDirectory}.`);
            return []
        } 

        const fileContent = await Promise.all(fileNames.map(file => fs.readFile(file, 'utf8')))

        const diffs = fileContent
            .reduce((prev, curr) => {
                return prev.concat(JSON.parse(curr))
            }, [])
        
        return cleanupDiff(diffs)
    } catch (err) {
        console.error(`Error: Error reading one or more url files in directory '${ignoreDirectory}'`);
        console.error(err);
        process.exit(1)
    }
}
