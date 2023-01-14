import colors from "colors"
import axios, { AxiosInstance } from "axios"
import { Extension, Comic } from './extenstion';
import { ItemList } from "./list"
import NetTruyenExt from "./nettruyen_ext"
import TruyenVnHot from "./truyenvnhot_ext"
import TeamLanhLungExt from "./teamlanhlung_ext"

export default class Comics {
    item: ItemList
    http: AxiosInstance | undefined
    extension: Extension | undefined
    page: string

    constructor(item: ItemList) {
        if (item.url.endsWith("/"))
            item.url = item.url.substring(0, item.url.length - 1)

        this.item = item
        this.page = item.url.substring(item
            .url.lastIndexOf("/") + 1)

        if (NetTruyenExt.isUrlExtension(item.url))
            this.extension = new NetTruyenExt()
        else if (TruyenVnHot.isUrlExtension(item.url))
            this.extension = new TruyenVnHot()
        else if (TeamLanhLungExt.isUrlExtension(item.url))
            this.extension = new TeamLanhLungExt()

        if (typeof this.extension !== "undefined") {
            this.http = axios.create({
                baseURL: this.extension.httpBaseUrl,
                withCredentials: false,
                headers: {
                    "Referer": this.extension.httpReferer
                }
            })
        }
    }
}
