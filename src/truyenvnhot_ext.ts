import {
    Extension,
    ResultRegex,
    ChapterResultRegex,
    ImageResultRegex,
    ComicStatus
} from "./extenstion"

const AUTHOR_STATUS_UPDATING = "Đang cập nhật"
const COMIC_STATUS_COMPLETED = "Hoàn thành"
const COMIC_STATUS_ONGOING = "Đang tiến hành"

const IMAGE_BLOCKS = [
    "CREDIT-NHOM-DICH-TRUYENVN-GG.jpg",
    "CREDIT-TRUYENVN-FROM-SEPT.jpg",
    "CREDIT-NHOM-DICH-LAO-MIEU-TRUYENVN-GG.jpg",
    "theo-doi.jpg"
]

export default class TruyenVnHot extends Extension {
    httpBaseUrl: string = "https://truyenvnmoi.net"
    httpReferer: string = "https://truyenvnmoi.net"
    directoryStorage: string = "truyenvnhot"

    chapterTitleRegex(): ResultRegex {
        return /<h1 class="name font-15x font-bold">(.+?)<\/h1>/g
    }

    chapterThumbRegex(): ResultRegex {
        return /<div class="book shadow rounded mx-auto">.+?src="(.+?)".+?<\/div>/g
    }

    chapterInfoRegex(): ResultRegex {
        return /<div class="meta-data mb-3">(.+?)<div class="actions/g
    }

    chapterListRegex(): ResultRegex {
        return /<section id="chapterList">.+?border">(.+?)<\/div>\s+<\/section>/g
    }

    infoAuthorRegex(): ResultRegex {
        return /<div class="author mb-3">.+?href=".+?">(.+?)<\/a>/g
    }

    infoStatusRegex(): ResultRegex {
        return /<div class="status mb-3">.+?<\/span>\s*(.+?)<\/div>/g
    }

    infoGenreListRegex(): ResultRegex {
        return /<div class="genre mb-3">(.+?)<\/div>/g
    }

    infoDescriptionRegex(): ResultRegex {
        return /<div class="comic-description lh-16 long-desc">.+?">\s*(.+?)\s*<\/div>/g
    }

    infoSeoUrlRegex(): ResultRegex {
        return /\/([a-zA-Z0-9\-\_\.]+)$/gi
    }

    genreEntryRegex(): ResultRegex {
        return /<a.+?href=.+?>(.+?)<\/a>/g
    }

    chapEntryRegex(): ChapterResultRegex {
        return {
            regex: /<a href="(.+?)".+?">.+?Chương (\d+)<\/span>/g,
            uriAt: 1, chapAt: 2, labelAt: -1
        }
    }

    imageListRegex(): ResultRegex {
        return /<div class="chapter-content.+?<\/a>\s*<\/div>(.+?)<\/div>/g
    }

    imageEntryRegex(): ImageResultRegex {
        return {
            regex: /<img loading="lazy".+?src="(.+?)">/g,
            pageAt: -1, srcAt: 1
        }
    }

    authorReplaceRegex(): ResultRegex {
        return /<a href=.+?>(.+?)<\/a>/gi
    }

    isAuthorStatusUpdating(author: string): boolean {
        return author == AUTHOR_STATUS_UPDATING
    }

    imageEntryAllow(url: string): boolean {
        const filter = IMAGE_BLOCKS.filter(value => {
            return url.endsWith(value)
        }) || []

        return filter.length <= 0
    }

    static isUrlExtension(url: string): boolean {
        return url.match(/^(http|https):\/\/(www.)?truyenvnmoi.[a-z]+/gi) !== null
    }

    comicStatus(status: string): ComicStatus {
        if (status == COMIC_STATUS_ONGOING)
            return ComicStatus.ONGOING
        else if (status == COMIC_STATUS_COMPLETED)
            return ComicStatus.COMPLETED

        return ComicStatus.UNKNOWN
    }

}
