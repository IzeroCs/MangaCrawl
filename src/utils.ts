import fs from "fs"
import path from "path"
import { ChapterEntry, Comic } from "./extenstion"

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

export function storagePath(comic: Comic): string {
    return path.join(path.dirname(__dirname), "storage", comic.seo)
}

export function storageChapPath(comic: Comic, chapter: ChapterEntry): string {
    return path.join(storagePath(comic), chapName(chapter))
}

export function storageMaker(comic: Comic): boolean {
    const stPath = storagePath(comic)

    if (!fs.existsSync(stPath) && typeof fs.mkdirSync(stPath, { recursive: true }) === "undefined")
        return false

    return true
}

export function storageChapMaker(comic: Comic, chapter: ChapterEntry): boolean {
    const chapPath = storageChapPath(comic, chapter)

    if (!fs.existsSync(chapPath) && typeof fs.mkdirSync(chapPath, { recursive: true }) === "undefined")
        return false

    return true
}

export default {
    urlScheme: urlScheme,
    urlFilename: urlFilename,
    chapName: chapName,
    storagePath: storagePath,
    storageMaker: storageMaker,
    storageChapPath: storageChapPath,
    storageChapMaker: storageChapMaker
}
