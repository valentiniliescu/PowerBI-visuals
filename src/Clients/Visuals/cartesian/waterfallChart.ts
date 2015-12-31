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
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;
    import PixelConverter = jsCommon.PixelConverter;
    import createClassAndSelector = jsCommon.CssConstants.createClassAndSelector;

    export interface WaterfallChartData extends CartesianData {
        series: WaterfallChartSeries[];
        categories: any[];
        valuesMetadata: DataViewMetadataColumn;
        legend: LegendData;
        hasHighlights: boolean;
        categoryMetadata: DataViewMetadataColumn;
        positionMax: number;
        positionMin: number;
        sentimentColors: WaterfallChartSentimentColors;
        dataLabelsSettings: VisualDataLabelsSettings;
        axesLabels: ChartAxesLabels;
    }

    export interface WaterfallChartSeries extends CartesianSeries {
        data: WaterfallChartDataPoint[];
    }

    export interface WaterfallChartDataPoint extends CartesianDataPoint, SelectableDataPoint, TooltipEnabledDataPoint, LabelEnabledDataPoint {
        position: number;
        color: string;
        highlight: boolean;
        key: string;
        isTotal?: boolean;
    }

    export interface WaterfallChartConstructorOptions extends CartesianVisualConstructorOptions {
    }

    export interface WaterfallChartSentimentColors {
        increaseFill: Fill;
        decreaseFill: Fill;
        totalFill: Fill;
    }

    export interface WaterfallLayout extends CategoryLayout, ILabelLayout {
        categoryWidth: number;
    }

    export class WaterfallChart implements ICartesianVisual {
        public static formatStringProp: DataViewObjectPropertyIdentifier = { objectName: 'general', propertyName: 'formatString' };
        private static WaterfallClassName = 'waterfallChart';
        private static MainGraphicsContextClassName = 'mainGraphicsContext';
        private static IncreaseLabel = "Waterfall_IncreaseLabel";
        private static DecreaseLabel = "Waterfall_DecreaseLabel";
        private static TotalLabel = "Waterfall_TotalLabel";
        private static CategoryValueClasses: ClassAndSelector = createClassAndSelector('column');
        private static WaterfallConnectorClasses: ClassAndSelector = createClassAndSelector('waterfall-connector');

        private static defaultTotalColor = "#00b8aa";
        private static validLabelPositions = [RectLabelPosition.OutsideEnd, RectLabelPosition.InsideEnd];
        private static validZeroLabelPosition = [RectLabelPosition.OutsideEnd, RectLabelPosition.OutsideBase];

        private svg: D3.Selection;
        private mainGraphicsContext: D3.Selection;
        private labelGraphicsContext: D3.Selection;
        private mainGraphicsSVG: D3.Selection;
        private xAxisProperties: IAxisProperties;
        private yAxisProperties: IAxisProperties;
        private currentViewport: IViewport;
        private data: WaterfallChartData;
        private element: JQuery;
        private isScrollable: boolean;
        private tooltipsEnabled: boolean;

        /**
         * Note: If we overflowed horizontally then this holds the subset of data we should render.
         */
        private clippedData: WaterfallChartData;

        private style: IVisualStyle;
        private colors: IDataColorPalette;
        private hostServices: IVisualHostServices;
        private cartesianVisualHost: ICartesianVisualHost;
        private interactivity: InteractivityOptions;
        private margin: IMargin;
        private options: CartesianVisualInitOptions;
        private interactivityService: IInteractivityService;
        private layout: WaterfallLayout;

        constructor(options: WaterfallChartConstructorOptions) {
            this.isScrollable = options.isScrollable;
            this.tooltipsEnabled = options.tooltipsEnabled;
            this.interactivityService = options.interactivityService;
        }

        public init(options: CartesianVisualInitOptions): void {
            debug.assertValue(options, 'options');

            this.svg = options.svg;
            this.style = options.style;
            this.currentViewport = options.viewport;
            this.hostServices = options.host;
            this.interactivity = options.interactivity;
            this.cartesianVisualHost = options.cartesianHost;
            this.options = options;
            this.element = options.element;
            this.colors = this.style.colorPalette.dataColors;
            this.element.addClass(WaterfallChart.WaterfallClassName);
            this.mainGraphicsSVG = this.svg.append('svg');
            this.mainGraphicsContext = this.mainGraphicsSVG.append('g')
                .classed(WaterfallChart.MainGraphicsContextClassName, true);
            this.labelGraphicsContext = this.mainGraphicsSVG.append('g')
                .classed(NewDataLabelUtils.labelGraphicsContextClass.class, true);
        }

        public static converter(
            dataView: DataView,
            palette: IDataColorPalette,
            hostServices: IVisualHostServices,
            dataLabelSettings: VisualDataLabelsSettings,
            sentimentColors: WaterfallChartSentimentColors,
            interactivityService: IInteractivityService): WaterfallChartData {
            debug.assertValue(palette, 'palette');

            let formatStringProp = WaterfallChart.formatStringProp;
            let categories = dataView.categorical.categories || [];

            let increaseColor = sentimentColors.increaseFill.solid.color;
            let decreaseColor = sentimentColors.decreaseFill.solid.color;
            let totalColor = sentimentColors.totalFill.solid.color;

            let totalLabel = hostServices.getLocalizedString(WaterfallChart.TotalLabel);
            let increaseLabel = hostServices.getLocalizedString(WaterfallChart.IncreaseLabel);
            let decreaseLabel = hostServices.getLocalizedString(WaterfallChart.DecreaseLabel);

            let legend: LegendDataPoint[] = [
                {
                    label: increaseLabel,
                    color: increaseColor,
                    icon: LegendIcon.Box,
                    identity: SelectionIdBuilder.builder().withMeasure('increase').createSelectionId(),
                    selected: false,
                }, {
                    label: decreaseLabel,
                    color: decreaseColor,
                    icon: LegendIcon.Box,
                    identity: SelectionIdBuilder.builder().withMeasure('decrease').createSelectionId(),
                    selected: false,
                }, {
                    label: totalLabel,
                    color: totalColor,
                    icon: LegendIcon.Box,
                    identity: SelectionIdBuilder.builder().withMeasure('total').createSelectionId(),
                    selected: false,
                }];

            /**
             * The position represents the starting point for each bar,
             * for any value it is the sum of all previous values.
             * Values > 0 are considered gains, values < 0 are losses.
             */
            let pos = 0, posMin = 0, posMax = 0;
            let dataPoints: WaterfallChartDataPoint[] = [];
            let categoryValues: any[] = [];
            let categoryMetadata: DataViewMetadataColumn;
            let values = dataView.categorical.values;
            let valuesMetadata = undefined;
            if (!_.isEmpty(values)) {
                let column = values[0];
                valuesMetadata = column.source;
                let labelFormatString = valuesMetadata.format;
                if (_.isEmpty(categories)) {
                    // We have values but no category, just show the total bar.
                    pos = posMax = column.values[0];
                    posMin = 0;
                }
                else {
                    let categoryColumn = categories[0];
                    categoryMetadata = categoryColumn.source;
                    categoryValues = categoryColumn.values.slice();
                    categoryValues.push(totalLabel);

                    for (var categoryIndex = 0, catLen = column.values.length; categoryIndex < catLen; categoryIndex++) {
                        let category = categoryValues[categoryIndex];
                        let value = column.values[categoryIndex] || 0;
                        let identity = SelectionIdBuilder.builder()
                            .withCategory(categoryColumn, categoryIndex)
                            .createSelectionId();

                        let tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(formatStringProp, dataView.categorical, category, value);
                        let color = value > 0 ? increaseColor : decreaseColor;

                        dataPoints.push({
                            value: value,
                            position: pos,
                            color: color,
                            categoryValue: category,
                            categoryIndex: categoryIndex,
                            seriesIndex: 0,
                            selected: false,
                            identity: identity,
                            highlight: false,
                            key: identity.getKey(),
                            tooltipInfo: tooltipInfo,
                            labelFill: dataLabelSettings.labelColor,
                            labelFormatString: labelFormatString,
                        });

                        pos += value;
                        if (pos > posMax)
                            posMax = pos;
                        if (pos < posMin)
                            posMin = pos;
                    }
                }

                let totalIdentity = SelectionId.createNull();
                dataPoints.push({
                    value: pos,
                    position: 0,
                    color: totalColor,
                    categoryValue: totalLabel,
                    categoryIndex: categoryIndex,
                    identity: totalIdentity,
                    seriesIndex: 0,
                    selected: false,
                    highlight: false,
                    key: totalIdentity.getKey(),
                    tooltipInfo: TooltipBuilder.createTooltipInfo(formatStringProp, dataView.categorical, totalLabel, pos),
                    labelFill: dataLabelSettings.labelColor,
                    labelFormatString: labelFormatString,
                    isTotal: true,
                });
            }

            if (interactivityService) {
                interactivityService.applySelectionStateToData(dataPoints);
            }

            let xAxisProperties = CartesianHelper.getCategoryAxisProperties(dataView.metadata);
            let yAxisProperties = CartesianHelper.getValueAxisProperties(dataView.metadata);
            let axesLabels = converterHelper.createAxesLabels(xAxisProperties, yAxisProperties, categoryMetadata, [valuesMetadata]);

            return {
                series: [{ data: dataPoints }],
                categories: categoryValues,
                categoryMetadata: categoryMetadata,
                valuesMetadata: valuesMetadata,
                legend: { dataPoints: legend },
                hasHighlights: false,
                positionMin: posMin,
                positionMax: posMax,
                dataLabelsSettings: dataLabelSettings,
                sentimentColors: sentimentColors,
                axesLabels: { x: axesLabels.xAxisLabel, y: axesLabels.yAxisLabel },
            };
        }

        public setData(dataViews: DataView[]): void {
            debug.assertValue(dataViews, "dataViews");

            let sentimentColors = this.getSentimentColorsFromObjects(null);
            let dataView = dataViews.length > 0 ? dataViews[0] : undefined;

            this.data = <WaterfallChartData> {
                series: [{ data: [] }],
                categories: [],
                valuesMetadata: null,
                legend: { dataPoints: [], },
                hasHighlights: false,
                categoryMetadata: null,
                scalarCategoryAxis: false,
                positionMax: 0,
                positionMin: 0,
                dataLabelsSettings: dataLabelUtils.getDefaultLabelSettings(/* show */ false, /* labelColor */ undefined),
                sentimentColors: sentimentColors,
                axesLabels: { x: null, y: null },
            };

                if (dataView) {
                    if (dataView.metadata && dataView.metadata.objects) {
                        let objects = dataView.metadata.objects;

                        let labelsObj = <DataLabelObject>objects['labels'];
                        if (labelsObj) {
                            dataLabelUtils.updateLabelSettingsFromLabelsObject(labelsObj, this.data.dataLabelsSettings);
                        }
                        sentimentColors = this.getSentimentColorsFromObjects(objects);
                    }

                    if (dataView.categorical) {
                        this.data = WaterfallChart.converter(dataView, this.colors, this.hostServices, this.data.dataLabelsSettings, sentimentColors, this.interactivityService);
                    }
                }
            }

        public enumerateObjectInstances(enumeration: ObjectEnumerationBuilder, options: EnumerateVisualObjectInstancesOptions): void {
            switch (options.objectName) {
                case 'sentimentColors':
                    this.enumerateSentimentColors(enumeration);
                    break;
                case 'labels':
                    let labelSettingOptions: VisualDataLabelsSettingsOptions = {
                        enumeration: enumeration,
                        dataLabelsSettings: this.data.dataLabelsSettings,
                        show: true,
                        displayUnits: true,
                        precision: true,
                        fontSize: true,
                    };
                    dataLabelUtils.enumerateDataLabels(labelSettingOptions);
                    break;
            }
        }

        private enumerateSentimentColors(enumeration: ObjectEnumerationBuilder): void {
            let sentimentColors = this.data.sentimentColors;

            enumeration.pushInstance({
                selector: null,
                properties: {
                    increaseFill: sentimentColors.increaseFill,
                    decreaseFill: sentimentColors.decreaseFill,
                    totalFill: sentimentColors.totalFill
                },
                objectName: 'sentimentColors'
            });
        }

        public calculateLegend(): LegendData {
            // TODO: support interactive legend
            return this.data.legend;
        }

        public hasLegend(): boolean {
            // Waterfall legend is more like a color-key, so just return true
            return true;
        }

        private static createClippedDataIfOverflowed(data: WaterfallChartData, renderableDataCount: number): WaterfallChartData {
            let clipped: WaterfallChartData = data;
            let dataPoints: WaterfallChartDataPoint[] = data.series[0].data;

            if (data && renderableDataCount < dataPoints.length) {
                clipped = Prototype.inherit(data);
                clipped.series = [{ data: dataPoints.slice(0, renderableDataCount) }];
                clipped.categories = data.categories.slice(0, renderableDataCount);
            }

            return clipped;
        }

        public calculateAxesProperties(options: CalculateScaleAndDomainOptions): IAxisProperties[] {
            debug.assertValue(options, 'options');

            this.currentViewport = options.viewport;
            let margin = this.margin = options.margin;
            let data = this.clippedData = this.data;
            let categoryCount = data.categories.length;

            /* preferredPlotArea would be same as currentViewport width when there is no scrollbar. 
             In that case we want to calculate the available plot area for the shapes by subtracting the margin from available viewport */
            let preferredPlotArea = this.getPreferredPlotArea(false, categoryCount, CartesianChart.MinOrdinalRectThickness);
            if (preferredPlotArea.width === this.currentViewport.width) {
                preferredPlotArea.width -= (margin.left + margin.right);
            }
            preferredPlotArea.height -= (margin.top + margin.bottom);

            let cartesianLayout = CartesianChart.getLayout(
                null,
                {
                    availableWidth: preferredPlotArea.width,
                    categoryCount: categoryCount,
                    domain: null,
                    isScalar: false,
                    isScrollable: this.isScrollable
                });

            // In the case that we have overflowed horizontally we want to clip the data and use that to calculate the axes on the dashboard.           
            if (!this.isScrollable) {
                data = this.clippedData = WaterfallChart.createClippedDataIfOverflowed(data, cartesianLayout.categoryCount);
            }

            let xAxisCreationOptions = WaterfallChart.getXAxisCreationOptions(data, preferredPlotArea.width, cartesianLayout, options);
            let yAxisCreationOptions = WaterfallChart.getYAxisCreationOptions(data, preferredPlotArea.height, options);

            let xAxisProperties = this.xAxisProperties = AxisHelper.createAxis(xAxisCreationOptions);
            let yAxisProperties = this.yAxisProperties = AxisHelper.createAxis(yAxisCreationOptions);

            let categoryWidth = this.xAxisProperties.categoryThickness * (1 - CartesianChart.InnerPaddingRatio);

            let formattersCache = dataLabelUtils.createColumnFormatterCacheManager();
            let labelSettings = data.dataLabelsSettings;
            let value2: number = WaterfallChart.getDisplayUnitValueFromAxisFormatter(yAxisProperties, labelSettings);

            this.layout = {
                categoryCount: cartesianLayout.categoryCount,
                categoryThickness: cartesianLayout.categoryThickness,
                isScalar: cartesianLayout.isScalar,
                outerPaddingRatio: cartesianLayout.outerPaddingRatio,
                categoryWidth: categoryWidth,
                labelText: (d: WaterfallChartDataPoint) => {
                    //total value has no identity
                    let formatter = formattersCache.getOrCreate(d.labelFormatString, labelSettings, value2);
                    return dataLabelUtils.getLabelFormattedText({ label: formatter.format(d.value) });
                },
                labelLayout: dataLabelUtils.getLabelLayoutXYForWaterfall(xAxisProperties, categoryWidth, yAxisProperties, yAxisCreationOptions.dataDomain),
                filter: (d: WaterfallChartDataPoint) => {
                    return dataLabelUtils.doesDataLabelFitInShape(d, yAxisProperties, this.layout);
                },
                style: {
                    'fill': (d: WaterfallChartDataPoint) => {
                        if (d.isLabelInside)
                            return dataLabelUtils.defaultInsideLabelColor;
                        return d.labelFill;
                    },
                },
            };

            this.xAxisProperties.axisLabel = options.showCategoryAxisLabel ? data.axesLabels.x : null;
            this.yAxisProperties.axisLabel = options.showValueAxisLabel ? data.axesLabels.y : null;

            return [xAxisProperties, yAxisProperties];
        }

        private static getDisplayUnitValueFromAxisFormatter(yAxisProperties: IAxisProperties, labelSettings: VisualDataLabelsSettings): number {
            return (yAxisProperties.formatter && yAxisProperties.formatter.displayUnit && labelSettings.displayUnits === 0) ? yAxisProperties.formatter.displayUnit.value : null;
        }

        private static lookupXValue(data: WaterfallChartData, index: number, type: ValueType): any {
            let dataPoints: WaterfallChartDataPoint[] = data.series[0].data;

            if (index === dataPoints.length - 1)
                // Total
                return dataPoints[index].categoryValue;
            else
                return CartesianHelper.lookupXValue(data, index, type, false);
        }

        public static getXAxisCreationOptions(data: WaterfallChartData, width: number, layout: CategoryLayout, options: CalculateScaleAndDomainOptions): CreateAxisOptions {
            debug.assertValue(data, 'data');
            debug.assertValue(options, 'options');

            let categoryDataType: ValueType = AxisHelper.getCategoryValueType(data.categoryMetadata);

            let domain = AxisHelper.createDomain(data.series, categoryDataType, /* isScalar */ false, options.forcedXDomain);

            let categoryThickness = layout.categoryThickness;
            let outerPadding = categoryThickness * layout.outerPaddingRatio;

            return <CreateAxisOptions> {
                pixelSpan: width,
                dataDomain: domain,
                metaDataColumn: data.categoryMetadata,
                formatString: valueFormatter.getFormatString(data.categoryMetadata, WaterfallChart.formatStringProp),
                isScalar: false,
                outerPadding: outerPadding,
                categoryThickness: categoryThickness,
                getValueFn: (index, type) => WaterfallChart.lookupXValue(data, index, type),
                forcedTickCount: options.forcedTickCount,
                isCategoryAxis: true,
                axisDisplayUnits: options.categoryAxisDisplayUnits,
                axisPrecision: options.categoryAxisPrecision
            };
        }

        public static getYAxisCreationOptions(data: WaterfallChartData, height: number, options: CalculateScaleAndDomainOptions): CreateAxisOptions {
            debug.assertValue(data, 'data');
            debug.assertValue(options, 'options');

            let combinedDomain = AxisHelper.combineDomain(options.forcedYDomain, [data.positionMin, data.positionMax]);

            return <CreateAxisOptions> {
                pixelSpan: height,
                dataDomain: combinedDomain,
                isScalar: true,
                isVertical: true,
                metaDataColumn: data.valuesMetadata,
                formatString: valueFormatter.getFormatString(data.valuesMetadata, WaterfallChart.formatStringProp),
                outerPadding: 0,
                forcedTickCount: options.forcedTickCount,
                useTickIntervalForDisplayUnits: true,
                isCategoryAxis: false,
                axisDisplayUnits: options.valueAxisDisplayUnits,
                axisPrecision: options.valueAxisPrecision
            };
        }

        public getPreferredPlotArea(isScalar: boolean, categoryCount: number, categoryThickness: number): IViewport {
            return CartesianChart.getPreferredPlotArea(
                categoryCount,
                categoryThickness,
                this.currentViewport,
                this.isScrollable,
                isScalar);
        }

        public getVisualCategoryAxisIsScalar(): boolean {
            return false;
        }

        public overrideXScale(xProperties: IAxisProperties): void {
            this.xAxisProperties = xProperties;
        }

        public setFilteredData(startIndex: number, endIndex: number): any {
            let data = this.clippedData = Prototype.inherit(this.data);

            data.series = [{ data: data.series[0].data.slice(startIndex, endIndex) }];
            data.categories = data.categories.slice(startIndex, endIndex);

            return data;
        }

        private createRects(data: WaterfallChartDataPoint[]): D3.UpdateSelection {
            let mainGraphicsContext = this.mainGraphicsContext;
            let colsSelection = mainGraphicsContext.selectAll(WaterfallChart.CategoryValueClasses.selector);
            let cols = colsSelection.data(data, (d: WaterfallChartDataPoint) => d.key);

            cols
                .enter()
                .append('rect')
                .attr('class', (d: WaterfallChartDataPoint) => WaterfallChart.CategoryValueClasses.class.concat(d.highlight ? 'highlight' : ''));

            cols.exit().remove();

            return cols;
        }

        private createConnectors(data: WaterfallChartDataPoint[]): D3.UpdateSelection {
            let mainGraphicsContext = this.mainGraphicsContext;
            let connectorSelection = mainGraphicsContext.selectAll(WaterfallChart.WaterfallConnectorClasses.selector);

            let connectors = connectorSelection.data(data.slice(0, data.length - 1), (d: WaterfallChartDataPoint) => d.key);

            connectors
                .enter()
                .append('line')
                .classed(WaterfallChart.WaterfallConnectorClasses.class, true);

            connectors.exit().remove();

            return connectors;
        }

        public render(suppressAnimations: boolean): CartesianVisualRenderResult {
            let dataPoints = this.clippedData.series[0].data;
            let bars = this.createRects(dataPoints);
            let connectors = this.createConnectors(dataPoints);

            if (this.tooltipsEnabled) 
                TooltipManager.addTooltip(bars, (tooltipEvent: TooltipEvent) => tooltipEvent.data.tooltipInfo);

            let hasSelection = this.interactivityService && this.interactivityService.hasSelection();

            let xScale = this.xAxisProperties.scale;
            let yScale = this.yAxisProperties.scale;
            let y0 = yScale(0);

            this.mainGraphicsSVG.attr('height', this.getAvailableHeight())
                .attr('width', this.getAvailableWidth());

            /**
             * The y-value is always at the top of the rect. If the data value is negative then we can
             * use the scaled position directly since we are drawing down. If the data value is positive
             * we have to calculate the top of the rect and use that as the y-value. Since the y-value 
             * is always the top of the rect, height should always be positive.
             */
            bars
                .style('fill', (d: WaterfallChartDataPoint) => d.color)
                .style('fill-opacity', (d: WaterfallChartDataPoint) => d.isTotal ? ColumnUtil.DefaultOpacity : ColumnUtil.getFillOpacity(d.selected, d.highlight, hasSelection, this.data.hasHighlights))
                .attr('width', this.layout.categoryWidth)
                .attr('x', (d: WaterfallChartDataPoint) => xScale(d.categoryIndex))
                .attr('y', (d: WaterfallChartDataPoint) => WaterfallChart.getRectTop(yScale, d.position, d.value))
                .attr('height', (d: WaterfallChartDataPoint) => y0 - yScale(Math.abs(d.value)));

            connectors
                .attr({
                    'x1': (d: WaterfallChartDataPoint) => xScale(d.categoryIndex),
                    'y1': (d: WaterfallChartDataPoint) => yScale(d.position + d.value),
                    'x2': (d: WaterfallChartDataPoint) => xScale(d.categoryIndex + 1) + this.layout.categoryWidth,
                    'y2': (d: WaterfallChartDataPoint) => yScale(d.position + d.value),
                });

            let labelSettings = this.data.dataLabelsSettings;
            let labelDataPoints: LabelDataPoint[] = [];
            if (labelSettings && labelSettings.show || labelSettings.showCategory) {
                labelDataPoints = this.createLabelDataPoints();
            }

            let behaviorOptions: WaterfallChartBehaviorOptions = undefined;
            if (this.interactivityService) {
                behaviorOptions = {
                    bars: bars,
                    datapoints: dataPoints,
                };
            }

            // This should always be the last line in the render code.
            SVGUtil.flushAllD3TransitionsIfNeeded(this.options);

            return { dataPoints: dataPoints, behaviorOptions: behaviorOptions, labelDataPoints: labelDataPoints, labelsAreNumeric: true };
        }

        public onClearSelection(): void {
            if (this.interactivityService)
                this.interactivityService.clearSelection();
        }

        public getSupportedCategoryAxisType(): string {
            return axisType.categorical;
        }

        public static getRectTop(scale: D3.Scale.GenericScale<any>, pos: number, value: number): number {
            if (value < 0)
                return scale(pos);
            else
                return scale(pos) - (scale(0) - scale(value));
        }

        private getAvailableWidth(): number {
            return this.currentViewport.width - (this.margin.left + this.margin.right);
        }

        private getAvailableHeight(): number {
            return this.currentViewport.height - (this.margin.top + this.margin.bottom);
        }

        private getSentimentColorsFromObjects(objects: DataViewObjects): WaterfallChartSentimentColors {
            let defaultSentimentColors = this.colors.getSentimentColors();
            let increaseColor = DataViewObjects.getFillColor(objects, waterfallChartProps.sentimentColors.increaseFill, defaultSentimentColors[2].value);
            let decreaseColor = DataViewObjects.getFillColor(objects, waterfallChartProps.sentimentColors.decreaseFill, defaultSentimentColors[0].value);
            let totalColor = DataViewObjects.getFillColor(objects, waterfallChartProps.sentimentColors.totalFill, WaterfallChart.defaultTotalColor);

            return <WaterfallChartSentimentColors> {
                increaseFill: { solid: { color: increaseColor } },
                decreaseFill: { solid: { color: decreaseColor } },
                totalFill: { solid: { color: totalColor } }
            };
        }

        // Public for testing
        public createLabelDataPoints(): LabelDataPoint[]{
            let labelDataPoints: LabelDataPoint[] = [];

            let data = this.data;
            let xScale = this.xAxisProperties.scale;
            let yScale = this.yAxisProperties.scale;
            let y0 = yScale(0);
            let series = data.series;
            let formattersCache = NewDataLabelUtils.createColumnFormatterCacheManager();
            let axisFormatter: number = NewDataLabelUtils.getDisplayUnitValueFromAxisFormatter(this.yAxisProperties.formatter, data.dataLabelsSettings);
            let labelSettings = this.data.dataLabelsSettings;

            for (let currentSeries of series) {
                for (let dataPoint of currentSeries.data) {
                    // Calculate parent rectangle
                    let parentRect: IRect = {
                        left: xScale(dataPoint.categoryIndex),
                        top: WaterfallChart.getRectTop(yScale, dataPoint.position, dataPoint.value),
                        width: this.layout.categoryWidth,
                        height: y0 - yScale(Math.abs(dataPoint.value)),
                    };

                    // Calculate label text
                    let formatString = dataPoint.labelFormatString;
                    let formatter = formattersCache.getOrCreate(formatString, this.data.dataLabelsSettings, axisFormatter);
                    let text = NewDataLabelUtils.getLabelFormattedText(formatter.format(dataPoint.value));

                    // Calculate text size
                    let properties: TextProperties = {
                        text: text,
                        fontFamily: NewDataLabelUtils.LabelTextProperties.fontFamily,
                        fontSize: PixelConverter.fromPoint(labelSettings.fontSize || NewDataLabelUtils.DefaultLabelFontSizeInPt),
                        fontWeight: NewDataLabelUtils.LabelTextProperties.fontWeight,
                    };

                    let textWidth = TextMeasurementService.measureSvgTextWidth(properties);
                    let textHeight = TextMeasurementService.estimateSvgTextHeight(properties, true /* tightFitForNumeric */);

                    labelDataPoints.push({
                        isPreferred: true,
                        text: text,
                        textSize: {
                            width: textWidth,
                            height: textHeight,
                        },
                        outsideFill: labelSettings.labelColor ? labelSettings.labelColor : NewDataLabelUtils.defaultLabelColor,
                        insideFill: NewDataLabelUtils.defaultInsideLabelColor,
                        parentType: LabelDataPointParentType.Rectangle,
                        parentShape: {
                            rect: parentRect,
                            orientation: dataPoint.value >= 0 ? NewRectOrientation.VerticalBottomBased : NewRectOrientation.VerticalTopBased,
                            validPositions: dataPoint.value === 0 ? WaterfallChart.validZeroLabelPosition : WaterfallChart.validLabelPositions,
                        },
                        fontSize: labelSettings.fontSize,
                        identity: undefined,
                    });
                }
            }

            return labelDataPoints;
        }
    }
}