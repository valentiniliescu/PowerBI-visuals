﻿/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *   
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *   
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

/// <reference path="../_references.ts"/>

module powerbi {

    import shapes = powerbi.visuals.shapes;
    import ISize = shapes.ISize;
    import IRect = powerbi.visuals.IRect;
    import IPoint = shapes.IPoint;
    import SelectableDataPoint = powerbi.visuals.SelectableDataPoint;
    import Rect = powerbi.visuals.shapes.Rect;

    /**
     * Defines possible data label positions relative to rectangles
     */
    export enum RectLabelPosition {

        /** Position is not defined. */
        None = 0,
        
        /** Content is placed inside the parent rectangle in the center. */
        InsideCenter = 1,

        /** Content is placed inside the parent rectangle at the base. */
        InsideBase = 2,

        /** Content is placed inside the parent rectangle at the end. */
        InsideEnd = 4,

        /** Content is placed outside the parent rectangle at the base. */
        OutsideBase = 8,

        /** Content is placed outside the parent rectangle at the end. */
        OutsideEnd = 16,

        /** Content supports all possible positions. */
        All =
        InsideCenter |
        InsideBase |
        InsideEnd |
        OutsideBase |
        OutsideEnd,

        /** Content supports positions inside the rectangle */
        InsideAll =
        InsideCenter |
        InsideBase |
        InsideEnd,
    }
    
    /**
     * Defines possible data label positions relative to points or circles
     */
    export enum NewPointLabelPosition {
        /** Position is not defined. */
        None = 0,

        Above = 1 << 0,

        Below = 1 << 1,

        Left = 1 << 2,

        Right = 1 << 3,

        BelowRight = 1 << 4,

        BelowLeft = 1 << 5,

        AboveRight = 1 << 6,

        AboveLeft = 1 << 7,

        Center = 1 << 8,

        All = 
        Above |
        Below |
        Left |
        Right |
        BelowRight |        
        BelowLeft |       
        AboveRight |        
        AboveLeft |
        Center,
    }
    
    /**
     * Rectangle orientation, defined by vertical vs horizontal and which direction
     * the "base" is at.
     */
    export enum NewRectOrientation {
        /** Rectangle with no specific orientation. */
        None,

        /** Vertical rectangle with base at the bottom. */
        VerticalBottomBased,

        /** Vertical rectangle with base at the top. */
        VerticalTopBased,

        /** Horizontal rectangle with base at the left. */
        HorizontalLeftBased,

        /** Horizontal rectangle with base at the right. */
        HorizontalRightBased,
    }
    
    export const enum LabelDataPointParentType {
        /* parent shape of data label is a point*/
        Point,
        
        /* parent shape of data label is a rectangle*/
        Rectangle,
        
        /* parent shape of data label is a polygon*/
        Polygon
    }

    export interface LabelParentRect {
        /** The rectangle this data label belongs to */
        rect: IRect;

        /** The orientation of the parent rectangle */
        orientation: NewRectOrientation;

        /** Valid positions to place the label ordered by preference */
        validPositions: RectLabelPosition[];
    }

    export interface LabelParentPoint {
        /** The point this data label belongs to */
        point: IPoint;

        /** The radius of the point to be added to the offset (for circular geometry) */
        radius: number;
        
        /** Valid positions to place the label ordered by preference */
        validPositions: NewPointLabelPosition[];
    }

    export interface LabelDataPoint {
        /** Text to be displayed in the label */
        text: string;

        /** The measured size of the text */
        textSize: ISize;

        /** Is data label preferred? Preferred labels will be rendered first */
        isPreferred: boolean;

        /** Color to use for the data label if drawn inside */
        insideFill: string;

        /** Color to use for the data label if drawn outside */
        outsideFill: string;

        /** Whether or not the data label has been rendered */
        hasBeenRendered?: boolean;

        /** Whether the parent type is a rectangle, point or polygon */
        parentType: LabelDataPointParentType;

        /** The parent geometry for the data label */
        parentShape: LabelParentRect | LabelParentPoint | LabelParentPolygon;

        /** The identity of the data point associated with the data label */
        identity: powerbi.visuals.SelectionId;

        /** The font size of the data point associated with the data label */
        fontSize?: number;

        /** Second row of text to be displayed in the label, for additional information */
        secondRowText?: string;
        /** The calculated weight of the data point associated with the data label */
        weight?: number;
    }

    export interface LabelDataPointsGroup {
        labelDataPoints: LabelDataPoint[];
        maxNumberOfLabels: number;
    }

    export interface Label extends SelectableDataPoint {
        /** Text to be displayed in the label */
        text: string;

        /** Second row of text to be displayed in the label */
        secondRowText?: string;

        /** The bounding box for the label */
        boundingBox: IRect;

        /** Whether or not the data label should be rendered */
        isVisible: boolean;

        /** The fill color of the data label */
        fill: string;

        /** The text size of the data label */
        fontSize?: number;

        /**"A text anchor used to override the default label text-anchor (middle)"*/
        textAnchor?: string; 

        /** points for reference line rendering */
        leaderLinePoints?: number[][];
    }
    
    export interface GridSubsection {
        xMin: number;
        xMax: number;
        yMin: number;
        yMax: number;
    }

    export class LabelArrangeGrid {
        private grid: IRect[][][];
        private viewport: IViewport;
        private cellSize: ISize;
        private columnCount: number;
        private rowCount: number;
        private horizontalMargin: number;
        private verticalMargin: number;

        /** 
         * A multiplier applied to the largest width height to attempt to balance # of
         * labels in each cell and number of cells each label belongs to
         */
        private static cellSizeMultiplier = 2;

        constructor(labelDataPointsGroups: LabelDataPointsGroup[], viewport: IViewport, horizontalMargin?: number, verticalMargin?: number) {
            this.viewport = viewport;
            this.horizontalMargin = horizontalMargin;
            this.verticalMargin = verticalMargin;

            let maxLabelWidth = 0;
            let maxLabelHeight = 0;

            for (let labelDataPointsGroup of labelDataPointsGroups) {
                for (let labelDataPoint of labelDataPointsGroup.labelDataPoints) {
                if (labelDataPoint.isPreferred) {
                    let dataLabelSize: ISize = labelDataPoint.textSize;
                    if (dataLabelSize.width > maxLabelWidth) {
                        maxLabelWidth = dataLabelSize.width;
                    }
                    if (dataLabelSize.height > maxLabelHeight) {
                        maxLabelHeight = dataLabelSize.height;
                    }
                }
            }
            }

            if (maxLabelWidth === 0) {
                maxLabelWidth = viewport.width;
            }
            if (maxLabelHeight === 0) {
                maxLabelHeight = viewport.height;
            }
            let cellSize = this.cellSize = { width: maxLabelWidth * LabelArrangeGrid.cellSizeMultiplier, height: maxLabelHeight * LabelArrangeGrid.cellSizeMultiplier };
            this.columnCount = LabelArrangeGrid.getCellCount(cellSize.width, viewport.width, 1, 100);
            this.rowCount = LabelArrangeGrid.getCellCount(cellSize.height, viewport.height, 1, 100);
            let grid: IRect[][][] = [];
            for (let i = 0, ilen = this.columnCount; i < ilen; i++) {
                grid[i] = [];
                for (let j = 0, jlen = this.rowCount; j < jlen; j++) {
                    grid[i][j] = [];
                }
            }
            this.grid = grid;
        }

        private padRectangle(rectParam: IRect): IRect {
            let rect: IRect = rectParam;
            if (this.horizontalMargin || this.verticalMargin) {
                rect = Rect.clone(rectParam);
                if (this.horizontalMargin) {
                    rect.left -= this.horizontalMargin;
                    rect.width += 2 * this.horizontalMargin;
                }

                if (this.verticalMargin) {
                    rect.top -= this.verticalMargin;
                    rect.height += 2 * this.verticalMargin;
                }
            }

            return rect;
        }

        public add(rectParam: IRect): void {
            let rect: IRect = this.padRectangle(rectParam);
            let containingIndexRect = this.getContainingGridSubsection(rect);

            for (let x = containingIndexRect.xMin; x < containingIndexRect.xMax; x++) {
                for (let y = containingIndexRect.yMin; y < containingIndexRect.yMax; y++) {
                    this.grid[x][y].push(rect);
                }
            }
        }

        public hasConflict(rectParam: IRect): boolean {
            let rect: IRect = this.padRectangle(rectParam);

            if (!this.isWithinGridViewport(rect)) {
                return true;
            }

            let containingIndexRect = this.getContainingGridSubsection(rect);
            let grid = this.grid;
            let isIntersecting = shapes.Rect.isIntersecting;
            for (let x = containingIndexRect.xMin; x < containingIndexRect.xMax; x++) {
                for (let y = containingIndexRect.yMin; y < containingIndexRect.yMax; y++) {
                    for (let currentGridRect of grid[x][y]) {
                        if (isIntersecting(currentGridRect, rect)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        private isWithinGridViewport(rect: IRect): boolean {
            return rect.left >= 0 &&
                rect.top >= 0 &&
                rect.left + rect.width <= this.viewport.width &&
                rect.top + rect.height <= this.viewport.height;
        }

        private getContainingGridSubsection(rect: IRect): GridSubsection {
            return {
                xMin: LabelArrangeGrid.bound(Math.floor(rect.left / this.cellSize.width), 0, this.columnCount),
                xMax: LabelArrangeGrid.bound(Math.ceil((rect.left + rect.width) / this.cellSize.width), 0, this.columnCount),
                yMin: LabelArrangeGrid.bound(Math.floor(rect.top / this.cellSize.height), 0, this.rowCount),
                yMax: LabelArrangeGrid.bound(Math.ceil((rect.top + rect.height) / this.cellSize.height), 0, this.rowCount),
            };
        }

        private static getCellCount(step: number, length: number, minCount: number, maxCount: number): number {
            return LabelArrangeGrid.bound(Math.ceil(length / step), minCount, maxCount);
        }

        private static bound(value: number, min: number, max: number): number {
            return Math.max(Math.min(value, max), min);
        }
    }

    export interface DataLabelLayoutOptions {
        /** The amount of offset to start with when the data label is not centered */
        startingOffset: number;
        /** Maximum distance labels will be offset by */
        maximumOffset: number;
        /** The amount to increase the offset each attempt while laying out labels */
        offsetIterationDelta?: number;
        /** Horizontal padding used for checking whether a label is inside a parent shape */
        horizontalPadding?: number;
        /** Vertical padding used for checking whether a label is inside a parent shape */
        verticalPadding?: number;
        /** Should we draw reference lines in case the label offset is greater then the default */
        allowLeaderLines?: boolean;
    }

    export class LabelLayout {
        /** Maximum distance labels will be offset by */
        private maximumOffset: number;
        /** The amount to increase the offset each attempt while laying out labels */
        private offsetIterationDelta: number;
        /** The amount of offset to start with when the data label is not centered */
        private startingOffset: number;
        /** Padding used for checking whether a label is inside a parent shape */
        private horizontalPadding: number;
        /** Padding used for checking whether a label is inside a parent shape */
        private verticalPadding: number;
        /** Should we draw leader lines in case the label offset is greater then the default */
        private allowLeaderLines: boolean;

        // Default values
        private static defaultOffsetIterationDelta = 2;
        private static defaultHorizontalPadding = 2;
        private static defaultVerticalPadding = 2;

        constructor(options: DataLabelLayoutOptions) {
            this.startingOffset = options.startingOffset;
            this.maximumOffset = options.maximumOffset;
            if (options.offsetIterationDelta != null) {
                debug.assert(options.offsetIterationDelta > 0, "label offset delta must be greater than 0");
                this.offsetIterationDelta = options.offsetIterationDelta;
            }
            else {
                this.offsetIterationDelta = LabelLayout.defaultOffsetIterationDelta;
            }
            if (options.horizontalPadding != null) {
                this.horizontalPadding = options.horizontalPadding;
            }
            else {
                this.horizontalPadding = LabelLayout.defaultHorizontalPadding;
            }
            if (options.verticalPadding != null) {
                this.verticalPadding = options.verticalPadding;
            }
            else {
                this.verticalPadding = LabelLayout.defaultVerticalPadding;
            }
            this.allowLeaderLines = !!options.allowLeaderLines;
        }
        /**
         * Arrange takes a set of data labels and lays them out in order, assuming that
         * the given array has already been sorted with the most preferred labels at the
         * front, taking into considiration a maximum number of labels that are alowed
         * to display.
         * 
         * Details:
         * - We iterate over offsets from the target position, increasing from 0 while
         *      verifiying the maximum number of labels to display hasn't been reached
         * - For each offset, we iterate over each data label
         * - For each data label, we iterate over each position that is valid for
         *     both the specific label and this layout
         * - When a valid position is found, we position the label there and no longer
         *     reposition it.
         * - This prioritizes the earlier labels to be positioned closer to their
         *     target points in the position they prefer.
         * - This prioritizes putting data labels close to a valid position over
         *     placing them at their preferred position (it will place it at a less
         *     preferred position if it will be a smaller offset)
         */
        public layout(labelDataPointsGroups: LabelDataPointsGroup[], viewport: IViewport): Label[] {
            // Clear data labels for a new layout
            for (let labelDataPointsGroup of labelDataPointsGroups) {
                for (let labelPoint of labelDataPointsGroup.labelDataPoints) {
                    labelPoint.hasBeenRendered = false;
                }
            }

            let resultingDataLabels: Label[] = [];
            let grid = new LabelArrangeGrid(labelDataPointsGroups, viewport);

            // Iterates on every series
            for (let labelDataPointsGroup of labelDataPointsGroups) {
                let maxLabelsToRender = labelDataPointsGroup.maxNumberOfLabels;
                let labelDataPoints = labelDataPointsGroup.labelDataPoints;
            let preferredLabels: LabelDataPoint[] = [];
                
                // Exclude preferred labels
                for (let j = labelDataPoints.length - 1, localMax = maxLabelsToRender; j >= 0 && localMax > 0; j--) {
                    let labelPoint = labelDataPoints[j];
                if (labelPoint.isPreferred) {
                        preferredLabels.unshift(labelDataPoints.splice(j, 1)[0]);
                        localMax--;
                }
            }

                // First iterate all the preferred labels
                if (preferredLabels.length > 0) {
                    let positionedLabels = this.positionDataLabels(preferredLabels, viewport, grid, maxLabelsToRender);
                    maxLabelsToRender -= positionedLabels.length;
                    resultingDataLabels = resultingDataLabels.concat(positionedLabels);
                }
            
            // While there are invisible not preferred labels and label distance is less than the max
            // allowed distance
            if (labelDataPoints.length > 0) {
                    let labels = this.positionDataLabels(labelDataPoints, viewport, grid, maxLabelsToRender);
                resultingDataLabels = resultingDataLabels.concat(labels);
            }
            // TODO: Add reference lines if we want them
            }
            return resultingDataLabels;
        }

        private positionDataLabels(labelDataPoints: LabelDataPoint[], viewport: IViewport, grid: LabelArrangeGrid, maxLabelsToRender: number): Label[] {
            let resultingDataLabels: Label[] = [];
            let offsetDelta = this.offsetIterationDelta;
            let currentOffset = this.startingOffset;
            let currentCenteredOffset = 0;
            let drawLeaderLinesOnIteration: boolean;

            while (currentOffset <= this.maximumOffset && maxLabelsToRender > 0) {
                drawLeaderLinesOnIteration = this.allowLeaderLines && currentOffset > this.startingOffset;
                for (let labelPoint of labelDataPoints) {
                    // Check if maximum number of labels to display has been reached
                    if (maxLabelsToRender === 0)
                        break;

                    if (labelPoint.hasBeenRendered) {
                        continue;
                    }
                    let dataLabel;
                    if (labelPoint.parentType === LabelDataPointParentType.Rectangle) {
                        dataLabel = this.tryPositionForRectPositions(labelPoint, grid, currentOffset, currentCenteredOffset);
                    }
                    else {
                        dataLabel = this.tryPositionForPointPositions(labelPoint, grid, currentOffset, drawLeaderLinesOnIteration);
                    }

                    if (dataLabel) {
                        resultingDataLabels.push(dataLabel);
                        maxLabelsToRender--;
                    }
                }
                currentOffset += offsetDelta;
                currentCenteredOffset += offsetDelta;
            }

            return resultingDataLabels;
        }

        private tryPositionForRectPositions(labelPoint: LabelDataPoint, grid: LabelArrangeGrid, currentLabelOffset: number, currentCenteredLabelOffset: number): Label {
            // Iterate over all positions that are valid for the data point
            for (let position of (<LabelParentRect>labelPoint.parentShape).validPositions) {
                let isPositionInside = position & RectLabelPosition.InsideAll;
                if (isPositionInside && !DataLabelRectPositioner.canFitWithinParent(labelPoint, this.horizontalPadding, this.verticalPadding)) {
                    continue;
                }

                let resultingBoundingBox = LabelLayout.tryPositionRect(grid, position, labelPoint, currentLabelOffset, currentCenteredLabelOffset);
                if (resultingBoundingBox) {
                    if (isPositionInside && !DataLabelRectPositioner.isLabelWithinParent(resultingBoundingBox, labelPoint, this.horizontalPadding, this.verticalPadding)) {
                        continue;
                    }
                    grid.add(resultingBoundingBox);
                    labelPoint.hasBeenRendered = true;
                    return {
                        boundingBox: resultingBoundingBox,
                        text: labelPoint.text,
                        isVisible: true,
                        fill: isPositionInside ? labelPoint.insideFill : labelPoint.outsideFill,
                        identity: labelPoint.identity,
                        fontSize: labelPoint.fontSize,
                        selected: false,
                    };
                }
            }
            return null;
        }

        /**
         * Tests a particular position/offset combination for the given data label.
         * If the label can be placed, returns the resulting bounding box for the data
         * label.  If not, returns null.
         */
        private static tryPositionRect(grid: LabelArrangeGrid, position: RectLabelPosition, labelDataPoint: LabelDataPoint, offset: number, centerOffset: number): IRect {
            let offsetForPosition = offset;
            if (position & RectLabelPosition.InsideCenter) {
                offsetForPosition = centerOffset;
            }
            let labelRect = DataLabelRectPositioner.getLabelRect(labelDataPoint, position, offsetForPosition);

            if (position !== RectLabelPosition.InsideCenter || (<LabelParentRect>labelDataPoint.parentShape).orientation === NewRectOrientation.None) {
                if (!grid.hasConflict(labelRect)) {
                    return labelRect;
                }
            }
            else {
                // If the position is centered, attempt to offset in both a positive and negative direction
                if (!grid.hasConflict(labelRect)) {
                    return labelRect;
                }
                labelRect = DataLabelRectPositioner.getLabelRect(labelDataPoint, position, -offsetForPosition);
                if (!grid.hasConflict(labelRect)) {
                    return labelRect;
                }
            }

            return null;
        }

        private tryPositionForPointPositions(labelPoint: LabelDataPoint, grid: LabelArrangeGrid, currentLabelOffset: number, drawLeaderLines: boolean): Label {
            // Iterate over all positions that are valid for the data point
            let parentShape = (<LabelParentPoint>labelPoint.parentShape);
            for (let position of parentShape.validPositions) {
                let resultingBoundingBox = LabelLayout.tryPositionPoint(grid, position, labelPoint, currentLabelOffset);
                if (resultingBoundingBox) {
                    grid.add(resultingBoundingBox);
                    labelPoint.hasBeenRendered = true;
                    return {
                        boundingBox: resultingBoundingBox,
                        text: labelPoint.text,
                        isVisible: true,
                        fill: position === NewPointLabelPosition.Center ? labelPoint.insideFill : labelPoint.outsideFill, // If we ever support "inside" for point-based labels, this needs to be updated
                        isInsideParent: position === NewPointLabelPosition.Center,
                        identity: labelPoint.identity,
                        fontSize: labelPoint.fontSize,
                        selected: false,
                        leaderLinePoints: drawLeaderLines ? DataLabelPointPositioner.getLabelLeaderLineEndingPoint(resultingBoundingBox, position, parentShape) : null,
                    };
                }
            }
            return null;
        }

        private static tryPositionPoint(grid: LabelArrangeGrid, position: NewPointLabelPosition, labelDataPoint: LabelDataPoint, offset: number): IRect {
            let labelRect = DataLabelPointPositioner.getLabelRect(labelDataPoint, position, offset);
            
            if (!grid.hasConflict(labelRect)) {
                return labelRect;
            }

            return null;
        }
    }
    
    /**
     * (Private) Contains methods for calculating the bounding box of a data label
     */
    export module DataLabelRectPositioner {
        
        export function getLabelRect(labelDataPoint: LabelDataPoint, position: RectLabelPosition, offset: number): IRect {
            let parentRect: LabelParentRect = <LabelParentRect>labelDataPoint.parentShape;
            if (parentRect != null) {
                // Each combination of position and orientation results in a different actual positioning, which is then called.
                switch (position) {
                    case RectLabelPosition.InsideCenter:
                        switch (parentRect.orientation) {
                            case NewRectOrientation.VerticalBottomBased:
                            case NewRectOrientation.VerticalTopBased:
                                return DataLabelRectPositioner.middleVertical(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.HorizontalLeftBased:
                            case NewRectOrientation.HorizontalRightBased:
                                return DataLabelRectPositioner.middleHorizontal(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.None:
                            // TODO: which of the above cases should we default to for rects with no orientation?
                        }
                    case RectLabelPosition.InsideBase:
                        switch (parentRect.orientation) {
                            case NewRectOrientation.VerticalBottomBased:
                                return DataLabelRectPositioner.bottomInside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.VerticalTopBased:
                                return DataLabelRectPositioner.topInside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.HorizontalLeftBased:
                                return DataLabelRectPositioner.leftInside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.HorizontalRightBased:
                                return DataLabelRectPositioner.rightInside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.None:
                            // TODO: which of the above cases should we default to for rects with no orientation?
                        }
                    case RectLabelPosition.InsideEnd:
                        switch (parentRect.orientation) {
                            case NewRectOrientation.VerticalBottomBased:
                                return DataLabelRectPositioner.topInside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.VerticalTopBased:
                                return DataLabelRectPositioner.bottomInside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.HorizontalLeftBased:
                                return DataLabelRectPositioner.rightInside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.HorizontalRightBased:
                                return DataLabelRectPositioner.leftInside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.None:
                            // TODO: which of the above cases should we default to for rects with no orientation?
                        }
                    case RectLabelPosition.OutsideBase:
                        switch (parentRect.orientation) {
                            case NewRectOrientation.VerticalBottomBased:
                                return DataLabelRectPositioner.bottomOutside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.VerticalTopBased:
                                return DataLabelRectPositioner.topOutside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.HorizontalLeftBased:
                                return DataLabelRectPositioner.leftOutside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.HorizontalRightBased:
                                return DataLabelRectPositioner.rightOutside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.None:
                            // TODO: which of the above cases should we default to for rects with no orientation?
                        }
                    case RectLabelPosition.OutsideEnd:
                        switch (parentRect.orientation) {
                            case NewRectOrientation.VerticalBottomBased:
                                return DataLabelRectPositioner.topOutside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.VerticalTopBased:
                                return DataLabelRectPositioner.bottomOutside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.HorizontalLeftBased:
                                return DataLabelRectPositioner.rightOutside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.HorizontalRightBased:
                                return DataLabelRectPositioner.leftOutside(labelDataPoint.textSize, parentRect.rect, offset);
                            case NewRectOrientation.None:
                            // TODO: which of the above cases should we default to for rects with no orientation?
                        }
                    default:
                        debug.assertFail("Unsupported label position");
                }
            }
            else {
                // TODO: Data labels for non-rectangular visuals (line chart)
            }
            return null;
        }

        export function canFitWithinParent(labelDataPoint: LabelDataPoint, horizontalPadding: number, verticalPadding: number): boolean {
            return (labelDataPoint.textSize.width + 2 * horizontalPadding < (<LabelParentRect>labelDataPoint.parentShape).rect.width) ||
                (labelDataPoint.textSize.height + 2 * verticalPadding < (<LabelParentRect>labelDataPoint.parentShape).rect.height);
        }

        export function isLabelWithinParent(labelRect: IRect, labelPoint: LabelDataPoint, horizontalPadding: number, verticalPadding: number): boolean {
            let parentRect = (<LabelParentRect>labelPoint.parentShape).rect;
            let labelRectWithPadding = shapes.Rect.inflate(labelRect, { left: horizontalPadding, right: horizontalPadding, top: verticalPadding, bottom: verticalPadding });
            return shapes.Rect.containsPoint(parentRect, {
                x: labelRectWithPadding.left,
                y: labelRectWithPadding.top,
            }) && shapes.Rect.containsPoint(parentRect, {
                x: labelRectWithPadding.left + labelRectWithPadding.width,
                y: labelRectWithPadding.top + labelRectWithPadding.height,
            });
        }

        export function topInside(labelSize: ISize, parentRect: IRect, offset: number): IRect {
            return {
                left: parentRect.left + parentRect.width / 2.0 - labelSize.width / 2.0,
                top: parentRect.top + offset,
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function bottomInside(labelSize: ISize, parentRect: IRect, offset: number): IRect {
            return {
                left: parentRect.left + parentRect.width / 2.0 - labelSize.width / 2.0,
                top: (parentRect.top + parentRect.height) - offset - labelSize.height,
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function rightInside(labelSize: ISize, parentRect: IRect, offset: number): IRect {
            return {
                left: (parentRect.left + parentRect.width) - labelSize.width - offset,
                top: parentRect.top + parentRect.height / 2.0 - labelSize.height / 2.0,
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function leftInside(labelSize: ISize, parentRect: IRect, offset: number): IRect {
            return {
                left: parentRect.left + offset,
                top: parentRect.top + parentRect.height / 2.0 - labelSize.height / 2.0,
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function topOutside(labelSize: ISize, parentRect: IRect, offset: number): IRect {
            return {
                left: parentRect.left + parentRect.width / 2.0 - labelSize.width / 2.0,
                top: parentRect.top - labelSize.height - offset,
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function bottomOutside(labelSize: ISize, parentRect: IRect, offset: number): IRect {
            return {
                left: parentRect.left + parentRect.width / 2.0 - labelSize.width / 2.0,
                top: (parentRect.top + parentRect.height) + offset,
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function rightOutside(labelSize: ISize, parentRect: IRect, offset: number): IRect {
            return {
                left: (parentRect.left + parentRect.width) + offset,
                top: parentRect.top + parentRect.height / 2.0 - labelSize.height / 2.0,
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function leftOutside(labelSize: ISize, parentRect: IRect, offset: number): IRect {
            return {
                left: parentRect.left - labelSize.width - offset,
                top: parentRect.top + parentRect.height / 2.0 - labelSize.height / 2.0,
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function middleHorizontal(labelSize: ISize, parentRect: IRect, offset: number): IRect {
            return {
                left: parentRect.left + parentRect.width / 2.0 - labelSize.width / 2.0 + offset,
                top: parentRect.top + parentRect.height / 2.0 - labelSize.height / 2.0,
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function middleVertical(labelSize: ISize, parentRect: IRect, offset: number): IRect {
            return {
                left: parentRect.left + parentRect.width / 2.0 - labelSize.width / 2.0,
                top: parentRect.top + parentRect.height / 2.0 - labelSize.height / 2.0 + offset,
                width: labelSize.width,
                height: labelSize.height
            };
        }
    }

    export module DataLabelPointPositioner {
        export const cos45 = Math.cos(45);
        export const sin45 = Math.sin(45);

        export function getLabelRect(labelDataPoint: LabelDataPoint, position: NewPointLabelPosition, offset: number): IRect {
            let parentPoint = <LabelParentPoint>labelDataPoint.parentShape;
            switch (position) {
                case NewPointLabelPosition.Above: {
                    return DataLabelPointPositioner.above(labelDataPoint.textSize, parentPoint.point, parentPoint.radius + offset);
                }
                case NewPointLabelPosition.Below: {
                    return DataLabelPointPositioner.below(labelDataPoint.textSize, parentPoint.point, parentPoint.radius + offset);
                }
                case NewPointLabelPosition.Left: {
                    return DataLabelPointPositioner.left(labelDataPoint.textSize, parentPoint.point, parentPoint.radius + offset);
                }
                case NewPointLabelPosition.Right: {
                    return DataLabelPointPositioner.right(labelDataPoint.textSize, parentPoint.point, parentPoint.radius + offset);
                }
                case NewPointLabelPosition.BelowLeft: {
                    return DataLabelPointPositioner.belowLeft(labelDataPoint.textSize, parentPoint.point, parentPoint.radius + offset);
                }
                case NewPointLabelPosition.BelowRight: {
                    return DataLabelPointPositioner.belowRight(labelDataPoint.textSize, parentPoint.point, parentPoint.radius + offset);
                }
                case NewPointLabelPosition.AboveLeft: {
                    return DataLabelPointPositioner.aboveLeft(labelDataPoint.textSize, parentPoint.point, parentPoint.radius + offset);
                }
                case NewPointLabelPosition.AboveRight: {
                    return DataLabelPointPositioner.aboveRight(labelDataPoint.textSize, parentPoint.point, parentPoint.radius + offset);
                }
                case NewPointLabelPosition.Center: {
                    return DataLabelPointPositioner.center(labelDataPoint.textSize, parentPoint.point);
                }
                default: {
                    debug.assertFail("Unsupported label position");
                }
            }
            return null;
        }

        export function above(labelSize: ISize, parentPoint: IPoint, offset: number): IRect {
            return {
                left: parentPoint.x - (labelSize.width / 2),
                top: parentPoint.y - offset - labelSize.height,
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function below(labelSize: ISize, parentPoint: IPoint, offset: number): IRect {
            return {
                left: parentPoint.x - (labelSize.width / 2),
                top: parentPoint.y + offset,
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function left(labelSize: ISize, parentPoint: IPoint, offset: number): IRect {
            return {
                left: parentPoint.x - offset - labelSize.width,
                top: parentPoint.y - (labelSize.height / 2),
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function right(labelSize: ISize, parentPoint: IPoint, offset: number): IRect {
            return {
                left: parentPoint.x + offset,
                top: parentPoint.y - (labelSize.height / 2),
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function belowLeft(labelSize: ISize, parentPoint: IPoint, offset: number): IRect {
            return {
                left: parentPoint.x - (sin45 * offset) - labelSize.width,
                top: parentPoint.y + (cos45 * offset),
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function belowRight(labelSize: ISize, parentPoint: IPoint, offset: number): IRect {
            return {
                left: parentPoint.x + (sin45 * offset),
                top: parentPoint.y + (cos45 * offset),
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function aboveLeft(labelSize: ISize, parentPoint: IPoint, offset: number): IRect {
            return {
                left: parentPoint.x - (sin45 * offset) - labelSize.width,
                top: parentPoint.y - (cos45 * offset) - labelSize.height,
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function aboveRight(labelSize: ISize, parentPoint: IPoint, offset: number): IRect {
            return {
                left: parentPoint.x + (sin45 * offset),
                top: parentPoint.y - (cos45 * offset) - labelSize.height,
                width: labelSize.width,
                height: labelSize.height
            };
        }
        export function center(labelSize: ISize, parentPoint: IPoint): IRect {
            return {
                left: parentPoint.x - (labelSize.width / 2),
                top: parentPoint.y - (labelSize.height / 2),
                width: labelSize.width,
                height: labelSize.height
            };
        }

        export function getLabelLeaderLineEndingPoint(boundingBox: IRect, position: NewPointLabelPosition, parentShape: LabelParentPoint): number[][] {
            let x = boundingBox.left;
            let y = boundingBox.top;
            switch (position) {
                case NewPointLabelPosition.Above:
                    x += (boundingBox.width / 2);
                    y += boundingBox.height;
                    break;
                case NewPointLabelPosition.Below:
                    x += (boundingBox.width / 2);
                    break;
                case NewPointLabelPosition.Left:
                    x += boundingBox.width;
                    y += ((boundingBox.height * 2) / 3);
                    break;
                case NewPointLabelPosition.Right:
                    y += ((boundingBox.height * 2) / 3);
                    break;
                case NewPointLabelPosition.BelowLeft:
                    x += boundingBox.width;
                    y += (boundingBox.height / 2);
                    break;
                case NewPointLabelPosition.BelowRight:
                    y += (boundingBox.height / 2);
                    break;
                case NewPointLabelPosition.AboveLeft:
                    x += boundingBox.width;
                    y += boundingBox.height;
                    break;
                case NewPointLabelPosition.AboveRight:
                    y += boundingBox.height;
                    break;
            }

            return [[parentShape.point.x, parentShape.point.y],[x, y]];
        }
    }
}
