import colors from "colors"
import Info from "./info"
import Comics from "./comics"
import ComicChapters from "./comic-chapters"
import ChapterImages from "./chapter-images"

(async () => {
    const listCache = Info.readList()

    for (let i = 0; i < listCache.length; ++i) {
        const comics = new Comics(listCache[i])

        if (typeof comics.http === "undefined" || typeof comics.extension === "undefined")
            throw new Error("AxiosInstance or Extension undenfined")

        console.log(colors.blue("Name: ") + colors.cyan(comics.item.title))
        console.log(colors.blue("Request: ") + colors.cyan(comics.page))

        if (typeof comics.item.ignore !== "undefined" && comics.item.ignore === true) {
            console.log(colors.blue("Status: ") + colors.grey("Ignore Manga Request"))
        } else {
            const comic = await ComicChapters.listChapterRequest(comics.http,
                comics.extension, comics.item.url)

            if (typeof comic !== "undefined") {
                console.log(colors.blue("Status: ") + colors.cyan("WriteDetail"))
                await Info.writeDetail(comic)
                console.log(colors.blue("Status: ") + colors.cyan("WriteCover"))
                await Info.writeCover(comic)

                let chapter
                let hasChapterNew = false

                for (let j = 0; j < comic.chapters.length; ++j) {
                    chapter = comic.chapters[j]

                    if (typeof chapter.chap === "undefined" ||
                        chapter.chap == -1 || chapter.chap > comics.item.chap)
                    {
                        let logRequestStr = colors.blue("Status: ") +
                            colors.green("Request list image chap ") +
                            colors.magenta.bold(chapter.chap.toString()) +
                            colors.cyan("/") + colors.red.bold(comic.chapters[comic
                                .chapters.length - 1].chap.toString()) +
                            colors.cyan(" => ") + colors.yellow.bold("$current") +
                            colors.cyan("/") + colors.red.bold("$total") + colors.cyan(" images")

                        process.stdout.write(logRequestStr
                            .replace("$current", "0")
                            .replace("$total", "0"))

                        const images = await ChapterImages.listImageRequest(comics.extension,
                            comic, chapter)

                        logRequestStr = logRequestStr.replace("$total",
                            images.length.toString())

                        hasChapterNew = true
                        await Info.writeComicInfo(comic, chapter)

                        for (let k = 0; k < images.length; ++k) {
                            if (comics.extension.imageEntryBlock(images[k].original)) {
                                await ChapterImages.downloadImage(comics.extension,
                                    comic, chapter, images[k])
                            }

                            process.stdout.clearLine(0)
                            process.stdout.cursorTo(0)
                            process.stdout.write(logRequestStr.replace("$current", (k + 1).toString()))
                        }

                        process.stdout.write("\n")
                        listCache[i].chap = chapter.chap
                        await Info.writeListLock(listCache)
                    }
                }

                if (hasChapterNew)
                    console.log(colors.blue("End: ") + colors.green("There's a new chapter"))
                else
                    console.log(colors.blue("End: ") + colors.gray("No new chapters yet"))
            } else {
                console.error(colors.blue("Status: ") + colors.red("Error request list chapter"))
            }
        }

        console.log("")
    }
})()
