const Diff = require('text-diff')
const cleanupDiff = require('./util').cleanupDiff

const addrelevanceInfo = (diff, diffsToIgnore) => {
    return diff.map(d => {
        const copy = [...d]
        copy.push(!diffsToIgnore.some(i => i[0] === d[0] && i[1] === d[1] ))
        return copy
    })
}

const removeIrrelevantChunks = (diff) => {
    const result = []
    diff.forEach((curr, idx) => {
        if (!curr[2]) {
            // Deleted (-1) irrelevant chunks are ignored
            if (curr[0] === -1) return
            // irrelevant new (1) and unchanged (0) chunks both get treated as unchanged chunks
            curr[0] = 0
        }

        if (idx > 0 && curr[0] === 0 && result[result.length - 1][0] === 0 ) {
            result[result.length - 1][1] += curr[1]
        } else {
            result.push(curr)
        } 
    })
    return result
}

const countChanges = (diff) => {
    let add = 0, del = 0
    diff.forEach(item => {
        switch (item[0]) {
            case -1: del++; break
            case 1: add++; break
        }
    })
    return {add, del, total: add + del}
}

module.exports = (cachedHtml, newHtml, diffsToIgnore) => {
    const diffObj = new Diff()
    const rawDiff = diffObj.main(cachedHtml, newHtml)
    diffObj.cleanupEfficiency(rawDiff)
    
    let diff = cleanupDiff(rawDiff)
    diff = addrelevanceInfo(diff, diffsToIgnore)
    diff = removeIrrelevantChunks(diff)
    const metadata = countChanges(diff)

    if (metadata.total === 0) return
    return {diff, metadata}
}