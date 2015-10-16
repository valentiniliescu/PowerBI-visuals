/*
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

/// <reference path="../../_references.ts"/>

module powerbi.visuals.samples {
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;
    import createClassAndSelector = jsCommon.CssConstants.createClassAndSelector;

    import PixelConverter = jsCommon.PixelConverter;

    export interface SlicerXConstructorOptions {
        behavior?: SlicerXWebBehavior;
    }

    export interface SlicerXData {
        categorySourceName: string;
        formatString: string;
        slicerDataPoints: SlicerXDataPoint[];
        slicerSettings: SlicerXSettings;
        hasSelectionOverride?: boolean;
    }

    export interface SlicerXDataPoint extends SelectableDataPoint {
        category?: string;
        value?: number;
        mouseOver?: boolean;
        mouseOut?: boolean;
        isSelectAllDataPoint?: boolean;
        imageURL?: string;
        selectable?: boolean;
    }

    export interface SlicerXSettings {
        general: {
            horizontal: boolean;
            columns: number;
            multiselect: boolean;
            showdisabled: string;
        };
        margin: IMargin;
        header: {
            borderBottomWidth: number;
            show: boolean;
            outline: string;
            fontColor: string;
            background: string;
            textSize: number;
            outlineColor: string;
            outlineWeight: number;
            title: string;
        };
        headerText: {
            marginLeft: number;
            marginTop: number;
        };
        slicerText: {
            textSize: number;
            height: number;
            width: number;
            fontColor: string;
            hoverColor: string;
            selectedColor: string;
            unselectedColor: string;
            disabledColor: string;
            marginLeft: number;
            outline: string;
            background: string;
            outlineColor: string;
            outlineWeight: number;
        };
        slicerItemContainer: {
            marginTop: number;
            marginLeft: number;
        };
        images: {
            imageSplit: number;
            stretchImage: boolean;
            bottomImage: boolean;
        };
    }

    export class SlicerX implements IVisual {
        private element: JQuery;
        private currentViewport: IViewport;
        private dataView: DataView;
        private slicerHeader: D3.Selection;
        private slicerBody: D3.Selection;
        private tableView: ITableView;
        private slicerData: SlicerXData;
        private settings: SlicerXSettings;
        private interactivityService: IInteractivityService;
        private behavior: SlicerXWebBehavior;
        private hostServices: IVisualHostServices;
        private waitingForData: boolean;
        private textProperties: TextProperties = {
            'fontFamily': 'wf_segoe-ui_normal, helvetica, arial, sans-serif',
            'fontSize': '14px',
        };

        private static ItemContainer: ClassAndSelector = createClassAndSelector('slicerItemContainer');
        private static HeaderText: ClassAndSelector = createClassAndSelector('headerText');
        private static Container: ClassAndSelector = createClassAndSelector('slicerX');
        private static LabelText: ClassAndSelector = createClassAndSelector('slicerText');
        private static Header: ClassAndSelector = createClassAndSelector('slicerHeader');
        private static Input: ClassAndSelector = createClassAndSelector('slicerCheckbox');
        private static Clear: ClassAndSelector = createClassAndSelector('clear');
        private static Body: ClassAndSelector = createClassAndSelector('slicerBody');

        public static DefaultStyleProperties(): SlicerXSettings {
            return {
                general: {
                    horizontal: false,
                    columns: 0,
                    //  sortorder: 'ASC',
                    multiselect: true,
                    showdisabled: 'In-Place'
                },
                margin: {
                    top: 50,
                    bottom: 50,
                    right: 50,
                    left: 50
                },
                header: {
                    borderBottomWidth: 1,
                    show: true,
                    outline: 'BottomOnly',
                    fontColor: '#000000',
                    background: '#ffffff',
                    textSize: 20,
                    outlineColor: '#000000',
                    outlineWeight: 1,
                    title: '',
                },
                headerText: {
                    marginLeft: 8,
                    marginTop: 0
                },
                slicerText: {
                    textSize: 15,
                    height: 100,
                    width: 0,
                    fontColor: '#666666',
                    hoverColor: '#212121',
                    selectedColor: '#BDD7EE',
                    unselectedColor: '#ffffff',
                    disabledColor: 'grey',
                    marginLeft: 8,
                    outline: 'Frame',
                    background: '#ffffff',
                    outlineColor: '#000000',
                    outlineWeight: 1,

                },
                slicerItemContainer: {
                    // The margin is assigned in the less file. This is needed for the height calculations.
                    marginTop: 5,
                    marginLeft: 0,
                },
                images: {
                    imageSplit: 80,
                    stretchImage: false,
                    bottomImage: false
                }
            };
        }

        constructor(options?: SlicerXConstructorOptions) {
            if (options) {
                if (options.behavior) {
                    this.behavior = options.behavior;
                }
            }
        }

        public static converter(dataView: DataView, localizedSelectAllText: string, interactivityService: IInteractivityService): SlicerXData {
            if (!dataView ||
                !dataView.categorical ||
                !dataView.categorical.categories ||
                (dataView.categorical.categories.length < 1)) {
                return;
            }
            let converter = new SlicerXConverter(dataView, interactivityService);
            converter.convert();
            let slicerData: SlicerXData;
            let defaultSettings = this.DefaultStyleProperties();
            let objects = dataView.metadata.objects;
            if (objects) {
                defaultSettings.general.horizontal = DataViewObjects.getValue<boolean>(objects, slicerXProps.general.horizontal, defaultSettings.general.horizontal);
                defaultSettings.general.columns = DataViewObjects.getValue<number>(objects, slicerXProps.general.columns, defaultSettings.general.columns);
                defaultSettings.general.multiselect = DataViewObjects.getValue<boolean>(objects, slicerXProps.general.multiselect, defaultSettings.general.multiselect);
                defaultSettings.general.showdisabled = DataViewObjects.getValue<string>(objects, slicerXProps.general.showdisabled, defaultSettings.general.showdisabled);

                defaultSettings.header.show = DataViewObjects.getValue<boolean>(objects, slicerXProps.header.show, defaultSettings.header.show);
                defaultSettings.header.title = DataViewObjects.getValue<string>(objects, slicerXProps.header.title, defaultSettings.header.title);
                defaultSettings.header.fontColor = DataViewObjects.getFillColor(objects, slicerXProps.header.fontColor, defaultSettings.header.fontColor);
                defaultSettings.header.background = DataViewObjects.getFillColor(objects, slicerXProps.header.background, defaultSettings.header.background);
                defaultSettings.header.textSize = DataViewObjects.getValue<number>(objects, slicerXProps.header.textSize, defaultSettings.header.textSize);
                defaultSettings.header.outline = DataViewObjects.getValue<string>(objects, slicerXProps.header.outline, defaultSettings.header.outline);
                defaultSettings.header.outlineColor = DataViewObjects.getFillColor(objects, slicerXProps.header.outlineColor, defaultSettings.header.outlineColor);
                defaultSettings.header.outlineWeight = DataViewObjects.getValue<number>(objects, slicerXProps.header.outlineWeight, defaultSettings.header.outlineWeight);

                defaultSettings.slicerText.textSize = DataViewObjects.getValue<number>(objects, slicerXProps.rows.textSize, defaultSettings.slicerText.textSize);
                defaultSettings.slicerText.height = DataViewObjects.getValue<number>(objects, slicerXProps.rows.height, defaultSettings.slicerText.height);
                defaultSettings.slicerText.width = DataViewObjects.getValue<number>(objects, slicerXProps.rows.width, defaultSettings.slicerText.width);
                defaultSettings.slicerText.selectedColor = DataViewObjects.getFillColor(objects, slicerXProps.rows.selectedColor, defaultSettings.slicerText.selectedColor);
                defaultSettings.slicerText.unselectedColor = DataViewObjects.getFillColor(objects, slicerXProps.rows.unselectedColor, defaultSettings.slicerText.unselectedColor);
                defaultSettings.slicerText.disabledColor = DataViewObjects.getFillColor(objects, slicerXProps.rows.disabledColor, defaultSettings.slicerText.disabledColor);
                defaultSettings.slicerText.background = DataViewObjects.getFillColor(objects, slicerXProps.rows.background, defaultSettings.slicerText.background);
                defaultSettings.slicerText.fontColor = DataViewObjects.getFillColor(objects, slicerXProps.rows.fontColor, defaultSettings.slicerText.fontColor);
                defaultSettings.slicerText.outline = DataViewObjects.getValue<string>(objects, slicerXProps.rows.outline, defaultSettings.slicerText.outline);
                defaultSettings.slicerText.outlineColor = DataViewObjects.getFillColor(objects, slicerXProps.rows.outlineColor, defaultSettings.slicerText.outlineColor);
                defaultSettings.slicerText.outlineWeight = DataViewObjects.getValue<number>(objects, slicerXProps.rows.outlineWeight, defaultSettings.slicerText.outlineWeight);

                defaultSettings.images.imageSplit = DataViewObjects.getValue<number>(objects, slicerXProps.images.imageSplit, defaultSettings.images.imageSplit);
                defaultSettings.images.stretchImage = DataViewObjects.getValue<boolean>(objects, slicerXProps.images.stretchImage, defaultSettings.images.stretchImage);
                defaultSettings.images.bottomImage = DataViewObjects.getValue<boolean>(objects, slicerXProps.images.bottomImage, defaultSettings.images.bottomImage);
            }
            let categories = dataView.categorical.categories[0];

            slicerData = {
                categorySourceName: categories.source.displayName,
                formatString: valueFormatter.getFormatString(categories.source, slicerXProps.formatString),
                slicerSettings: defaultSettings,
                slicerDataPoints: converter.dataPoints,
            };

            // Override hasSelection if a objects contained more scopeIds than selections we found in the data
            slicerData.hasSelectionOverride = converter.hasSelectionOverride;

            return slicerData;
        }

        public init(options: VisualInitOptions): void {
            this.element = options.element;
            this.currentViewport = options.viewport;
            if (this.behavior) {
                this.interactivityService = createInteractivityService(options.host);
            }
            this.hostServices = options.host;
            this.settings = SlicerX.DefaultStyleProperties();

            this.initContainer();
        }

        public onDataChanged(options: VisualDataChangedOptions): void {
            if (!options.dataViews || !options.dataViews[0]) {
                return;
            }

            let dataView,
                dataViews = options.dataViews;

            let existingDataView = this.dataView;
            if (dataViews && dataViews.length > 0) {
                dataView = this.dataView = dataViews[0];
            }

            if (!dataView ||
                !dataView.categorical ||
                !dataView.categorical.values ||
                !dataView.categorical.values[0] ||
                !dataView.categorical.values[0].values) {
                return;
            }

            let resetScrollbarPosition = false;
            // Null check is needed here. If we don't check for null, selecting a value on loadMore event will evaluate the below condition to true and resets the scrollbar
            if (options.operationKind !== undefined) {
                resetScrollbarPosition = options.operationKind !== VisualDataChangeOperationKind.Append
                && !DataViewAnalysis.hasSameCategoryIdentity(existingDataView, this.dataView);
            }

            this.updateInternal(resetScrollbarPosition);
            this.waitingForData = false;
        }

        public update(visualUpdateOptions: VisualUpdateOptions) {
            if (!visualUpdateOptions ||
                !visualUpdateOptions.dataViews ||
                !visualUpdateOptions.dataViews[0] ||
                !visualUpdateOptions.viewport) {
                return;
            }

            this.dataView = visualUpdateOptions.dataViews[0];

            this.updateInternal(false);
        }

        public onResizing(finalViewport: IViewport): void {
            this.currentViewport = finalViewport;
            this.updateInternal(false /* resetScrollbarPosition */);
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            let data = this.slicerData;
            if (!data) {
                return;
            }

            let objectName = options.objectName;
            switch (objectName) {
                case 'rows':
                    return this.enumerateRows(data);
                case 'header':
                    return this.enumerateHeader(data);
                case 'general':
                    return this.enumerateGeneral(data);
                case 'images':
                    return this.enumerateImages(data);
            }
        }

        private enumerateHeader(data: SlicerXData): VisualObjectInstance[] {
            let slicerSettings = this.settings;
            return [{
                selector: null,
                objectName: 'header',
                properties: {
                    show: slicerSettings.header.show,
                    title: slicerSettings.header.title,
                    fontColor: slicerSettings.header.fontColor,
                    background: slicerSettings.header.background,
                    textSize: slicerSettings.header.textSize,
                    outline: slicerSettings.header.outline,
                    outlineColor: slicerSettings.header.outlineColor,
                    outlineWeight: slicerSettings.header.outlineWeight
                }
            }];
        }

        private enumerateRows(data: SlicerXData): VisualObjectInstance[] {
            let slicerSettings = this.settings;
            return [{
                selector: null,
                objectName: 'rows',
                properties: {
                    textSize: slicerSettings.slicerText.textSize,
                    height: slicerSettings.slicerText.height,
                    width: slicerSettings.slicerText.width,
                    background: slicerSettings.slicerText.background,
                    selectedColor: slicerSettings.slicerText.selectedColor,
                    unselectedColor: slicerSettings.slicerText.unselectedColor,
                    disabledColor: slicerSettings.slicerText.disabledColor,
                    outline: slicerSettings.slicerText.outline,
                    outlineColor: slicerSettings.slicerText.outlineColor,
                    outlineWeight: slicerSettings.slicerText.outlineWeight,
                    fontColor: slicerSettings.slicerText.fontColor,
                }
            }];
        }

        private enumerateGeneral(data: SlicerXData): VisualObjectInstance[] {
            let slicerSettings = this.settings;

            return [{
                selector: null,
                objectName: 'general',
                properties: {
                    horizontal: slicerSettings.general.horizontal,
                    columns: slicerSettings.general.columns,
                    //sortorder: slicerSettings.general.sortorder,
                    multiselect: slicerSettings.general.multiselect,
                    showdisabled: slicerSettings.general.showdisabled,
                }
            }];
        }

        private enumerateImages(data: SlicerXData): VisualObjectInstance[] {
            let slicerSettings = this.settings;
            return [{
                selector: null,
                objectName: 'images',
                properties: {
                    imageSplit: slicerSettings.images.imageSplit,
                    stretchImage: slicerSettings.images.stretchImage,
                    bottomImage: slicerSettings.images.bottomImage,
                }
            }];
        }
        private mergeDatasets(first: any[], second: any[]): any[] {
            let settings = this.settings;
            let secondSet = d3.set();
            second.forEach((d) => {
                secondSet.add(d.identity ? d.identity.getKey() : d.data.identity.getKey());
            });

            let onlyFirstItems = first.filter((d) => {
                return !secondSet.has(d.identity ? d.identity.getKey() : d.data.identity.getKey());
            });

            let onlyFirst = onlyFirstItems.map((d) => {
                let derived = d;
                derived.selectable = false;
                return derived;
            });
            if (settings.general.showdisabled.toLocaleLowerCase().trim() === 'bottom') {
                return d3.merge([second, onlyFirst]);
            }
            else {
                let merged = d3.merge([second, []]);
                let onlyFirstIndexes = first.map((d, index) => {
                    return !secondSet.has(d.identity ? d.identity.getKey() : d.data.identity.getKey()) ? index : null;
                }).filter((d) => d !== null);
                for (let i = 0; i < onlyFirst.length; i++) {
                    merged.splice(onlyFirstIndexes[i], 0, onlyFirst[i]);
                }
                return merged;
            }
        }
        private updateInternal(resetScrollbarPosition: boolean) {
            this.updateSlicerBodyDimensions();

            let localizedSelectAllText = 'Select All';
            let data = SlicerX.converter(this.dataView, localizedSelectAllText, this.interactivityService);
            if (!data) {
                this.tableView.empty();
                return;
            }

            data.slicerSettings.header.outlineWeight = data.slicerSettings.header.outlineWeight < 0 ? 0 : data.slicerSettings.header.outlineWeight;
            // if(this.slicerData){
            let existingPoints = this.slicerData ? this.slicerData.slicerDataPoints : [];
            let newPoints = data.slicerDataPoints;
            let mergedPoints = this.mergeDatasets(existingPoints, newPoints);
            //  }
            this.slicerData = data;
            this.slicerData.slicerDataPoints = mergedPoints;
            this.settings = this.slicerData.slicerSettings;
            this.tableView
                .viewport(this.getSlicerBodyViewport(this.currentViewport))
                .rowHeight(this.settings.slicerText.height)
                .columnWidth(this.settings.slicerText.width)
                .rows(this.settings.general.horizontal ? 1 : 0)
                .columns(this.settings.general.columns)
                .data(
                data.slicerDataPoints,
                (d: SlicerXDataPoint) => $.inArray(d, data.slicerDataPoints),
                resetScrollbarPosition
                );
        }

        private initContainer() {
            let settings = this.settings;
            let slicerBodyViewport = this.getSlicerBodyViewport(this.currentViewport);
            let slicerContainer: D3.Selection = d3.select(this.element.get(0))
                .append('div')
                .classed(SlicerX.Container.class, true);

            this.slicerHeader = slicerContainer
                .append('div')
                .classed(SlicerX.Header.class, true);

            this.slicerHeader
                .append('span')
                .classed(SlicerX.Clear.class, true)
                .attr('title', 'Clear');

            this.slicerHeader
                .append('div')
                .classed(SlicerX.HeaderText.class, true)
                .style({
                    'margin-left': PixelConverter.toString(settings.headerText.marginLeft),
                    'margin-top': PixelConverter.toString(settings.headerText.marginTop),
                    'border-style': this.getBorderStyle(settings.header.outline),
                    'border-color': settings.header.outlineColor,
                    'border-width': this.getBorderWidth(settings.header.outline, settings.header.outlineWeight),
                    'font-size': PixelConverter.fromPoint(settings.header.textSize),
                });

            this.slicerBody = slicerContainer
                .append('div').classed(SlicerX.Body.class, true)
                .classed('slicerBody-horizontal', settings.general.horizontal)
                .style({
                    'height': PixelConverter.toString(slicerBodyViewport.height),
                    'width': PixelConverter.toString(slicerBodyViewport.width),
                });

            let rowEnter = (rowSelection: D3.Selection) => {
                let settings = this.settings;
                let listItemElement = rowSelection.append('li')
                    .classed(SlicerX.ItemContainer.class, true)
                    .style({
                        'margin-left': PixelConverter.toString(settings.slicerItemContainer.marginLeft),
                    });

                listItemElement.append('div')
                    .classed('slicer-img-wrapper', true);

                listItemElement.append('div')
                    .classed('slicer-text-wrapper', true)
                    .append('span')
                    .classed(SlicerX.LabelText.class, true)
                    .style({
                        // 'width': settings.general.horizontal === true ? labelWidth : 'auto',
                        'font-size': PixelConverter.fromPoint(settings.slicerText.textSize),
                    });
            };

            let rowUpdate = (rowSelection: D3.Selection) => {
                let settings = this.settings;
                let data = this.slicerData;
                if (data && settings) {
                    //  if (settings.header.show) {
                    this.slicerHeader.classed('hidden', !settings.header.show);
                    // this.slicerHeader.style('display', 'block');
                    this.slicerHeader.select(SlicerX.HeaderText.selector)
                        .text(settings.header.title.trim() !== "" ? settings.header.title.trim() : this.slicerData.categorySourceName)
                        .style({
                            'border-style': this.getBorderStyle(settings.header.outline),
                            'border-color': settings.header.outlineColor,
                            'border-width': this.getBorderWidth(settings.header.outline, settings.header.outlineWeight),
                            'color': settings.header.fontColor,
                            'background-color': settings.header.background,
                            'font-size': PixelConverter.fromPoint(settings.header.textSize),
                        });
                    //  }
                    //  else {
                    //     this.slicerHeader.classed('hidden', true);
                    //  }

                    let slicerText = rowSelection.selectAll(SlicerX.LabelText.selector);

                    let formatString = data.formatString;
                    slicerText.text((d: SlicerXDataPoint) => valueFormatter.format(d.category, formatString));

                    let slicerImg = rowSelection.selectAll('.slicer-img-wrapper');
                    slicerImg
                        .style('flex-grow', settings.images.imageSplit)
                        .style('background-image', (d: SlicerXDataPoint) => {
                            return d.imageURL ? `url(${d.imageURL})` : '';
                        })
                        .classed('hidden', (d: SlicerXDataPoint) => {
                            if (!(d.imageURL)) {
                                return true;
                            }
                            if (settings.images.imageSplit < 10) {
                                return true;
                            }
                        })
                        .style('display', (d: SlicerXDataPoint) => (d.imageURL) ? 'flex' : 'none')
                        .classed('stretchImage', settings.images.stretchImage)
                        .classed('bottomImage', settings.images.bottomImage);

                    rowSelection.selectAll('.slicer-text-wrapper')
                        .style('flex-grow', (d: SlicerXDataPoint) => {
                            return d.imageURL ? (100 - settings.images.imageSplit) : 100;
                        })
                        .classed('hidden', (d: SlicerXDataPoint) => {
                            if (settings.images.imageSplit > 90) {
                                return true;
                            }
                        });

                    rowSelection.style({
                        'color': settings.slicerText.fontColor,
                        'border-style': this.getBorderStyle(settings.slicerText.outline),
                        'border-color': settings.slicerText.outlineColor,
                        'border-width': this.getBorderWidth(settings.slicerText.outline, settings.slicerText.outlineWeight),
                        'font-size': PixelConverter.fromPoint(settings.slicerText.textSize),
                    });
                    rowSelection.style('display', (d: SlicerXDataPoint) => (d.selectable || settings.general.showdisabled.toLocaleLowerCase().trim() !== 'hide') ? 'inline-block' : 'none');
                    this.slicerBody.style('background-color', settings.slicerText.background);

                    if (this.interactivityService && this.slicerBody) {
                        let slicerBody = this.slicerBody.attr('width', this.currentViewport.width);
                        let slicerItemContainers = slicerBody.selectAll(SlicerX.ItemContainer.selector);
                        let slicerItemLabels = slicerBody.selectAll(SlicerX.LabelText.selector);
                        let slicerItemInputs = slicerBody.selectAll(SlicerX.Input.selector);
                        let slicerClear = this.slicerHeader.select(SlicerX.Clear.selector);

                        let behaviorOptions: SlicerXBehaviorOptions = {
                            dataPoints: data.slicerDataPoints,
                            slicerItemContainers: slicerItemContainers,
                            slicerItemLabels: slicerItemLabels,
                            slicerItemInputs: slicerItemInputs,
                            slicerClear: slicerClear,
                            interactivityService: this.interactivityService,
                            slicerSettings: data.slicerSettings,
                        };

                        this.interactivityService.bind(data.slicerDataPoints, this.behavior, behaviorOptions, {
                            overrideSelectionFromData: true,
                            hasSelectionOverride: data.hasSelectionOverride
                        });
                        this.behavior.styleSlicerInputs(rowSelection.select(SlicerX.ItemContainer.selector),
                            this.interactivityService.hasSelection());
                    }
                    else {
                        this.behavior.styleSlicerInputs(rowSelection.select(SlicerX.ItemContainer.selector), false);
                    }
                }
            };

            let rowExit = (rowSelection: D3.Selection) => {
                rowSelection.remove();
            };

            let tableViewOptions: TableViewViewOptions = {
                rowHeight: this.getRowHeight(),
                columnWidth: this.settings.slicerText.width,
                rows: this.settings.general.horizontal ? 1 : 0,
                columns: this.settings.general.columns,
                enter: rowEnter,
                exit: rowExit,
                update: rowUpdate,
                loadMoreData: () => this.onLoadMoreData(),
                scrollEnabled: true,
                viewport: this.getSlicerBodyViewport(this.currentViewport),
                baseContainer: this.slicerBody,
            };

            this.tableView = TableViewFactory.createTableView(tableViewOptions);
        }

        private onLoadMoreData(): void {
            if (!this.waitingForData && this.dataView.metadata && this.dataView.metadata.segment) {
                this.hostServices.loadMoreData();
                this.waitingForData = true;
            }
        }

        private getSlicerBodyViewport(currentViewport: IViewport): IViewport {
            let settings = this.settings;
            let headerHeight = (settings.header.show) ? this.getHeaderHeight() : 0;
            let slicerBodyHeight = currentViewport.height - (headerHeight + settings.header.borderBottomWidth);
            return {
                height: slicerBodyHeight,
                width: currentViewport.width
            };
        }

        private updateSlicerBodyDimensions(): void {
            let slicerViewport = this.getSlicerBodyViewport(this.currentViewport);
            this.slicerBody
                .style({
                    'height': PixelConverter.toString(slicerViewport.height),
                    'width': PixelConverter.toString(slicerViewport.width),
                });
        }

        private getTextProperties(textSize: number): TextProperties {
            this.textProperties.fontSize = PixelConverter.fromPoint(textSize);
            return this.textProperties;
        }

        private getHeaderHeight(): number {
            return TextMeasurementService.estimateSvgTextHeight(
                this.getTextProperties(this.settings.header.textSize)
            );
        }

        private getRowHeight(): number {
            let textSettings = this.settings.slicerText;
            return textSettings.height !== 0 ? textSettings.height : TextMeasurementService.estimateSvgTextHeight(
                this.getTextProperties(textSettings.textSize)
            );
        }

        private getBorderStyle(outlineElement: string): string {
            return outlineElement === '0px' ? 'none' : 'solid';
        }

        private getBorderWidth(outlineElement: string, outlineWeight: number): string {
            switch (outlineElement) {
                case 'None':
                    return '0px';
                case 'BottomOnly':
                    return '0px 0px ' + outlineWeight + 'px 0px';
                case 'TopOnly':
                    return outlineWeight + 'px 0px 0px 0px';
                case 'TopBottom':
                    return outlineWeight + 'px 0px ' + outlineWeight + 'px 0px';
                case 'LeftRight':
                    return '0px ' + outlineWeight + 'px 0px ' + outlineWeight + 'px';
                case 'Frame':
                    return outlineWeight + 'px';
                default:
                    return outlineElement.replace("1", outlineWeight.toString());
            }
        }
    }
}