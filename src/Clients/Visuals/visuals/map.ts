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

module powerbi.visuals {
    import ArrayExtensions = jsCommon.ArrayExtensions;
    import Color = jsCommon.Color;
    import PixelConverter = jsCommon.PixelConverter;
    import Polygon = shapes.Polygon;

    export interface MapConstructionOptions {
        filledMap?: boolean;
        geocoder?: IGeocoder;
        mapControlFactory?: IMapControlFactory;
        behavior?: MapBehavior;
        tooltipsEnabled?: boolean;
        filledMapDataLabelsEnabled?: boolean;
        disableZooming?: boolean;
        disablePanning?: boolean;
        isLegendScrollable?: boolean;
        viewChangeThrottleInterval?: number; // Minimum interval between viewChange events (in milliseconds)
    }

    export interface IMapControlFactory {
        createMapControl(element: HTMLElement, options?: Microsoft.Maps.MapOptions): Microsoft.Maps.Map;
        ensureMap(locale: string, action: () => void): void;
    }

    /** Note: public for UnitTest */
    export interface MapDataPoint {
        geocodingQuery: string;
        location?: IGeocodeCoordinate; // Value from the loaded data
        cachedLocation?: IGeocodeCoordinate; // Value either loaded or geocoded
        paths?: IGeocodeBoundaryPolygon[];
        value: number;
        radius?: number;
        seriesInfo: MapSeriesInfo;
        categoryIdentity: DataViewScopeIdentity;
        categoryValue: string;
    }

    /** Note: public for UnitTest */
    export interface MapPieSlice {
        value: number;
        index: number;
        fill: string;
        stroke: string;
        seriesId: DataViewScopeIdentity;
    }

    /** Note: public for UnitTest */
    export interface MapSeriesInfo {
        sizeValuesForGroup: MapPieSlice[];
        latitude?: number;
        longitude?: number;
    }

    export interface MapData {
        bubbleData?: MapBubble[];
        sliceData?: MapSlice[][];
        shapeData?: MapShape[];
    }

    export interface MapVisualDataPoint extends TooltipEnabledDataPoint, SelectableDataPoint {
        x: number;
        y: number;
        radius: number;
        fill: string;
        stroke: string;
        strokeWidth: number;
        labeltext: string;
        labelFill: string;
    }

    export interface MapBubble extends MapVisualDataPoint {
    }

    export interface MapSlice extends MapVisualDataPoint {
        value: number;
        startAngle?: number;
        endAngle?: number;
    }

    export interface MapShape extends TooltipEnabledDataPoint, SelectableDataPoint {
        absolutePointArray: Float64Array;
        path: string;
        fill: string;
        stroke: string;
        strokeWidth: number;
        key: string;
        labeltext: string;
        displayLabel: boolean;
        catagoryLabeltext?: string;
        labelFormatString: string;
    }

    /** 
     * Used because data points used in D3 pie layouts are placed within a container with pie information.
     */
    interface MapSliceContainer {
        data: MapSlice;
    }

    /** Note: public for UnitTest */
    export interface IMapDataPointRenderer {
        init(mapControl: Microsoft.Maps.Map, mapDiv: JQuery, addClearCatcher: boolean): void;
        beginDataPointUpdate(geocodingCategory: string, dataPointCount: number): void;
        addDataPoint(dataPoint: MapDataPoint): void;
        getDataPointCount(): number;
        converter(viewPort: IViewport, dataView: DataView, labelSettings: PointDataLabelsSettings, interactivityService: IInteractivityService): MapData;
        updateInternal(data: MapData, viewport: IViewport, dataChanged: boolean, interactivityService: IInteractivityService): MapBehaviorOptions;
        getDataPointPadding(): number;
        clearDataPoints(): void;
    }

    export interface DataViewMetadataAutoGeneratedColumn extends DataViewMetadataColumn {
        /**
         * Indicates that the column was added manually.
         */
        isAutoGeneratedColumn?: boolean;
    }

    export const MaxLevelOfDetail = 23;
    export const MinLevelOfDetail = 1;
    export const DefaultFillOpacity = 0.5;
    export const DefaultBackgroundColor = "#000000";
    export const LeaderLineColor = "#000000";

    export class MapBubbleDataPointRenderer implements IMapDataPointRenderer {
        private mapControl: Microsoft.Maps.Map;
        private values: MapDataPoint[];
        private maxDataPointRadius: number;
        private svg: D3.Selection;
        private clearSvg: D3.Selection;
        private clearCatcher: D3.Selection;
        private bubbleGraphicsContext: D3.Selection;
        private sliceGraphicsContext: D3.Selection;
        private labelGraphicsContext: D3.Selection;
        private labelBackgroundGraphicsContext: D3.Selection;
        private sliceLayout: D3.Layout.PieLayout;
        private arc: D3.Svg.Arc;
        private dataLabelsSettings: PointDataLabelsSettings;
        private tooltipsEnabled: boolean;
        private static validLabelPositions: NewPointLabelPosition[] = [NewPointLabelPosition.Above, NewPointLabelPosition.Below, NewPointLabelPosition.Left, NewPointLabelPosition.Right];
        private mapData: MapData;

        public constructor(tooltipsEnabled: boolean) {
            this.values = [];
            this.tooltipsEnabled = tooltipsEnabled;
        }

        public init(mapControl: Microsoft.Maps.Map, mapDiv: JQuery, addClearCatcher: boolean): void {
            /*
                The layout of the visual would look like :
                <div class="visual mapControl">
                    <div class="MicrosoftMap">
                        <!-- Bing maps stuff -->
                        <svg>
                            <rect class="clearCatcher"></rect>
                        </svg>
                    </div>
                    <svg>
                        <g class="mapBubbles>
                            <!-- our geometry -->
                        </g>
                        <g class="mapSlices>
                            <!-- our geometry -->
                        </g>
                    </svg>
                </div>                    

            */

            this.mapControl = mapControl;
            let root = mapDiv[0];
            root.setAttribute("drag-resize-disabled", "true"); // Enable panning within the maps in IE
            let svg = this.svg = d3.select(root)
                .append('svg')
                .style("position", "absolute") // Absolute position so that the svg will overlap with the canvas.
                .style("pointer-events", "none");
            if (addClearCatcher) {
                let clearSvg = this.clearSvg = d3.select(<HTMLElement>this.mapControl.getRootElement())
                    .append('svg')
                    .style('position', 'absolute'); // Absolute position so that the svg will overlap with the canvas.
                this.clearCatcher = appendClearCatcher(clearSvg);
            }
            this.bubbleGraphicsContext = svg
                .append("g")
                .classed("mapBubbles", true);
            this.sliceGraphicsContext = svg
                .append("g")
                .classed("mapSlices", true);
            this.labelBackgroundGraphicsContext = svg
                .append("g")
                .classed(NewDataLabelUtils.labelBackgroundGraphicsContextClass.class, true);
            this.labelGraphicsContext = svg
                .append("g")
                .classed(NewDataLabelUtils.labelGraphicsContextClass.class, true);
            this.sliceLayout = d3.layout.pie()
                .sort(null)
                .value((d: MapSlice) => {
                    return d.value;
                });
            this.arc = d3.svg.arc();
            this.clearMaxDataPointRadius();
            this.dataLabelsSettings = dataLabelUtils.getDefaultMapLabelSettings();
        }

        public addDataPoint(dataPoint: MapDataPoint): void {
            this.values.push(dataPoint);
        }

        public clearDataPoints(): void {
            this.values = [];
        }

        public getDataPointCount(): number {
            // Filter out any data points without a location since those aren't actually being drawn
            return _.filter(this.values, (value: MapDataPoint) => !!value.cachedLocation).length;
        }

        public getDataPointPadding(): number {
            return this.maxDataPointRadius * 2;
        }

        private clearMaxDataPointRadius(): void {
            this.maxDataPointRadius = 0;
        }

        private setMaxDataPointRadius(dataPointRadius: number): void {
            this.maxDataPointRadius = Math.max(dataPointRadius, this.maxDataPointRadius);
        }

        public beginDataPointUpdate(geocodingCategory: string, dataPointCount: number): void {
            this.values.length = 0;
        }

        public getDefaultMap(geocodingCategory: string, dataPointCount: number): void {
            this.values.length = 0;
        }

        public converter(viewport: IViewport, dataView: DataView, labelSettings: PointDataLabelsSettings, interactivityService: IInteractivityService): MapData {
            let mapControl = this.mapControl;
            let widthOverTwo = viewport.width / 2;
            let heightOverTwo = viewport.height / 2;

            let strokeWidth = 1;

            //update data label settings
            this.dataLabelsSettings = labelSettings;

            // See MapSeriesPresenter::GetDataPointRadius for the PV behavior
            let radiusScale = Math.min(viewport.width, viewport.height) / 384;
            this.clearMaxDataPointRadius();

            let bubbleData: MapBubble[] = [];
            let sliceData: MapSlice[][] = [];
            let formatStringProp = mapProps.general.formatString;
            let categorical: DataViewCategorical = dataView ? dataView.categorical : null;

            let grouped: DataViewValueColumnGroup[];
            let sizeIndex = -1;
            let dataValuesSource: DataViewMetadataColumn;
            if (categorical && categorical.values) {
                grouped = categorical.values.grouped();
                sizeIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, "Size");
                dataValuesSource = categorical.values.source;
            }

            for (let i = 0, len = this.values.length; i < len; i++) {
                let canvasDataPoint = this.values[i];
                let categoryValue = canvasDataPoint.categoryValue;
                let location = canvasDataPoint.cachedLocation;

                if (location) {
                    let xy = mapControl.tryLocationToPixel(new Microsoft.Maps.Location(location.latitude, location.longitude));
                    let x = xy.x + widthOverTwo;
                    let y = xy.y + heightOverTwo;

                    let radius = canvasDataPoint.radius * radiusScale;
                    this.setMaxDataPointRadius(radius);
                    let sizeValuesForGroup = canvasDataPoint.seriesInfo.sizeValuesForGroup;

                    let categoryColumn = categorical.categories[0];
                    let dataMap: SelectorForColumn = {};

                    let sliceCount = sizeValuesForGroup ? sizeValuesForGroup.length : 1;
                    if (sliceCount === 1) {
                        let sizeValueForGroup: MapPieSlice = sizeValuesForGroup[0];
                        let value = sizeValueForGroup.value;
                        let index = sizeValueForGroup.index;

                        let seriesData: TooltipSeriesDataItem[] = [];
                        if (dataValuesSource) {
                            // Dynamic series
                            seriesData.push({ value: grouped[index].name, metadata: { source: dataValuesSource, values: [] } });
                        }
                        if (sizeIndex > -1) {
                            seriesData.push({ value: value, metadata: grouped[0].values[sizeIndex] });
                        }

                        let tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(formatStringProp, null, categoryValue, null, categorical.categories, seriesData);
                        let mapBubble = sizeValuesForGroup[0];
                        dataMap[categoryColumn.source.queryName] = canvasDataPoint.categoryIdentity;
                        let identity = SelectionId.createWithSelectorForColumnAndMeasure(dataMap, null);

                        bubbleData.push({
                            x: x,
                            y: y,
                            labeltext: categoryValue,
                            radius: radius,
                            fill: mapBubble.fill,
                            stroke: mapBubble.stroke,
                            strokeWidth: strokeWidth,
                            tooltipInfo: tooltipInfo,
                            identity: identity,
                            selected: false,
                            labelFill: labelSettings.labelColor,
                        });
                    }
                    else {
                        let slices = [];
                        let measureColumn = categorical.values[0];
                        dataMap[categoryColumn.source.queryName] = canvasDataPoint.categoryIdentity;

                        for (let j = 0; j < sliceCount; ++j) {
                            let sizeValueForGroup: MapPieSlice = sizeValuesForGroup[j];
                            let value = sizeValueForGroup.value;
                            let index = sizeValueForGroup.index;

                            let seriesData: TooltipSeriesDataItem[] = [];
                            if (dataValuesSource) {
                                // Dynamic series
                                seriesData.push({ value: grouped[index].name, metadata: { source: dataValuesSource, values: [] } });
                            }
                            if (sizeIndex > -1) {
                                seriesData.push({ value: value, metadata: grouped[0].values[sizeIndex] });
                            }

                            let tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(formatStringProp, null, categoryValue, null, categorical.categories, seriesData);
                            let mapSlice = sizeValuesForGroup[j];
                            dataMap[measureColumn.source.queryName] = mapSlice.seriesId;
                            let identity = SelectionId.createWithSelectorForColumnAndMeasure(dataMap, null);

                            slices.push({
                                x: x,
                                y: y,
                                labeltext: categoryValue,
                                radius: radius,
                                fill: mapSlice.fill,
                                stroke: mapSlice.stroke,
                                strokeWidth: strokeWidth,
                                value: value,
                                tooltipInfo: tooltipInfo,
                                identity: identity,
                                selected: false,
                                labelFill: labelSettings.labelColor,
                            });
                        }
                        if (interactivityService) {
                            interactivityService.applySelectionStateToData(slices);
                        }
                        sliceData.push(slices);
                    }
                }
            }

            if (interactivityService) {
                interactivityService.applySelectionStateToData(bubbleData);
            }

            return { bubbleData: bubbleData, sliceData: sliceData };
        }

        public updateInternal(data: MapData, viewport: IViewport, dataChanged: boolean, interactivityService: IInteractivityService): MapBehaviorOptions {
            debug.assertValue(viewport, "viewport");
            this.mapData = data;
            if (this.svg) {
                this.svg
                    .style("width", viewport.width.toString() + "px")
                    .style("height", viewport.height.toString() + "px");
            }
            if (this.clearSvg) {
                this.clearSvg
                    .style("width", viewport.width.toString() + "px")
                    .style("height", viewport.height.toString() + "px");
            }

            let arc = this.arc;

            let hasSelection = interactivityService && interactivityService.hasSelection();

            let bubbles = this.bubbleGraphicsContext.selectAll(".bubble").data(data.bubbleData, (d: MapBubble) => d.identity.getKey());

            bubbles.enter()
                .append("circle")
                .classed("bubble", true);
            bubbles
                .attr("cx", (d: MapBubble) => d.x)
                .attr("cy", (d: MapBubble) => d.y)
                .attr("r", (d: MapBubble) => d.radius)
                .style("fill", (d: MapBubble) => d.fill)
                .style("stroke", (d: MapBubble) => d.stroke)
                .style("fill-opacity", (d: MapBubble) => ColumnUtil.getFillOpacity(d.selected, false, hasSelection, false))
                .style("strokeWidth", (d: MapBubble) => d.strokeWidth)
                .style("stroke-opacity", (d: MapBubble) => ColumnUtil.getFillOpacity(d.selected, false, hasSelection, false))
                .style("cursor", "default");
            bubbles.exit().remove();

            if (this.tooltipsEnabled) {
                TooltipManager.addTooltip(bubbles, (tooltipEvent: TooltipEvent) => tooltipEvent.data.tooltipInfo);
                bubbles.style("pointer-events", "all");
            }

            let sliceData = data.sliceData;

            let sliceContainers = this.sliceGraphicsContext.selectAll(".sliceContainer").data(sliceData);
            sliceContainers.enter()
                .append("g")
                .classed("sliceContainer", true);

            sliceContainers.exit().remove();

            let sliceLayout = this.sliceLayout;
            let slices = sliceContainers.selectAll(".slice")
                .data(function (d) {
                    return sliceLayout(d);
                }, (d: MapSliceContainer) => d.data.identity.getKey());

            slices.enter()
                .append("path")
                .classed("slice", true);

            slices
                .style("fill", (t: MapSliceContainer) => t.data.fill)
                .style("fill-opacity", (d) => ColumnUtil.getFillOpacity(d.data.selected, false, hasSelection, false))
                .style("stroke", (t: MapSliceContainer) => t.data.stroke)
                .style("strokeWidth", (t: MapSliceContainer) => t.data.strokeWidth)
                .style("stroke-opacity", (d) => ColumnUtil.getFillOpacity(d.data.selected, false, hasSelection, false))
                .style("cursor", "default")
                .attr("transform", (t: MapSliceContainer) => SVGUtil.translate(t.data.x, t.data.y))
                .attr('d', (t: MapSliceContainer) => {
                    return arc.innerRadius(0).outerRadius((t: MapSliceContainer) => t.data.radius)(t);
                });

            slices.exit().remove();

            let labelSettings = this.dataLabelsSettings;
            let dataLabels: Label[] = [];
            if (labelSettings && (labelSettings.show || labelSettings.showCategory)) {
                let labelDataPoints = this.createLabelDataPoints();
                let labelLayout = new LabelLayout({
                    maximumOffset: NewDataLabelUtils.maxLabelOffset,
                    startingOffset: NewDataLabelUtils.startingLabelOffset
                });
                let labelDataPointsGroup: LabelDataPointsGroup = {
                    labelDataPoints: labelDataPoints,
                    maxNumberOfLabels: labelDataPoints.length
                };
                dataLabels = labelLayout.layout([labelDataPointsGroup], { width: viewport.width, height: viewport.height });
            }

            NewDataLabelUtils.drawLabelBackground(this.labelGraphicsContext, dataLabels, powerbi.visuals.DefaultBackgroundColor, powerbi.visuals.DefaultFillOpacity);
            NewDataLabelUtils.drawDefaultLabels(this.labelGraphicsContext, dataLabels, false); // Once we properly split up and handle show and showCategory, the false here should change to !labelSettings.showCategory

            if (this.tooltipsEnabled) {
                TooltipManager.addTooltip(slices, (tooltipEvent: TooltipEvent) => tooltipEvent.data.data.tooltipInfo);
                slices.style("pointer-events", "all");
            }

            let allData: SelectableDataPoint[] = data.bubbleData.slice();
            for (let i = 0, ilen = sliceData.length; i < ilen; i++) {
                allData.push.apply(allData, sliceData[i]);
            }

            let behaviorOptions: MapBehaviorOptions = {
                bubbles: bubbles,
                slices: this.sliceGraphicsContext.selectAll("path"),
                clearCatcher: this.clearCatcher,
                dataPoints: allData,
            };
            return behaviorOptions;
        }

        private createLabelDataPoints(): LabelDataPoint[] {
            let data = this.mapData;
            let labelDataPoints: LabelDataPoint[] = [];
            let dataPoints = data.bubbleData;
            dataPoints = dataPoints.concat(_.map(data.sliceData, (value: MapSlice[]) => value[0]));
            let labelSettings = this.dataLabelsSettings;

            for (let dataPoint of dataPoints) {
                let text = dataPoint.labeltext;

                let properties: TextProperties = {
                    text: text,
                    fontFamily: NewDataLabelUtils.LabelTextProperties.fontFamily,
                    fontSize: PixelConverter.fromPoint(labelSettings.fontSize),
                    fontWeight: NewDataLabelUtils.LabelTextProperties.fontWeight,
                };
                let textWidth = TextMeasurementService.measureSvgTextWidth(properties);
                let textHeight = TextMeasurementService.estimateSvgTextHeight(properties);

                labelDataPoints.push({
                    isPreferred: true,
                    text: text,
                    textSize: {
                        width: textWidth,
                        height: textHeight,
                    },
                    outsideFill: labelSettings.labelColor ? labelSettings.labelColor : NewDataLabelUtils.defaultInsideLabelColor, // Use inside for outside colors because we draw backgrounds for map labels
                    insideFill: NewDataLabelUtils.defaultInsideLabelColor,
                    parentType: LabelDataPointParentType.Point,
                    parentShape: {
                        point: {
                            x: dataPoint.x,
                            y: dataPoint.y,
                        },
                        radius: dataPoint.radius,
                        validPositions: MapBubbleDataPointRenderer.validLabelPositions,
                    },
                    fontSize: labelSettings.fontSize,
                    identity: undefined,
                });
            }

            return labelDataPoints;
        }
    }

    export interface FilledMapParams {
        level: number;
        maxPolygons: number;
        strokeWidth: number;
    }

    export class MapShapeDataPointRenderer implements IMapDataPointRenderer {

        private mapControl: Microsoft.Maps.Map;
        private svg: D3.Selection;
        private clearSvg: D3.Selection;
        private clearCatcher: D3.Selection;
        private geocodingCategory: string;
        private polygonInfo: MapPolygonInfo;
        private values: MapDataPoint[];
        private shapeGraphicsContext: D3.Selection;
        private labelGraphicsContext: D3.Selection;
        private labelBackgroundGraphicsContext: D3.Selection;
        private maxShapeDimension: number;
        private mapData: MapData;
        private dataLabelsSettings: PointDataLabelsSettings;
        private filledMapDataLabelsEnabled: boolean;
        private tooltipsEnabled: boolean;
        private static validLabelPolygonPositions: NewPointLabelPosition[] = [NewPointLabelPosition.Center, NewPointLabelPosition.Below, NewPointLabelPosition.Above, NewPointLabelPosition.Right, NewPointLabelPosition.Left, NewPointLabelPosition.BelowRight, NewPointLabelPosition.BelowLeft, NewPointLabelPosition.AboveRight, NewPointLabelPosition.AboveLeft];

        public static getFilledMapParams(category: string, dataCount: number): FilledMapParams {
            switch (category) {
                case MapUtil.CategoryTypes.Continent:
                case MapUtil.CategoryTypes.CountryRegion:
                    if (dataCount < 10) {
                        return { level: 2, maxPolygons: 50, strokeWidth: 0 };
                    }
                    else if (dataCount < 30) {
                        return { level: 2, maxPolygons: 20, strokeWidth: 0 };
                    }
                    return { level: 1, maxPolygons: 3, strokeWidth: 0 };
                default:
                    if (dataCount < 100) {
                        return { level: 1, maxPolygons: 5, strokeWidth: 6 };
                    }
                    if (dataCount < 200) {
                        return { level: 0, maxPolygons: 5, strokeWidth: 6 };
                    }
                    return { level: 0, maxPolygons: 5, strokeWidth: 0 };
            }
        }

        public static buildPaths(locations: IGeocodeBoundaryPolygon[]): IGeocodeBoundaryPolygon[] {
            let paths = [];
            for (let i = 0; i < locations.length; i++) {
                let location = locations[i];
                let polygon = location.geographic;

                if (polygon.length > 2) {
                    paths.push(location);
                }
            }

            return paths;
        }

        public constructor(fillMapDataLabelsEnabled: boolean, tooltipsEnabled: boolean) {
            this.values = [];
            this.filledMapDataLabelsEnabled = fillMapDataLabelsEnabled;
            this.tooltipsEnabled = tooltipsEnabled;
        }

        public init(mapControl: Microsoft.Maps.Map, mapDiv: JQuery, addClearCatcher: boolean): void {
            /*
                The layout of the visual would look like :
                <div class="visual mapControl">
                    <div class="MicrosoftMap">
                        <!-- Bing maps stuff -->
                        <svg>
                            <rect class="clearCatcher"></rect>
                        </svg>
                    </div>
                    <svg>
                        <g class="mapShapes>
                            <!-- our geometry -->
                        </g>
                    </svg>
                </div>                    

            */

            this.mapControl = mapControl;
            this.polygonInfo = new MapPolygonInfo();

            let root = mapDiv[0];
            root.setAttribute('drag-resize-disabled', 'true'); // Enable panning within the maps in IE
            let svg = this.svg = d3.select(root)
                .append('svg')
                .style('position', 'absolute') // Absolute position so that the svg will overlap with the canvas.
                .style("pointer-events", "none");
            if (addClearCatcher) {
                let clearSvg = this.clearSvg = d3.select(<HTMLElement>this.mapControl.getRootElement())
                    .append('svg')
                    .style('position', 'absolute'); // Absolute position so that the svg will overlap with the canvas.
                this.clearCatcher = appendClearCatcher(clearSvg);
            }
            this.shapeGraphicsContext = svg
                .append('g')
                .classed('mapShapes', true);
            this.labelBackgroundGraphicsContext = svg
                .append("g")
                .classed(NewDataLabelUtils.labelBackgroundGraphicsContextClass.class, true);
            this.labelGraphicsContext = svg
                .append("g")
                .classed(NewDataLabelUtils.labelGraphicsContextClass.class, true);

            this.clearMaxShapeDimension();
            this.dataLabelsSettings = dataLabelUtils.getDefaultMapLabelSettings();
        }

        public beginDataPointUpdate(geocodingCategory: string, dataPointCount: number) {
            this.geocodingCategory = geocodingCategory;
            this.values = [];
        }

        public addDataPoint(dataPoint: MapDataPoint) {
            this.values.push(dataPoint);
        }

        public clearDataPoints(): void {
            this.values = [];
        }

        public getDataPointCount(): number {
            // Filter out any data points without a location since those aren't actually being drawn
            return _.filter(this.values, (value: MapDataPoint) => !!value.paths).length;
        }

        public converter(viewport: IViewport, dataView: DataView, labelSettings: PointDataLabelsSettings, interactivityService?: IInteractivityService): MapData {
            this.clearMaxShapeDimension();
            this.dataLabelsSettings = labelSettings;
            let strokeWidth = 1;

            let shapeData: MapShape[] = [];
            let formatStringProp = mapProps.general.formatString;

            for (let categoryIndex = 0, categoryCount = this.values.length; categoryIndex < categoryCount; categoryIndex++) {
                let categorical: DataViewCategorical = dataView ? dataView.categorical : null;
                let canvasDataPoint: MapDataPoint = this.values[categoryIndex];
                let value = canvasDataPoint.categoryValue;
                let paths = canvasDataPoint.paths;
                let sizeValuesForGroup = canvasDataPoint.seriesInfo.sizeValuesForGroup;
                let sizeValueForGroup: MapPieSlice = sizeValuesForGroup && sizeValuesForGroup[0];

                let grouped: DataViewValueColumnGroup[];
                let sizeIndex = -1;
                let dataValuesSource: DataViewMetadataColumn;

                if (categorical && categorical.values) {
                    grouped = categorical.values.grouped();
                    sizeIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, "Size");
                    dataValuesSource = categorical.values.source;
                }

                if (paths && sizeValueForGroup) {
                    let catagoryValue = sizeValueForGroup.value;
                    let index = sizeValueForGroup.index;

                    let seriesData: TooltipSeriesDataItem[] = [];
                    if (dataValuesSource) {
                        // Dynamic series
                        seriesData.push({ value: grouped[index].name, metadata: { source: dataValuesSource, values: [] } });
                    }
                    if (sizeIndex > -1) {
                        seriesData.push({ value: catagoryValue, metadata: grouped[0].values[sizeIndex] });
                    }

                    let tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(formatStringProp, null, value, null, categorical.categories, seriesData);
                    let categoryColumn = categorical.categories[0];
                    let dataMap: SelectorForColumn = {};
                    dataMap[categoryColumn.source.queryName] = canvasDataPoint.categoryIdentity;
                    let identity = SelectionId.createWithSelectorForColumnAndMeasure(dataMap, null);
                    let idKey = identity.getKey();
                    let formattersCache = NewDataLabelUtils.createColumnFormatterCacheManager();
                    for (let pathIndex = 0, pathCount = paths.length; pathIndex < pathCount; pathIndex++) {
                        let path = paths[pathIndex];
                        let labelFormatString = (dataView && dataView.categorical && !_.isEmpty(dataView.categorical.values)) ? valueFormatter.getFormatString(dataView.categorical.values[0].source, filledMapProps.general.formatString) : undefined;
                        this.setMaxShapeDimension(path.absoluteBounds.width, path.absoluteBounds.height);
                        let formatter = formattersCache.getOrCreate(labelFormatString, labelSettings);

                        shapeData.push({
                            absolutePointArray: canvasDataPoint.paths[pathIndex].absolute,
                            path: path.absoluteString,
                            fill: sizeValueForGroup.fill,
                            stroke: sizeValueForGroup.stroke,
                            strokeWidth: strokeWidth,
                            tooltipInfo: tooltipInfo,
                            identity: identity,
                            selected: false,
                            key: JSON.stringify({ id: idKey, pIdx: pathIndex }),
                            displayLabel: pathIndex === 0,
                            labeltext: value,
                            catagoryLabeltext: (catagoryValue != null) ? NewDataLabelUtils.getLabelFormattedText(formatter.format(catagoryValue)) : undefined,
                            labelFormatString: labelFormatString,
                        });
                    }
                }
            }

            if (interactivityService)
                interactivityService.applySelectionStateToData(shapeData);

            return { shapeData: shapeData };
        }

        public updateInternal(data: MapData, viewport: IViewport, dataChanged: boolean, interactivityService: IInteractivityService): MapBehaviorOptions {
            debug.assertValue(viewport, "viewport");
            this.mapData = data;

            if (this.svg) {
                this.svg
                    .style("width", viewport.width.toString() + "px")
                    .style("height", viewport.height.toString() + "px");
            }
            if (this.clearSvg) {
                this.clearSvg
                    .style("width", viewport.width.toString() + "px")
                    .style("height", viewport.height.toString() + "px");
            }

            this.polygonInfo.reCalc(this.mapControl, viewport.width, viewport.height);
            this.shapeGraphicsContext.attr("transform", this.polygonInfo.transformToString(this.polygonInfo.transform));

            let hasSelection = interactivityService && interactivityService.hasSelection();

            let shapes = this.shapeGraphicsContext.selectAll("polygon").data(data.shapeData, (d: MapShape) => d.key);

            shapes.enter()
                .append("polygon")
                .classed("shape", true)
                .attr("points", (d: MapShape) => { // Always add paths to any new data points
                    return d.path;
                });

            shapes
                .style("fill", (d: MapShape) => d.fill)
                .style("fill-opacity", (d: MapShape) => ColumnUtil.getFillOpacity(d.selected, false, hasSelection, false))
                .style("cursor", "default");

            if (dataChanged) {
                // We only update the paths of existing shapes if we have a change in the data.  Updating the lengthy path
                // strings every update during resize or zooming/panning is extremely bad for performance.
                shapes
                    .attr("points", (d: MapShape) => {
                        return d.path;
                    });
            }

            shapes.exit()
                .remove();

            let labelSettings = this.dataLabelsSettings;
            let labels: Label[];

            if (labelSettings && (labelSettings.show || labelSettings.showCategory)) {
                let labelDataPoints = this.createLabelDataPoints();
                let labelLayout = new FilledMapLabelLayout();
                labels = labelLayout.layout(labelDataPoints, { width: viewport.width, height: viewport.height }, this.polygonInfo.transform);
            }

            this.drawLabelStems(this.labelGraphicsContext, labels, labelSettings.show, labelSettings.showCategory);
            NewDataLabelUtils.drawLabelBackground(this.labelGraphicsContext, labels, powerbi.visuals.DefaultBackgroundColor, powerbi.visuals.DefaultFillOpacity);
            NewDataLabelUtils.drawDefaultLabels(this.labelGraphicsContext, labels, false, labelSettings.show && labelSettings.showCategory);

            if (this.tooltipsEnabled) {
                TooltipManager.addTooltip(shapes, (tooltipEvent: TooltipEvent) => tooltipEvent.data.tooltipInfo);
                shapes.style("pointer-events", "all");
            }

            let behaviorOptions: MapBehaviorOptions = {
                shapes: shapes,
                clearCatcher: this.clearCatcher,
                dataPoints: data.shapeData,
            };

            return behaviorOptions;
        }

        public getDataPointPadding() {
            return 12;
        }

        private clearMaxShapeDimension(): void {
            this.maxShapeDimension = 0;
        }

        private setMaxShapeDimension(width: number, height: number): void {
            this.maxShapeDimension = Math.max(width, this.maxShapeDimension);
            this.maxShapeDimension = Math.max(height, this.maxShapeDimension);
        }

        private createLabelDataPoints(): LabelDataPoint[] {
            let data = this.mapData;
            let labelDataPoints: LabelDataPoint[] = [];
            if (this.filledMapDataLabelsEnabled) {
                let dataShapes = data.shapeData;
                let labelSettings = this.dataLabelsSettings;

                for (let dataShape of dataShapes) {

                    if (!dataShape.displayLabel) {
                        continue;
                    }
                    let text, secondRowText: string;
                    let secondRowTextWidth: number = 0;
                    let hasSecondRow: boolean = false;

                    if (this.dataLabelsSettings.show && !this.dataLabelsSettings.showCategory) {
                        text = dataShape.catagoryLabeltext;
                        if (text === undefined)
                            continue;
                    } else if (this.dataLabelsSettings.showCategory && !this.dataLabelsSettings.show) {
                        text = dataShape.labeltext;
                        if (text === undefined)
                            continue;
                    } else if (this.dataLabelsSettings.showCategory && this.dataLabelsSettings.show) {
                        text = dataShape.catagoryLabeltext;
                        secondRowText = dataShape.labeltext;
                        if (text === undefined && secondRowText === undefined)
                            continue;
                        hasSecondRow = true;
                    }

                    if (hasSecondRow) {
                        let secondRowProperties: TextProperties = {
                            text: secondRowText,
                            fontFamily: NewDataLabelUtils.LabelTextProperties.fontFamily,
                            fontSize: NewDataLabelUtils.LabelTextProperties.fontSize,
                            fontWeight: NewDataLabelUtils.LabelTextProperties.fontWeight,
                        };
                        secondRowTextWidth = TextMeasurementService.measureSvgTextWidth(secondRowProperties);
                    }

                    let firstRowProperties: TextProperties = {
                        text: text,
                        fontFamily: NewDataLabelUtils.LabelTextProperties.fontFamily,
                        fontSize: NewDataLabelUtils.LabelTextProperties.fontSize,
                        fontWeight: NewDataLabelUtils.LabelTextProperties.fontWeight,
                    };
                    let textWidth = TextMeasurementService.measureSvgTextWidth(firstRowProperties);
                    let textHeight = TextMeasurementService.estimateSvgTextHeight(firstRowProperties);

                    if (secondRowText && dataShape.labeltext !== undefined && dataShape.catagoryLabeltext !== undefined) {
                        textHeight = textHeight * 2;
                    }

                    let labelDataPoint: LabelDataPoint = {
                        parentType: LabelDataPointParentType.Polygon,
                        parentShape:
                        {
                            polygon: new Polygon(dataShape.absolutePointArray),
                            validPositions: MapShapeDataPointRenderer.validLabelPolygonPositions,
                        },
                        text: text,
                        secondRowText: secondRowText,
                        textSize: {
                            width: Math.max(textWidth, secondRowTextWidth),
                            height: textHeight,
                        },
                        insideFill: labelSettings.labelColor,
                        outsideFill: labelSettings.labelColor ? labelSettings.labelColor : NewDataLabelUtils.defaultInsideLabelColor, // Use inside for outside colors because we draw backgrounds for map labels                   
                        isPreferred: false,
                        identity: undefined,
                    };
                    labelDataPoints.push(labelDataPoint);
                }
            }
            return labelDataPoints;
        }

        private drawLabelStems(labelsContext: D3.Selection, dataLabels: Label[], showText: boolean, showCategory: boolean) {
            let filteredLabels = _.filter(dataLabels, (d: Label) => d.isVisible);
            let key = (d: Label, index: number) => { return d.identity ? d.identity.getKeyWithoutHighlight() : index; };
            NewDataLabelUtils.drawLabelLeaderLines(labelsContext, filteredLabels, key, LeaderLineColor);
        }
    }

    /** Note: public for UnitTest */
    export interface SimpleRange {
        min: number;
        max: number;
    }

    export class Map implements IVisual {
        public currentViewport: IViewport;

        private pendingGeocodingRender: boolean;
        private mapControl: Microsoft.Maps.Map;
        private minLongitude: number;
        private maxLongitude: number;
        private minLatitude: number;
        private maxLatitude: number;
        private valueScale: SimpleRange;
        private style: IVisualStyle;
        private colors: IDataColorPalette;
        private dataPointRenderer: IMapDataPointRenderer;
        private geocodingCategory: string;
        private legend: ILegend;
        private legendHeight;
        private legendData: LegendData;
        private element: JQuery;
        private dataView: DataView;
        private dataLabelsSettings: PointDataLabelsSettings;
        private static MapContainer = {
            cssClass: 'mapControl',
            selector: '.mapControl'
        };
        public static StrokeDarkenColorValue = 255 * 0.25;
        private interactivityService: IInteractivityService;
        private behavior: MapBehavior;
        private defaultDataPointColor: string;
        private showAllDataPoints: boolean;
        private dataPointsToEnumerate: LegendDataPoint[];
        private hasDynamicSeries: boolean;
        private geoTaggingAnalyzerService: powerbi.IGeoTaggingAnalyzerService;
        private enableGeoShaping: boolean;
        private host: IVisualHostServices;
        private receivedExternalViewChange = false;
        private executingInternalViewChange = false;
        private geocoder: IGeocoder;
        private mapControlFactory: IMapControlFactory;
        private tooltipsEnabled: boolean;
        private filledMapDataLabelsEnabled: boolean;
        private disableZooming: boolean;
        private disablePanning: boolean;
        private locale: string;
        private isLegendScrollable: boolean;
        private viewChangeThrottleInterval: number;

        constructor(options: MapConstructionOptions) {
            if (options.filledMap) {
                this.dataPointRenderer = new MapShapeDataPointRenderer(options.filledMapDataLabelsEnabled, options.tooltipsEnabled);
                this.filledMapDataLabelsEnabled = options.filledMapDataLabelsEnabled;
                this.enableGeoShaping = true;
            }
            else {
                this.dataPointRenderer = new MapBubbleDataPointRenderer(options.tooltipsEnabled);
                this.enableGeoShaping = false;
            }
            this.mapControlFactory = options.mapControlFactory ? options.mapControlFactory : this.getDefaultMapControlFactory();
            this.behavior = options.behavior;
            this.tooltipsEnabled = options.tooltipsEnabled;
            this.disableZooming = options.disableZooming;
            this.disablePanning = options.disablePanning;
            this.isLegendScrollable = !!options.behavior;
            this.viewChangeThrottleInterval = options.viewChangeThrottleInterval;
        }

        public init(options: VisualInitOptions) {
            debug.assertValue(options, 'options');
            let element = this.element = options.element;
            this.pendingGeocodingRender = false;
            this.currentViewport = options.viewport;
            this.style = options.style;
            this.colors = this.style.colorPalette.dataColors;
            if (this.behavior)
                this.interactivityService = createInteractivityService(options.host);
            this.dataLabelsSettings = dataLabelUtils.getDefaultMapLabelSettings();
            this.legend = powerbi.visuals.createLegend(element, options.interactivity && options.interactivity.isInteractiveLegend, this.interactivityService, this.isLegendScrollable);
            this.legendHeight = 0;
            this.legendData = { dataPoints: [] };
            this.geoTaggingAnalyzerService = powerbi.createGeoTaggingAnalyzerService(options.host.getLocalizedString);
            this.host = options.host;
            if (options.host.locale)
                this.locale = options.host.locale();
            this.geocoder = options.host.geocoder();

            this.resetBounds();

            this.mapControlFactory.ensureMap(this.locale, () => {
                Microsoft.Maps.loadModule('Microsoft.Maps.Overlays.Style', {
                    callback: () => {
                        this.initialize(element[0]);
                    }
                });
            });
        }

        private addDataPoint(dataPoint: MapDataPoint): void {
            let location = dataPoint.cachedLocation;
            this.updateBounds(location.latitude, location.longitude);

            this.scheduleRedraw();
        }

        private scheduleRedraw(): void {
            if (!this.pendingGeocodingRender && this.mapControl) {
                this.pendingGeocodingRender = true;
                // Maintain a 3 second delay between redraws from geocoded geometry
                setTimeout(() => {
                    this.updateInternal(true);
                    this.pendingGeocodingRender = false;
                }, 3000);
            }
        }

        private enqueueGeoCode(dataPoint: MapDataPoint): void {
            this.geocoder.geocode(dataPoint.geocodingQuery, this.geocodingCategory).then((location) => {
                if (location) {
                    dataPoint.cachedLocation = location;
                    this.addDataPoint(dataPoint);
                }
            });
        }

        private enqueueGeoCodeAndGeoShape(dataPoint: MapDataPoint, params: FilledMapParams): void {
            this.geocoder.geocode(dataPoint.geocodingQuery, this.geocodingCategory).then((location) => {
                if (location) {
                    dataPoint.cachedLocation = location;
                    this.enqueueGeoShape(dataPoint, params);
                }
            });
        }

        private enqueueGeoShape(dataPoint: MapDataPoint, params: FilledMapParams): void {
            debug.assertValue(dataPoint.cachedLocation, "cachedLocation");
            this.geocoder.geocodeBoundary(dataPoint.cachedLocation.latitude, dataPoint.cachedLocation.longitude, this.geocodingCategory, params.level, params.maxPolygons)
                .then((result: IGeocodeBoundaryCoordinate) => {
                    let paths;
                    if (result.locations.length === 0 || result.locations[0].geographic) {
                        paths = MapShapeDataPointRenderer.buildPaths(result.locations);
                    }
                    else {
                        MapUtil.calcGeoData(result);
                        paths = MapShapeDataPointRenderer.buildPaths(result.locations);
                    }
                    dataPoint.paths = paths;
                    this.addDataPoint(dataPoint);
                });
        }

        private getOptimumLevelOfDetail(width: number, height: number): number {
            let dataPointCount = this.dataPointRenderer.getDataPointCount();
            if (dataPointCount === 0)
                return MapUtil.MinLevelOfDetail;

            let threshold: number = this.dataPointRenderer.getDataPointPadding();

            for (let levelOfDetail = MapUtil.MaxLevelOfDetail; levelOfDetail >= MapUtil.MinLevelOfDetail; levelOfDetail--) {
                let minXmaxY = MapUtil.latLongToPixelXY(this.minLatitude, this.minLongitude, levelOfDetail);
                let maxXminY = MapUtil.latLongToPixelXY(this.maxLatitude, this.maxLongitude, levelOfDetail);

                if (maxXminY.x - minXmaxY.x + threshold <= width && minXmaxY.y - maxXminY.y + threshold <= height) {
                    // if we have less than 2 data points we should not zoom in "too much"
                    if (dataPointCount < 2)
                        levelOfDetail = Math.min(MapUtil.MaxAutoZoomLevel, levelOfDetail);

                    return levelOfDetail;
                }
            }

            return MapUtil.MinLevelOfDetail;
        }

        private getViewCenter(levelOfDetail: number): Microsoft.Maps.Location {
            let minXmaxY = MapUtil.latLongToPixelXY(this.minLatitude, this.minLongitude, levelOfDetail);
            let maxXminY = MapUtil.latLongToPixelXY(this.maxLatitude, this.maxLongitude, levelOfDetail);
            return MapUtil.pixelXYToLocation((minXmaxY.x + maxXminY.x) / 2.0, (maxXminY.y + minXmaxY.y) / 2.0, levelOfDetail);
        }

        private resetBounds(): void {
            this.minLongitude = MapUtil.MaxAllowedLongitude;
            this.maxLongitude = MapUtil.MinAllowedLongitude;
            this.minLatitude = MapUtil.MaxAllowedLatitude;
            this.maxLatitude = MapUtil.MinAllowedLatitude;
        }

        private updateBounds(latitude: number, longitude: number): void {
            if (longitude < this.minLongitude) {
                this.minLongitude = longitude;
            }

            if (longitude > this.maxLongitude) {
                this.maxLongitude = longitude;
            }

            if (latitude < this.minLatitude) {
                this.minLatitude = latitude;
            }

            if (latitude > this.maxLatitude) {
                this.maxLatitude = latitude;
            }
        }

        public static legendObject(dataView: DataView): DataViewObject {
            return dataView &&
                dataView.metadata &&
                dataView.metadata.objects &&
                <DataViewObject>dataView.metadata.objects['legend'];
        }

        public static isLegendHidden(dataView: DataView): boolean {
            let legendObject = Map.legendObject(dataView);
            return legendObject != null && legendObject[legendProps.show] === false;
        }

        public static legendPosition(dataView: DataView): LegendPosition {
            let legendObject = Map.legendObject(dataView);
            return legendObject && LegendPosition[<string>legendObject[legendProps.position]];
        }

        public static getLegendFontSize(dataView: DataView): number {
            let legendObject = Map.legendObject(dataView);
            return (legendObject && <number>legendObject[legendProps.fontSize]) || SVGLegend.DefaultFontSizeInPt;
        }

        public static isShowLegendTitle(dataView: DataView): boolean {
            let legendObject = Map.legendObject(dataView);
            return legendObject && <boolean>legendObject[legendProps.showTitle];
        }

        private legendTitle(): string {
            let legendObject = Map.legendObject(this.dataView);
            return (legendObject && <string>legendObject[legendProps.titleText]) || this.legendData.title;
        }

        private renderLegend(legendData: LegendData): void {
            let hideLegend = Map.isLegendHidden(this.dataView);
            let showTitle = Map.isShowLegendTitle(this.dataView);
            let title = this.legendTitle();
            // Update the legendData based on the hide flag.  Cartesian passes in no-datapoints. OnResize reuses the legendData, so this can't mutate.
            let clonedLegendData: LegendData = {
                dataPoints: hideLegend ? [] : legendData.dataPoints,
                grouped: legendData.grouped,
                title: showTitle ? title : "",
                fontSize: Map.getLegendFontSize(this.dataView)
            };

            // Update the orientation to match what's in the dataView
            let targetOrientation = Map.legendPosition(this.dataView);
            if (targetOrientation !== undefined) {
                this.legend.changeOrientation(targetOrientation);
            } else {
                this.legend.changeOrientation(LegendPosition.Top);
            }

            this.legend.drawLegend(clonedLegendData, this.currentViewport);
        }

        /** Note: public for UnitTest */
        public static calculateGroupSizes(categorical: DataViewCategorical, grouped: DataViewValueColumnGroup[], groupSizeTotals: number[], sizeMeasureIndex: number, currentValueScale: SimpleRange): SimpleRange {
            let categoryCount = categorical.values[0].values.length;
            let seriesCount = grouped.length;

            for (let i = 0, len = categoryCount; i < len; ++i) {
                let groupTotal = null;
                if (sizeMeasureIndex >= 0) {
                    for (let j = 0; j < seriesCount; ++j) {
                        let value = grouped[j].values[sizeMeasureIndex].values[i];
                        if (value) {
                            if (groupTotal === null) {
                                groupTotal = value;
                            } else {
                                groupTotal += value;
                            }
                        }
                    }
                }

                groupSizeTotals.push(groupTotal);

                if (groupTotal) {
                    if (!currentValueScale) {
                        currentValueScale = {
                            min: groupTotal,
                            max: groupTotal
                        };
                    } else {
                        currentValueScale.min = Math.min(currentValueScale.min, groupTotal);
                        currentValueScale.max = Math.max(currentValueScale.max, groupTotal);
                    }
                }
            }

            return currentValueScale;
        }

        /** Note: public for UnitTest */
        public static createMapDataPoint(group: string, value: number, seriesInfo: MapSeriesInfo, radius: number, colors: IDataColorPalette, categoryIdentity: DataViewScopeIdentity): MapDataPoint {
            if (seriesInfo) {
                // Not supporting Pies yet
                let latitude = seriesInfo.latitude;
                let longitude = seriesInfo.longitude;
                let dp: MapDataPoint = {
                    geocodingQuery: group,
                    location: (latitude !== null && longitude !== null) ? new Microsoft.Maps.Location(latitude, longitude) : null,
                    value: value,
                    radius: radius,
                    seriesInfo: seriesInfo,
                    categoryIdentity: categoryIdentity,
                    categoryValue: group
                };

                if (dp.geocodingQuery === null && dp.location === null) {
                    // The user should be warned that the data isn't all shown.  Can't geocode null
                    return null;
                }

                // Update the location so the remaining code can rely upon the cachedLocation
                dp.cachedLocation = dp.location;

                return dp;
            }

            return null;
        }

        public static calculateSeriesLegend(
            grouped: DataViewValueColumnGroup[],
            groupIndex: number,
            sizeMeasureIndex: number,
            colors: IDataColorPalette,
            defaultDataPointColor?: string,
            seriesSource?: data.SQExpr[],
            interactivityService?: IInteractivityService): LegendDataPoint[] {

            let seriesCount = grouped ? grouped.length : 0;
            let legendData: LegendDataPoint[] = [];
            let colorHelper = new ColorHelper(colors, mapProps.dataPoint.fill, defaultDataPointColor);

            for (let i = 0; i < seriesCount; ++i) {
                let seriesValues = grouped[i];
                let sizeValueForCategory: any;
                let measureQueryName: string;
                if (sizeMeasureIndex >= 0) {
                    let sizeMeasure = seriesValues.values[sizeMeasureIndex];
                    sizeValueForCategory = sizeMeasure.values[groupIndex];
                    measureQueryName = sizeMeasure.source.queryName;
                }
                else {
                    sizeValueForCategory = null;
                    measureQueryName = '';
                }
                if (sizeValueForCategory !== null || sizeMeasureIndex < 0) {
                    let identity = seriesValues.identity ? SelectionId.createWithId(seriesValues.identity) : SelectionId.createNull();
                    let color = seriesSource !== undefined
                        ? colorHelper.getColorForSeriesValue(seriesValues.objects, seriesSource, seriesValues.name)
                        : colorHelper.getColorForMeasure(seriesValues.objects, measureQueryName);

                    legendData.push({
                        color: color,
                        label: valueFormatter.format(seriesValues.name),
                        icon: LegendIcon.Circle,
                        identity: identity,
                        selected: false
                    });
                }
            }

            if (interactivityService)
                interactivityService.applySelectionStateToData(legendData);

            return legendData;
        }

        /** Note: public for UnitTest */
        public static calculateSeriesInfo(
            grouped: DataViewValueColumnGroup[],
            groupIndex: number,
            sizeMeasureIndex: number,
            longitudeMeasureIndex: number,
            latitudeMeasureIndex: number,
            colors: IDataColorPalette,
            defaultDataPointColor?: string,
            objectsDefinitions?: DataViewObjects[],
            seriesSource?: data.SQExpr[]): MapSeriesInfo {

            let latitude: number = null;
            let longitude: number = null;
            let sizeValuesForGroup: MapPieSlice[] = [];
            let seriesCount = grouped ? grouped.length : 0;
            let colorHelper = new ColorHelper(colors, mapProps.dataPoint.fill, defaultDataPointColor);

            if (seriesCount > 0) {
                for (let i = 0; i < seriesCount; ++i) {
                    let seriesValues = grouped[i];
                    let sizeValueForCategory: any;
                    let measureQueryName: string;
                    if (sizeMeasureIndex >= 0) {
                        let sizeMeasure = seriesValues.values[sizeMeasureIndex];
                        sizeValueForCategory = sizeMeasure.values[groupIndex];
                        measureQueryName = sizeMeasure.source.queryName;
                    }
                    else {
                        sizeValueForCategory = null;
                        measureQueryName = '';
                    }

                    let objects = (objectsDefinitions && objectsDefinitions[groupIndex]) || (seriesValues && seriesValues.objects);

                    if (sizeValueForCategory !== null || sizeMeasureIndex < 0) {
                        let seriesIdentity = grouped[i].identity;
                        let color = seriesSource !== undefined
                            ? colorHelper.getColorForSeriesValue(objects, seriesSource, seriesValues.name)
                            : colorHelper.getColorForMeasure(objects, measureQueryName);

                        let colorRgb = Color.parseColorString(color);
                        let stroke = Color.hexString(Color.darken(colorRgb, Map.StrokeDarkenColorValue));
                        colorRgb.A = 0.6;
                        let fill = Color.rgbString(colorRgb);

                        sizeValuesForGroup.push({
                            value: sizeValueForCategory,
                            index: i,
                            fill: fill,
                            stroke: stroke,
                            seriesId: seriesIdentity,
                        });
                    }

                    latitude = Map.getOptionalMeasure(seriesValues, latitudeMeasureIndex, groupIndex, latitude);
                    longitude = Map.getOptionalMeasure(seriesValues, longitudeMeasureIndex, groupIndex, longitude);
                }
            }
            else {
                let objects = (objectsDefinitions && objectsDefinitions[groupIndex]);
                let color = colorHelper.getColorForMeasure(objects, '');

                let colorRgb = Color.parseColorString(color);
                let stroke = Color.hexString(Color.darken(colorRgb, Map.StrokeDarkenColorValue));
                colorRgb.A = 0.6;
                let fill = Color.rgbString(colorRgb);
                sizeValuesForGroup = [{
                    value: null,
                    index: 0,
                    fill: fill,
                    stroke: stroke,
                    seriesId: null,
                }];
            }

            return {
                sizeValuesForGroup: sizeValuesForGroup,
                latitude: latitude,
                longitude: longitude
            };
        }

        private static getOptionalMeasure(
            seriesValues: DataViewValueColumnGroup,
            measureIndex: number,
            groupIndex: number,
            defaultValue: number): number {

            if (measureIndex >= 0) {
                let value = seriesValues.values[measureIndex].values[groupIndex];
                if (value != null)
                    return value;
            }

            return defaultValue;
        }

        /** Note: public for UnitTest */
        public static calculateRadius(range: SimpleRange, rangeDiff: number, value?: number): number {
            let radius = 6;
            if (range != null && rangeDiff !== 0) {
                radius = (14 * ((value - range.min) / rangeDiff)) + 6;
            }

            return radius;
        }

        /** Note: public for UnitTest */
        public static getGeocodingCategory(categorical: DataViewCategorical, geoTaggingAnalyzerService: IGeoTaggingAnalyzerService): string {
            if (categorical && categorical.categories && categorical.categories.length > 0 && categorical.categories[0].source) {
                // Check categoryString for manually specified information in the model
                let type = categorical.categories[0].source.type;
                if (type && type.categoryString) {
                    return geoTaggingAnalyzerService.getFieldType(type.categoryString);
                }

                // Check the category name
                let categoryName = categorical.categories[0].source.displayName;
                let geotaggedResult = geoTaggingAnalyzerService.getFieldType(categoryName);
                if (geotaggedResult)
                    return geotaggedResult;

                // Checking roles for VRM backwards compatibility
                let roles = categorical.categories[0].source.roles;
                if (roles) {
                    let roleNames = Object.keys(roles);
                    for (let i = 0, len = roleNames.length; i < len; ++i) {
                        let typeFromRoleName = geoTaggingAnalyzerService.getFieldType(roleNames[i]);
                        if (typeFromRoleName)
                            return typeFromRoleName;
                    }
                }
            }

            return undefined;
        }

        /** Note: public for UnitTest */
        public static hasSizeField(values: DataViewValueColumns, defaultIndexIfNoRole?: number): boolean {
            if (ArrayExtensions.isUndefinedOrEmpty(values))
                return false;

            for (let i = 0, ilen = values.length; i < ilen; i++) {
                let roles = values[i].source.roles;

                // case for Power Q&A since Power Q&A does not assign role to measures.
                if (!roles && i === defaultIndexIfNoRole && values[i].source.type.numeric)
                    return true;

                if (roles) {
                    let roleNames = Object.keys(roles);
                    for (let j = 0, jlen = roleNames.length; j < jlen; j++) {
                        let role = roleNames[j];
                        if (role === "Size")
                            return true;
                    }
                }
            }
            return false;
        }

        public static shouldEnumerateDataPoints(dataView: DataView, usesSizeForGradient: boolean): boolean {
            let hasSeries = DataRoleHelper.hasRoleInDataView(dataView, 'Series');
            let gradientRole = usesSizeForGradient ? 'Size' : 'Gradient';
            let hasGradientRole = DataRoleHelper.hasRoleInDataView(dataView, gradientRole);
            return hasSeries || !hasGradientRole;
        }

        public static shouldEnumerateCategoryLabels(enableGeoShaping: boolean, filledMapDataLabelsEnabled: boolean): boolean {
            return (!enableGeoShaping || filledMapDataLabelsEnabled);
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            let enumeration = new ObjectEnumerationBuilder();
            switch (options.objectName) {
                case 'dataPoint':
                    if (Map.shouldEnumerateDataPoints(this.dataView, this.enableGeoShaping)) {
                        let bubbleData: MapBubble[] = [];
                        //TODO: better way of getting this data
                        let hasDynamicSeries = this.hasDynamicSeries;
                        if (!hasDynamicSeries) {
                            let mapData = this.dataPointRenderer.converter(this.getMapViewPort(), this.dataView, this.dataLabelsSettings, this.interactivityService);
                            bubbleData = mapData.bubbleData;
                        }
                        Map.enumerateDataPoints(enumeration, this.dataPointsToEnumerate, this.colors, hasDynamicSeries, this.defaultDataPointColor, this.showAllDataPoints, bubbleData);
                    }
                    break;
                case 'categoryLabels':
                    if (Map.shouldEnumerateCategoryLabels(this.enableGeoShaping, this.filledMapDataLabelsEnabled)) {
                        dataLabelUtils.enumerateCategoryLabels(enumeration, this.dataLabelsSettings, true, true);
                    }
                    break;
                case 'legend':
                    if (this.hasDynamicSeries) {
                        Map.enumerateLegend(enumeration, this.dataView, this.legend, this.legendTitle());
                    }
                    break;
                case 'labels':
                    if (this.filledMapDataLabelsEnabled) {
                        this.dataLabelsSettings = this.dataLabelsSettings ? this.dataLabelsSettings : dataLabelUtils.getDefaultMapLabelSettings();
                        let labelSettingOptions: VisualDataLabelsSettingsOptions = {
                            enumeration: enumeration,
                            dataLabelsSettings: this.dataLabelsSettings,
                            show: true,
                            displayUnits: true,
                            precision: true,
                        };
                        dataLabelUtils.enumerateDataLabels(labelSettingOptions);
                    }
                    break;
            }
            return enumeration.complete();
        }

        public static enumerateDataPoints(enumeration: ObjectEnumerationBuilder, dataPoints: LegendDataPoint[], colors: IDataColorPalette, hasDynamicSeries: boolean, defaultDataPointColor: string, showAllDataPoints: boolean, bubbleData: MapBubble[]): void {
            let seriesLength = dataPoints && dataPoints.length;

            if (hasDynamicSeries) {
                for (let i = 0; i < seriesLength; i++) {

                    let dataPoint = dataPoints[i];
                    enumeration.pushInstance({
                        objectName: 'dataPoint',
                        displayName: dataPoint.label,
                        selector: dataPoint.identity.getSelector(),
                        properties: {
                            fill: { solid: { color: dataPoint.color } }
                        },
                    });
                }
            }
            else {
                enumeration.pushInstance({
                    objectName: 'dataPoint',
                    selector: null,
                    properties: {
                        defaultColor: { solid: { color: defaultDataPointColor || colors.getColorByIndex(0).value } }
                    },
                }).pushInstance({
                    objectName: 'dataPoint',
                    selector: null,
                    properties: {
                        showAllDataPoints: !!showAllDataPoints
                    },
                });

                if (bubbleData) {
                    for (let i = 0; i < bubbleData.length; i++) {
                        let bubbleDataPoint = bubbleData[i];
                        enumeration.pushInstance({
                            objectName: 'dataPoint',
                            displayName: bubbleDataPoint.labeltext,
                            selector: bubbleDataPoint.identity.getSelector(),
                            properties: {
                                fill: { solid: { color: Color.normalizeToHexString(bubbleDataPoint.fill) } }
                            },
                        });
                    }
                }

            }
        }

        public static enumerateLegend(enumeration: ObjectEnumerationBuilder, dataView: DataView, legend: ILegend, legendTitle: string): void {
            enumeration.pushInstance({
                selector: null,
                properties: {
                    show: !Map.isLegendHidden(dataView),
                    position: LegendPosition[legend.getOrientation()],
                    showTitle: Map.isShowLegendTitle(dataView),
                    titleText: legendTitle,
                    fontSize: Map.getLegendFontSize(dataView)
                },
                objectName: 'legend'
            });
        }

        public onDataChanged(options: VisualDataChangedOptions): void {
            debug.assertValue(options, 'options');

            this.receivedExternalViewChange = false;

            let dataView = options.dataViews[0];
            this.dataView = dataView;
            let enableGeoShaping = this.enableGeoShaping;

            //Revert Back 
            this.dataLabelsSettings = dataLabelUtils.getDefaultMapLabelSettings();
            this.defaultDataPointColor = null;
            this.showAllDataPoints = null;
            let warnings = undefined;
            if (dataView) {
                if (dataView.metadata && dataView.metadata.objects) {
                    let objects = dataView.metadata.objects;

                    this.defaultDataPointColor = DataViewObjects.getFillColor(objects, mapProps.dataPoint.defaultColor);
                    this.showAllDataPoints = DataViewObjects.getValue<boolean>(objects, mapProps.dataPoint.showAllDataPoints);

                    this.dataLabelsSettings.showCategory = DataViewObjects.getValue<boolean>(objects, filledMapProps.categoryLabels.show, this.dataLabelsSettings.showCategory);

                    if (enableGeoShaping) {
                        this.dataLabelsSettings.precision = DataViewObjects.getValue(objects, filledMapProps.labels.labelPrecision, this.dataLabelsSettings.precision);
                        this.dataLabelsSettings.precision = (this.dataLabelsSettings.precision !== dataLabelUtils.defaultLabelPrecision && this.dataLabelsSettings.precision < 0) ? 0 : this.dataLabelsSettings.precision;
                        this.dataLabelsSettings.displayUnits = DataViewObjects.getValue<number>(objects, filledMapProps.labels.labelDisplayUnits, this.dataLabelsSettings.displayUnits);
                        let datalabelsObj = objects['labels'];
                        if (datalabelsObj) {
                            this.dataLabelsSettings.show = (datalabelsObj['show'] !== undefined) ? <boolean>datalabelsObj['show'] : this.dataLabelsSettings.show;
                            if (datalabelsObj['color'] !== undefined) {
                                this.dataLabelsSettings.labelColor = (<Fill>datalabelsObj['color']).solid.color;
                            }
                        }
                    }
                    else {
                        let categoryLabelsObj = <DataLabelObject>objects['categoryLabels'];
                        if (categoryLabelsObj)
                            dataLabelUtils.updateLabelSettingsFromLabelsObject(categoryLabelsObj, this.dataLabelsSettings);
                    }
                }

                warnings = Map.showLocationMissingWarningIfNecessary(dataView);

                let categorical = dataView.categorical;
                if (categorical && categorical.categories && categorical.categories.length > 0) {
                    this.resetBounds();

                    let grouped: DataViewValueColumnGroup[];
                    if (categorical.values)
                        grouped = categorical.values.grouped();

                    let hasDynamicSeries = grouped && !!categorical.values.source;
                    this.hasDynamicSeries = hasDynamicSeries;

                    let seriesSource: data.SQExpr[];
                    if (hasDynamicSeries) {
                        seriesSource = categorical.values.identityFields;
                    }
                    else if (categorical.values && categorical.values.length > 0) {
                        seriesSource = categorical.categories[0].identityFields;
                    }

                    let sizeIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, "Size");
                    let longIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, "X");
                    let latIndex = DataRoleHelper.getMeasureIndexOfRole(grouped, "Y");

                    let groupSizeTotals: number[] = [];
                    this.valueScale = null; // Clear scale
                    if (sizeIndex !== -1)
                        this.valueScale = Map.calculateGroupSizes(categorical, grouped, groupSizeTotals, sizeIndex, this.valueScale);
                    this.geocodingCategory = Map.getGeocodingCategory(categorical, this.geoTaggingAnalyzerService);
                    let scaleDiff = this.valueScale ? this.valueScale.max - this.valueScale.min : 0;

                    if (enableGeoShaping && (!this.geocodingCategory || !this.geoTaggingAnalyzerService.isGeoshapable(this.geocodingCategory))) {
                        warnings.push(new FilledMapWithoutValidGeotagCategoryWarning());
                    }

                    this.mapControlFactory.ensureMap(this.locale, () => {
                        // NOTE: We calculate the legend first so that colors are guaranteed to be assigned in series order.
                        let legendDataPoints = Map.calculateSeriesLegend(grouped, i, sizeIndex, this.colors, this.defaultDataPointColor, seriesSource, this.interactivityService);
                        if (legendDataPoints.length === 1)
                            legendDataPoints = [];

                        let groupValues = categorical.categories[0].values;
                        let categoryIdentities = dataView.categorical.categories[0].identity;
                        this.dataPointRenderer.beginDataPointUpdate(this.geocodingCategory, groupValues.length);
                        let objectDefinitions = dataView.categorical.categories[0].objects;
                        for (var i = 0, ilen = groupValues.length; i < ilen; i++) {
                            let group = groupValues[i];
                            let value = groupSizeTotals[i];
                            let seriesInfo = Map.calculateSeriesInfo(grouped, i, sizeIndex, longIndex, latIndex, this.colors, this.defaultDataPointColor, objectDefinitions, seriesSource);
                            let radius = Map.calculateRadius(this.valueScale, scaleDiff, value);

                            let params;
                            if (enableGeoShaping) {
                                params = MapShapeDataPointRenderer.getFilledMapParams(this.geocodingCategory, groupValues.length);
                            }

                            let dp = Map.createMapDataPoint(group, value, seriesInfo, radius, this.colors, categoryIdentities ? categoryIdentities[i] : undefined);
                            if (dp) {
                                this.dataPointRenderer.addDataPoint(dp);
                                if (!dp.location) {
                                    if (enableGeoShaping)
                                        this.enqueueGeoCodeAndGeoShape(dp, params);
                                    else
                                        this.enqueueGeoCode(dp);
                                }
                                else if (enableGeoShaping && !dp.paths) {
                                    this.enqueueGeoShape(dp, params);
                                }
                                else {
                                    this.addDataPoint(dp);
                                }
                            }
                        }

                        let dvValues = categorical.values;
                        let title = dvValues && dvValues.source ? dvValues.source.displayName : "";
                        this.legendData = { title: title, dataPoints: legendDataPoints };
                        this.dataPointsToEnumerate = legendDataPoints;

                        this.renderLegend(this.legendData);
                    });
                }
                else {
                    this.clearDataPoints();
                }
            }
            else {
                this.clearDataPoints();
            }

            this.host.setWarnings(warnings);

            this.updateInternal(true /* dataChanged */);
        }

        private swapLogoContainerChildElement() {
            // This is a workaround that allow maps to be printed from the IE and Edge browsers.
            // For some unknown reason, the presence of an <a> child element in the .LogoContainer
            // prevents dashboard map visuals from showing up when printed.
            // The trick is to swap out the <a> element with a <div> container.
            // There are no user impacts or visual changes.
            let logoContainer = this.element.find('.LogoContainer');

            if (logoContainer) {
                let aNode = logoContainer.find('a');
                if (aNode == null)
                    return;

                let divNode = $('<div>');
                aNode.children().clone().appendTo(divNode);
                aNode.remove();
                divNode.appendTo(logoContainer);
            }
        }

        /** Note: Public for UnitTests */
        public static showLocationMissingWarningIfNecessary(dataView: powerbi.DataView): IVisualWarning[] {
            let metadata = dataView.metadata;

            if (metadata && metadata.columns) {
                let columns = metadata.columns;
                let foundLocation: boolean = false;

                for (let i = 0; i < columns.length; i++) {
                    if (DataRoleHelper.hasRole(columns[i], 'Category')) {
                        // Found location
                        foundLocation = true;
                    }
                }

                if (!foundLocation) {
                    return [new NoMapLocationWarning()];
                }
            }

            return [];
        }

        public onResizing(viewport: IViewport): void {
            if (this.currentViewport.width !== viewport.width || this.currentViewport.height !== viewport.height) {
                this.currentViewport = viewport;
                this.renderLegend(this.legendData);
                this.updateInternal(false /* dataChanged */);
            }
        }

        private initialize(container: HTMLElement): void {
            let mapOptions = {
                credentials: MapUtil.Settings.BingKey,
                showMapTypeSelector: false,
                enableClickableLogo: false,
                enableSearchLogo: false,
                mapTypeId: Microsoft.Maps.MapTypeId.road,
                customizeOverlays: true,
                showDashboard: false,
                showScalebar: false,
                disableKeyboardInput: true, // Workaround for the BingMaps control moving focus from QnA
                disableZooming: this.disableZooming,
                disablePanning: this.disablePanning,
            };
            let divQuery = InJs.DomFactory.div().addClass(Map.MapContainer.cssClass).appendTo(container);
            this.mapControl = this.mapControlFactory.createMapControl(divQuery[0], mapOptions);

            if (this.viewChangeThrottleInterval !== undefined) {
                Microsoft.Maps.Events.addThrottledHandler(this.mapControl, "viewchange", () => { this.onViewChanged(); },
                    this.viewChangeThrottleInterval);
            } else {
                Microsoft.Maps.Events.addHandler(this.mapControl, "viewchange", () => { this.onViewChanged(); });
            }

            this.dataPointRenderer.init(this.mapControl, divQuery, !!this.behavior);

            if (!this.pendingGeocodingRender) {
                this.updateInternal(true /* dataChanged */);
            }
        }

        private onViewChanged() {
            if (!this.executingInternalViewChange)
                this.receivedExternalViewChange = true;
            else
                this.executingInternalViewChange = false;
            this.updateOffsets(false /* dataChanged */);
            if (this.behavior)
                this.behavior.viewChanged();

            this.swapLogoContainerChildElement();
        }

        private getMapViewPort(): IViewport {
            let currentViewport = this.currentViewport;
            let legendMargins = this.legend.getMargins();

            let mapViewport = {
                width: currentViewport.width - legendMargins.width,
                height: currentViewport.height - legendMargins.height,
            };

            return mapViewport;
        }

        private updateInternal(dataChanged: boolean) {
            if (this.mapControl) {
                let isLegendVisible = this.legend.isVisible();

                if (!isLegendVisible)
                    this.legendData = { dataPoints: [] };

                let mapDiv = this.element.children(Map.MapContainer.selector);
                let mapViewport = this.getMapViewPort();
                mapDiv.height(mapViewport.height);
                mapDiv.width(mapViewport.width);

                // With the risk of double drawing, if the position updates to nearly the same, the map control won't call viewchange, so explicitly update the points
                this.updateOffsets(dataChanged);

                // Set zoom level after we rendered that map as we need the max size of the bubbles/ pie slices to calculate it
                let levelOfDetail = this.getOptimumLevelOfDetail(mapViewport.width, mapViewport.height);
                let center = this.getViewCenter(levelOfDetail);

                if (!this.receivedExternalViewChange || !this.interactivityService) {
                    this.executingInternalViewChange = true;
                    this.mapControl.setView({ center: center, zoom: levelOfDetail, animate: true });
                }
            }
        }

        private updateOffsets(dataChanged: boolean) {
            let dataView = this.dataView;
            let data: MapData;
            let viewport = this.getMapViewPort();
            if (dataView && dataView.categorical) {
                // currentViewport may not exist in UnitTests
                data = this.dataPointRenderer.converter(viewport, this.dataView, this.dataLabelsSettings, this.interactivityService);
            }
            else {
                data = {
                    bubbleData: [],
                    shapeData: [],
                    sliceData: [],
                };
            }

            let behaviorOptions = this.dataPointRenderer.updateInternal(data, viewport, dataChanged, this.interactivityService);

            if (this.interactivityService && behaviorOptions) {
                this.interactivityService.bind(behaviorOptions.dataPoints, this.behavior, behaviorOptions);
            }
        }

        public onClearSelection(): void {
            this.interactivityService.clearSelection();
            this.updateOffsets(false /* dataChanged */);
        }

        private clearDataPoints(): void {
            this.dataPointRenderer.clearDataPoints();
            this.legend.drawLegend({ dataPoints: [] }, this.currentViewport);
        }

        private getDefaultMapControlFactory(): IMapControlFactory {
            return {
                createMapControl: (element: HTMLElement, options: Microsoft.Maps.MapOptions) => new Microsoft.Maps.Map(element, options),
                ensureMap: jsCommon.ensureMap,
            };
        }
    }
}