import fs from "fs"
import path from "path"
import zip from "adm-zip"
import colors from "colors"
import utils from "./utils"

const storagePath = utils.storagePath()
const storageDirs = fs.readdirSync(storagePath)

storageDirs.map(extensionDirectory => {
    const extensionPath = path.join(storagePath, extensionDirectory)
    const extensionDirs = fs.readdirSync(extensionPath)

    extensionDirs.map(comicDirectory => {
        const comicPath = path.join(extensionPath, comicDirectory)
        const comicDirs = fs.readdirSync(comicPath)

        console.log(colors.blue("ZipDirectory: ") +
            colors.cyan(path.join(extensionDirectory, comicDirectory)))

        comicDirs.map(chapterDirectory => {
            const chapterPath = path.join(comicPath, chapterDirectory)
            const chaperStat = fs.statSync(chapterPath)

            if (chaperStat.isDirectory()) {
                const chapterDirs = fs.readdirSync(chapterPath)
                const chapterZipPath = path.join(comicPath, chapterDirectory + ".cbz")
                const chapterZip = new zip()

                chapterDirs.map(entry => {
                    const entryPath = path.join(chapterPath, entry)
                    chapterZip.addFile(entry, fs.readFileSync(entryPath))
                })

                chapterZip.writeZip(chapterZipPath)
            }
        })
    })
})
