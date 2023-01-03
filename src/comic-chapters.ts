import { AxiosInstance } from "axios"
import cloudscraper from "cloudscraper"
import utils from "./utils"
import {
    Comic,
    Extension,
    ResultRegex,
    ChapterEntry,
    RegexDestructured
} from "./extenstion"

export default class ComicChapters {
    static listChapterRequest(http: AxiosInstance,
        extension: Extension, url: string): Promise<Comic>
    {
        return new Promise(async (resolve, reject) => {
            cloudscraper({
                method: "GET",
                url: url
            }).then((source: string) => {
                source = source.replace(/[\r\n]+/g," ")
                            .replace("'", "\"")

                const title = RegexDestructured.valueOf(source, extension.chapterTitleRegex())
                    extension.onComicTitleMatch(title)

                const thumb = RegexDestructured.valueOf(source, extension.chapterThumbRegex())
                    extension.onComicThumbMatch(thumb)

                const info = RegexDestructured.valueOf(source, extension.chapterInfoRegex())
                    extension.onComicInfoMatch(info)

                const list = RegexDestructured.valueOf(source, extension.chapterListRegex())
                    extension.onComicChapterMatch(list)

                const author = RegexDestructured.valueOf(info, extension.infoAuthorRegex())
                    extension.onInfoAuthorMatch(author)

                const status = RegexDestructured.valueOf(info, extension.infoStatusRegex())
                    extension.onInfoStatusMatch(status)

                const kind = RegexDestructured.valueOf(info, extension.infoKindListRegex())
                    extension.onInfoGenreMatch(kind)

                const desc = RegexDestructured.valueOf(source, extension.infoDescriptionRegex())
                    extension.onInfoDescriptionMatch(desc)

                const seo = RegexDestructured.valueOf(url, extension.infoSeoUrlRegex())
                    extension.onInfoSeoMatch(seo)

                const genre = RegexDestructured.genreForEachRegex(kind, extension.genreEntryRegex())
                    extension.onGenreMatch(genre)

                const chapters = RegexDestructured.chapterForEachRegex(list, extension.chapEntryRegex())
                    extension.onChaptersMatch(chapters)

                genre.sort((a: string, b: string) => (a > b ? 1 : -1))
                chapters.sort((a: ChapterEntry, b: ChapterEntry) => (a.chap > b.chap ? 1 : -1))

                if (typeof chapters.length === "undefined" || chapters.length <= 0) {
                    reject(new Error("Not found list chapter in url " + url))
                } else {
                    let authorValue = author
                    let statusValue = extension.comicStatus(status)

                    if (typeof extension.authorReplaceRegex !== "undefined")
                        authorValue = RegexDestructured.replace(author, extension.authorReplaceRegex() as ResultRegex)

                    if (extension.isAuthorStatusUpdating(authorValue))
                        authorValue = ""

                    resolve({
                        http: http, title: title, thumb: utils.urlScheme(thumb), author: authorValue,
                        writer: authorValue, penciller: authorValue, inker: authorValue, genre: genre,
                        chapters: chapters, seo: seo, status: statusValue, description: desc
                    })
                }
            }).catch((err: Error) => console.error(err))
        })
    }

}
