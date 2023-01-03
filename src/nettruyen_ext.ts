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

export default class NetTruyenExt extends Extension {
    httpBaseUrl: string = "https://www.nettruyenme.com"
    httpReferer: string = "https://www.nettruyenme.com"

    chapterTitleRegex(): ResultRegex {
        return /<h1 class="title-detail">(.+?)<\/h1>/g }

    chapterThumbRegex(): ResultRegex {
        return /<div class="detail-info">.+?<div class="col-xs-4 col-image">.+?src="(.+?)".+?<\/div>/g }

    chapterInfoRegex(): ResultRegex {
        return /<div class="detail-info">.+?<ul class="list-info">(.+?)<\/ul>/g }

    chapterListRegex(): ResultRegex {
        return /<div class="list-chapter" id="nt_listchapter">.+?<nav>.*?<ul>(.+?)<\/ul>/g }

    infoAuthorRegex(): ResultRegex {
        return /<li class="author.+?<p class="col-xs-8">(.+?)<\/p>/g }

    infoStatusRegex(): ResultRegex {
        return /<li class="status.+?<p class="col-xs-8">(.+?)<\/p>/g }

    infoKindListRegex(): ResultRegex {
        return /<li class="kind.+?<p class="col-xs-8">(.+?)<\/p>/g }

    infoDescriptionRegex(): ResultRegex {
        return /<div class="detail-content"><p.+?>(.+?)<\/p>/g }

    infoSeoUrlRegex(): ResultRegex {
        return /\/([a-zA-Z0-9\-\_\.]+)(-\d*)$/gi }

    genreEntryRegex(): ResultRegex {
        return /<a href=.+?>(.+?)<\/a>/g }

    chapEntryRegex(): ChapterResultRegex {
        return {
            regex: /<li class="row.+?<a href="(.+?)" data-id="\d+">Chapter\s+([0-9.]+):?\s*-?\s*(.*?)\.?<\/a>.+?<\/li>/g,
            uriAt: 1, chapAt: 2, labelAt: 3
        }
    }

    imageListRegex(): ResultRegex {
        return /<div class="reading-detail box_doc">(.+?)<div class="container">/g }

    imageEntryRegex(): ImageResultRegex {
        return {
            regex: /<div id="page.+?<img.+?data-index="(\d+)".+?data-original="(.+?)"/g,
            pageAt: 1, srcAt: 2
        }
    }

    authorReplaceRegex(): ResultRegex {
        return /<a href=.+?>(.+?)<\/a>/gi }

    isAuthorStatusUpdating(author: string): boolean {
        return author == AUTHOR_STATUS_UPDATING
    }

    static isUrlExtension(url: string): boolean {
        return url.match(/^(http|https)\:\/\/(www.)?nettruyen([a-z0-9]+).[a-z]+/gi) !== null
    }

    comicStatus(status: string): ComicStatus {
        if (status == COMIC_STATUS_ONGOING)
            return ComicStatus.ONGOING
        else if (status == COMIC_STATUS_COMPLETED)
            return ComicStatus.COMPLETED

        return ComicStatus.UNKNOWN
    }
}
