import { Encoding, loadSync } from "opentype.js"
import { ICell } from "../../neovim"

export interface ILigatureGroupLocation {
    startingCellRowIndex: number
    startingCellColumnIndex: number
    length: number
}

interface ILigatureSubstitution {
    sub: number[]
    by: number
}

export class LigatureGroupLocator {
    private _encoding: Encoding
    private _ligatureMap: Map<number, number[][]>

    constructor() {
        this._initialize()
    }

    public getLigatureGroupLocations(
        columnCount: number,
        rowCount: number,
        getCell: (columnIndex: number, rowIndex: number) => ICell,
    ) {
        const ligatureGroupLocations = []

        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            let columnIndex = 0
            while (columnIndex < columnCount) {
                const cell = getCell(rowIndex, columnIndex)
                const cellGlyphId = this._getCellGlyphId(cell)
                const adjacentCellGlyphIds = [cellGlyphId]
                let ligatureLength = 0

                while (this._hasLigatureForGlyphIds(adjacentCellGlyphIds)) {
                    ligatureLength++
                    const adjacentCell = getCell(
                        rowIndex,
                        columnIndex + adjacentCellGlyphIds.length,
                    )
                    const adjacentCellGlyphId = this._getCellGlyphId(adjacentCell)
                    adjacentCellGlyphIds.push(adjacentCellGlyphId)
                }

                if (ligatureLength > 1) {
                    const ligatureGroupLocation: ILigatureGroupLocation = {
                        startingCellRowIndex: rowIndex,
                        startingCellColumnIndex: columnIndex,
                        length: ligatureLength,
                    }
                    ligatureGroupLocations.push(ligatureGroupLocation)
                }

                columnIndex += Math.min(ligatureLength, 1)
            }
        }

        return ligatureGroupLocations
    }

    private _initialize() {
        const font = loadSync("/Users/mane/Library/Fonts/FiraCode-Regular.otf")
        this._encoding = font.encoding
        const ligatureSubstitutions = (font.substitution as any).getLigatures(
            "liga",
        ) as ILigatureSubstitution[]
        this._ligatureMap = new Map<number, number[][]>()
        for (const ligatureSubstitution of ligatureSubstitutions) {
            const ligatureGlyphIds = ligatureSubstitution.sub
            const firstLigatureGlyphId = ligatureGlyphIds[0]
            let ligatureListForGlyphId = this._ligatureMap.get(firstLigatureGlyphId)
            if (!ligatureListForGlyphId) {
                ligatureListForGlyphId = []
                this._ligatureMap.set(firstLigatureGlyphId, ligatureListForGlyphId)
            }
            ligatureListForGlyphId.push(ligatureSubstitution.sub)
        }
    }

    private _getCellGlyphId(cell: ICell) {
        return this._encoding.charToGlyphIndex(cell.character)
    }

    private _hasLigatureForGlyphIds(glyphIds: number[]) {
        const possibleLigatures = this._ligatureMap.get(glyphIds[0])
        return (
            possibleLigatures &&
            possibleLigatures.length > 0 &&
            possibleLigatures.some(possibleLigature =>
                glyphIds.every((glyphId, index) => glyphId === possibleLigature[index]),
            )
        )
    }
}
