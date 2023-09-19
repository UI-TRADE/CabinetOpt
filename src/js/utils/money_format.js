import {  format, formatDefaultLocale } from "d3-format"

const formatConfig = {
  "decimal": ",",
  "thousands": "\u00a0",
  "grouping": [3],
  "currency": ["", ""] // rouble "\u00a0\u20bd"
}
formatDefaultLocale(formatConfig)

const decimalFormat = format("$,")
export { decimalFormat }