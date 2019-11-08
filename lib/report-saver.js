const fs = require('fs').promises
const moment = require('moment')
const escape = require('escape-html');
const { createDirIfNotExists} = require('./util')

const toEscapedAndEllipsisedString = (txt, notFirst, notLast, snippetContextSize) => {
    if (txt.length < snippetContextSize || (notFirst && notLast && txt.length < snippetContextSize * 2)) return escape(txt)
    
    let result = ''
    if (notFirst) result += `${escape(txt.substring(0, snippetContextSize))}<span class="ellipsis">&nbsp;…</span><br>`
    if (notLast) result += `<br><span class="ellipsis">️…&nbsp;</span>${escape(txt.substring(txt.length - snippetContextSize, txt.length))}`
    return result
}

const diffAsEllipsedHtml = (diff, snippetContextSize) => {
    diff.forEach((curr, idx) => {
        if (curr[0] === 0) {
            curr[1] = toEscapedAndEllipsisedString(curr[1], idx !== 0, idx !== diff.length - 1, snippetContextSize)
        } else {
            curr[1] = escape(curr[1])
        }
    })

    const tags = [['<del>[', ']</del>'], ['', ''], ['<ins>[', ']</ins>']]
    const html = diff.reduce((prev, curr) => 
        `${prev}${tags[curr[0] + 1][0]}${curr[1]}${tags[curr[0] + 1][1]}`
    , '')

    return html.replace(/\r?\n( |\t)+/g, (match) => {
            return `${match.replace(/ /g, '&nbsp;')}`
        }).replace(/\r?\n/g, (match) => {
            return `${match}<br>`
        })
}

const getHeaderRequestMessage = curr => {
    if (curr.issue === 'error') {
        return curr.errorStatus;
    } 
    return `${curr.diff.metadata.add} add / ${curr.diff.metadata.del} del`
};

const generateReportHtml = async (report, snippetContextSize, executeTime) => 
    (await fs.readFile('lib/report-template.html', 'utf8'))
        .replace('{{ title }}', `${report.length} pages with issues - ${moment(executeTime).format('YYYY-mm-DD kk:MM:ss')}`)
        .replace('{{ body }}', `${report.reduce((prev, curr, idx) => {
            const id = curr.cachedUrlHash
            return `
                ${prev}
                <div class="card">
                    <div class="card-header" id="heading${id}">
                        <a class="mb-0 d-flex justify-content-between" data-toggle="collapse" data-target="#collapse${id}" aria-expanded="true" aria-controls="collapse${id}">
                            <span>
                                <span class="badge badge-secondary">${idx + 1}</span>&nbsp;&nbsp;&nbsp;
                                Comparing ${curr.urlSet.oldUrl === curr.urlSet.newUrl ? "identical urls" : "different urls" }: 
                                ${getHeaderRequestMessage(curr)}
                            </span>
                            <span>${curr.urlSet.newUrl}</span>
                            <span>${id}</span>
                        </a>
                    </div>
                    <div id="collapse${id}" class="collapse show" aria-labelledby="heading${id}" data-parent="#accordionExample">
                        <div class="card-body">
                        ${curr.issue === 'diff' ? diffAsEllipsedHtml(curr.diff.diff, snippetContextSize) : `<a href="${curr.fetchedUrl}" target="_blank">${curr.fetchedUrl}</a> returned an error`}
                        </div>
                    </div>
                </div>`
            }, '')}`)

module.exports = async (reportDiffs, reportDirectory, folderDateFormat, snippetContextSize, executeTime) => {
    const html = await generateReportHtml(reportDiffs, snippetContextSize)
    
    await createDirIfNotExists(reportDirectory)
    const reportFileName = `${reportDirectory}/${moment(executeTime).format(folderDateFormat)}.html`
    fs.writeFile(reportFileName, html, 'utf8')
    
    return reportFileName
}