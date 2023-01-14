import { AxiosInstance } from "axios"
import XRegExp from "xregexp"
import utils from "./utils"

export type ResultRegex = RegexOptions | RegExp

export abstract class Extension {
    abstract httpBaseUrl: string
    abstract httpReferer: string
    abstract directoryStorage: string

    abstract chapterTitleRegex(): ResultRegex
    abstract chapterThumbRegex(): ResultRegex
    abstract chapterInfoRegex(): ResultRegex
    abstract chapterListRegex(): ResultRegex

    abstract infoAuthorRegex(): ResultRegex
    abstract infoStatusRegex(): ResultRegex
    abstract infoGenreListRegex(): ResultRegex
    abstract infoDescriptionRegex(): ResultRegex
    abstract infoSeoUrlRegex(): ResultRegex

    abstract genreEntryRegex(): ResultRegex
    abstract chapEntryRegex(): ChapterResultRegex

    abstract imageListRegex(): ResultRegex
    abstract imageEntryRegex(): ImageResultRegex

    titleReplace(title: string): string {
        return title
    }

    genreListReplace(genres: string[]): string[] {
        return genres
    }

    imageListDecrypt(source: string, list: string): string {
        return list
    }

    authorReplaceRegex(): ResultRegex | undefined {
        return
    }

    imageEntryFilter(url: string): boolean {
        return true
    }

    imageEntryAllow(url: string): boolean {
        return true
    }

    abstract isAuthorStatusUpdating(author: string): boolean
    abstract comicStatus(status: string): ComicStatus

    onImageEntryProcess(filepath: string): Promise<boolean> {
        return new Promise(resolve => resolve(true))
    }

    onRenumberImageProcess(dirpath: string): Promise<boolean> {
        return new Promise(resolve => resolve(true))
    }

    onComicTitleMatch(title: string) {}
    onComicThumbMatch(thumb: string) {}
    onComicInfoMatch(info: string) {}
    onComicChapterMatch(list: string) {}

    onInfoAuthorMatch(author: string) {}
    onInfoStatusMatch(status: string) {}
    onInfoGenreMatch(genre: string) {}
    onInfoDescriptionMatch(description: string) {}
    onInfoSeoMatch(seo: string) {}

    onGenreMatch(genre: Array<String>) {}
    onChaptersMatch(chapters: Array<ChapterEntry>) {}

    onImageListMatch(comic: Comic, chapter: ChapterEntry, list: string) {}
    onImageEntryMatch(comic: Comic, chapter: ChapterEntry, array: Array<ImageEntry>) {}

    static isUrlExtension(url: string): boolean {
        return false
    }
}

export interface RegexOptions {
    regex: RegExp
    assignment?: number
}

export class RegexDestructured {
    private static asRegexOptions(resultRegex: ResultRegex): RegexOptions {
        let regex: RegExp
        let assign = 1

        if ("exec" in resultRegex) {
            regex = resultRegex
        } else {
            regex = resultRegex.regex as RegExp

            if (typeof resultRegex.assignment !== "undefined" || resultRegex.assignment!! > 0)
                assign = resultRegex.assignment!!
        }

        return { regex: regex, assignment: assign }
    }

    static valueOf(value: string, resultRegex: ResultRegex): string {
        const regexOptions = this.asRegexOptions(resultRegex)
        return (regexOptions.regex.exec(value) || []).at(regexOptions.assignment!!) || ""
    }

    static replace(value: string, resultRegex: ResultRegex): string {
        const regexOptions = this.asRegexOptions(resultRegex)
        return value.replace(regexOptions.regex, "$" + regexOptions.assignment)
    }

    static genreForEachRegex(genre: string, resultRegex: ResultRegex): Array<string> {
        const regexOptions = this.asRegexOptions(resultRegex)
        let array = Array<string>()

        XRegExp.forEach(genre, regexOptions.regex, matches => {
            const item = matches.at(regexOptions.assignment!!) || ""
            array.push(item)
        })

        return array
    }

    static chapterForEachRegex<T>(list: string,
        chapterRegex: ChapterResultRegex): Array<ChapterEntry>
    {
        let array = Array<ChapterEntry>()

        XRegExp.forEach(list, chapterRegex.regex, matches => {
            let uri   = matches.at(chapterRegex.uriAt) || ""
            let chap  = matches.at(chapterRegex.chapAt) || "0"
            let label = ""

            if (chapterRegex.labelAt != -1)
                label = matches.at(chapterRegex.labelAt) || ""

            array.push({ uri: uri, chap: Number.parseFloat(chap), label: label })
        })

        return array
    }

    static imageForEachRegex(list: string,
        imageRegex: ImageResultRegex): Array<ImageEntry>
    {
        let array = Array<ImageEntry>()

        XRegExp.forEach(list, imageRegex.regex, (matches, index) => {
            let src  = matches.at(imageRegex.srcAt) || ""
            let page = (index + 1).toString()

            if (imageRegex.pageAt != -1)
                page = matches.at(imageRegex.pageAt) || ""

            array.push({ index: index, page: Number.parseInt(page), original: utils.urlScheme(src) })
        })

        return array
    }
}

export interface Comic {
    http: AxiosInstance
    seo: string
    author: string
    writer: string
    penciller: string
    inker: string
    title: string
    description: string
    thumb: string
    status: number
    genre: Array<string>
    chapters: Array<ChapterEntry>
}

export enum ComicStatus {
    UNKNOWN = 0,
    ONGOING = 1,
    COMPLETED = 2
}

export interface ChapterEntry {
    chap: number
    uri: string
    label: string
}

export interface ChapterResultRegex {
    regex: RegExp
    chapAt: number
    uriAt: number
    labelAt: number
}

export interface ImageEntry {
    index: number
    original: string,
    page: number
}

export interface ImageResultRegex {
    regex: RegExp
    pageAt: number
    srcAt: number
}
