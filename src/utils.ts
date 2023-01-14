import fs from "fs"
import path from "path"
import { ChapterEntry, Comic, Extension } from './extenstion';

export function rmdirs(directoryPath: string) {
    if (fs.existsSync(directoryPath)){
        fs.readdirSync(directoryPath).map((file, index) => {
            const curPath = path.join(directoryPath, file)

            if (fs.lstatSync(curPath).isDirectory())
                rmdirs(curPath)
            else
                fs.unlinkSync(curPath)
        })

        fs.rmdirSync(directoryPath)
    }
}

export function ucfirst(title: string): string {
    let pieces = title.split(" ")

    for (let i = 0; i < pieces.length; ++i) {
        const firstChar = pieces[i].charAt(0).toUpperCase()
        pieces[i] = firstChar + pieces[i].substring(1).toLowerCase()
    }

    return pieces.join(" ")
}

export function urlScheme(url: string): string {
    if (!url.startsWith("http")) {
        if (url.startsWith("//"))
            return "http:" + url
        else
            return "http://" + url
    }

    return url
}

export function urlFilename(url: string): string {
    const filename = url.split('/')?.pop()?.split('#')[0].split('?')[0]
    return (typeof filename === "undefined" ? "" : filename)
}

export function chapName(chapter: ChapterEntry): string {
    const prefix = "Chapter "
    const labelSub = " - "

    if (chapter.label.length <= 0)
        return prefix + chapter.chap

    return prefix + chapter.chap
}

export function storagePath(extension: Extension, comic: Comic): string {
    return path.join(path.dirname(__dirname), "storage", extension.directoryStorage, comic.seo)
}

export function storageChapPath(extension: Extension, comic: Comic, chapter: ChapterEntry): string {
    return path.join(storagePath(extension, comic), chapName(chapter))
}

export function storageMaker(extension: Extension, comic: Comic): boolean {
    const stPath = storagePath(extension, comic)

    if (!fs.existsSync(stPath) && typeof fs.mkdirSync(stPath, { recursive: true }) === "undefined")
        return false

    return true
}

export function storageChapMaker(extension: Extension, comic: Comic, chapter: ChapterEntry): boolean {
    const chapPath = storageChapPath(extension, comic, chapter)

    if (!fs.existsSync(chapPath) && typeof fs.mkdirSync(chapPath, { recursive: true }) === "undefined")
        return false

    return true
}

export default {
    rmdirs: rmdirs,
    ucfirst: ucfirst,
    urlScheme: urlScheme,
    urlFilename: urlFilename,
    chapName: chapName,
    storagePath: storagePath,
    storageMaker: storageMaker,
    storageChapPath: storageChapPath,
    storageChapMaker: storageChapMaker
}
