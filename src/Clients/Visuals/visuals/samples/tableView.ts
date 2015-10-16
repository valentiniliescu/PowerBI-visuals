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

    export interface ITableView {
        data(data: any[], dataIdFunction: (d) => {}, dataAppended: boolean): ITableView;
        rowHeight(rowHeight: number): ITableView;
        columnWidth(columnWidth: number): ITableView;
        rows(rows: number): ITableView;
        columns(columns: number): ITableView;
        viewport(viewport: IViewport): ITableView;
        render(): void;
        empty(): void;
    }

    export module TableViewFactory {
        export function createTableView(options): ITableView {
            return new TableView(options);
        }
    }

    export interface TableViewViewOptions {
        enter: (selection: D3.Selection) => void;
        exit: (selection: D3.Selection) => void;
        update: (selection: D3.Selection) => void;
        loadMoreData: () => void;
        baseContainer: D3.Selection;
        rowHeight: number;
        columnWidth: number;
        rows: number;
        columns: number;
        viewport: IViewport;
        scrollEnabled: boolean;
    }

    /**
     * A UI Virtualized List, that uses the D3 Enter, Update & Exit pattern to update rows.
     * It can create lists containing either HTML or SVG elements.
     */
    class TableView implements ITableView {
        private getDatumIndex: (d: any) => {};
        private _data: any[];
        private _totalRows: number;
        private _totalColumns: number;

        private options: TableViewViewOptions;
        private visibleGroupContainer: D3.Selection;
        private scrollContainer: D3.Selection;
        private cancelMeasurePass: () => void;
        private renderTimeoutId: number;
        
        /**
         * The value indicates the percentage of data already shown
         * in the list view that triggers a loadMoreData call.
         */
        private static loadMoreDataThreshold = 0.8;
        private static defaultRowHeight = 1;
        private static defaultColumnWidth = 0;
        private static defaultRows = 0;
        private static defaultColumns = 1;

        private static marginLeft = 5;
        private static marginRight = 15;
        private static paddingLeft = 5;
        private static paddingRight = 5;

        public constructor(options: TableViewViewOptions) {
            // make a copy of options so that it is not modified later by caller
            this.options = $.extend(true, {}, options);

            this.options.baseContainer
                .style('overflow-y', 'auto');
            //.on('scroll', () => this.renderImpl(this.options.rowHeight, this.options.columnWidth));
            this.scrollContainer = options.baseContainer
                .append('div')
                .attr('class', 'scrollRegion');
            this.visibleGroupContainer = this.scrollContainer
                .append('div')
                .attr('class', 'visibleGroup');

            TableView.SetDefaultOptions(options);
        }

        private static SetDefaultOptions(options: TableViewViewOptions) {
            options.rowHeight = options.rowHeight || TableView.defaultRowHeight;
            options.rows = options.rows || TableView.defaultRows;
            options.columns = options.columns || TableView.defaultColumns;
        }

        public rowHeight(rowHeight: number): TableView {
            this.options.rowHeight = Math.ceil(rowHeight);
            return this;
        }
        public columnWidth(columnWidth: number): TableView {
            this.options.columnWidth = Math.ceil(columnWidth);
            return this;
        }

        public rows(rows: number): TableView {
            this.options.rows = Math.ceil(rows);
            return this;
        }

        public columns(columns: number): TableView {
            this.options.columns = Math.ceil(columns);
            return this;
        }

        public data(data: any[], getDatumIndex: (d) => {}, dataReset: boolean = false): ITableView {
            this._data = data;
            this.getDatumIndex = getDatumIndex;
            this.setTotalRows();
            if (dataReset) {
                $(this.options.baseContainer.node()).scrollTop(0);
            }
            this.render();
            return this;
        }

        public viewport(viewport: IViewport): ITableView {
            this.options.viewport = viewport;
            this.render();
            return this;
        }

        public empty(): void {
            this._data = [];
            this.render();
        }

        public render(): void {
            if (this.renderTimeoutId) {
                window.clearTimeout(this.renderTimeoutId);
            }

            this.renderTimeoutId = window.setTimeout(() => {
                this.getRowHeight().then((rowHeight: number, columnWidth: number) => {
                    this.renderImpl(rowHeight, columnWidth);
                });
                this.renderTimeoutId = undefined;
            }, 0);
        }

        private renderImpl(rowHeight: number, columnWidth: number): void {
            let totalHeight = this.options.scrollEnabled ? Math.max(0, (this._totalRows * (rowHeight + 5))) : this.options.viewport.height;
            let totalWidth = this.options.scrollEnabled ? Math.max(0, (this._totalColumns * (columnWidth + 10))) : this.options.viewport.width;
            this.scrollContainer
                .style({
                    'min-height': totalHeight + "px",
                    'width': totalWidth + "px"
                })
                .attr('min-height', totalHeight)
                .attr('width', totalWidth);
            this.scrollToFrame(true);
        }

        private scrollToFrame(loadMoreData: boolean): void {
            let options = this.options;
            let visibleGroupContainer = this.visibleGroupContainer;
            let totalRows = this._totalRows;
            let rowHeight = options.rowHeight || TableView.defaultRowHeight;
            let visibleRows = this.getVisibleRows() || 1;
            let scrollTop: number = options.baseContainer.node().scrollTop;
            let scrollPosition = (scrollTop === 0) ? 0 : Math.floor(scrollTop / rowHeight);

            let position0 = Math.max(0, Math.min(scrollPosition, totalRows - visibleRows + 1)) * this._totalColumns,
                position1 = (position0 + visibleRows) * this._totalColumns;

            let groupedData: any[] = [];
            for (let i = 0; i < this._data.length; i += this._totalColumns) {
                groupedData.push(this._data.slice(i, i + this._totalColumns));
            };

            visibleGroupContainer.selectAll(".row").remove();
            let cellSelection = visibleGroupContainer.selectAll(".row")
                .data(groupedData)
                .enter()
                .append("div")
                .classed('row', true)
                .selectAll(".cell")
                .data(d => d);

            cellSelection
                .enter()
                .append('div')
                .classed('cell', true)
                .call(d => options.enter(d));
            cellSelection.order();

            let cellUpdateSelection = visibleGroupContainer.selectAll('.cell:not(.transitioning)');

            cellUpdateSelection.call(d => options.update(d));

            cellUpdateSelection.style({
                'margin-left': TableView.marginLeft + 'px',
                'width': (options.columnWidth > 0) ? options.columnWidth + 'px' :
                    (options.viewport.width / this._totalColumns - TableView.marginLeft - TableView.marginRight - TableView.paddingLeft - TableView.paddingRight) + 'px'
            });
            cellUpdateSelection.style({ 'height': (options.rowHeight > 0) ? options.rowHeight + 'px' : 'auto' });
            cellSelection
                .exit()
                .call(d => options.exit(d))
                .remove();

            if (loadMoreData && visibleRows !== totalRows && position1 >= totalRows * TableView.loadMoreDataThreshold)
                options.loadMoreData();
        }

        private setTotalRows(): void {
            let data = this._data;
            let options = this.options;
            this._totalColumns = options.rows > 0 ? (data.length / options.rows) : (options.columns ? options.columns : 1);
            this._totalRows = options.rows > 0 ? options.rows : data ? data.length / this._totalColumns : 0;

        }

        private getVisibleRows(): number {
            let minimumVisibleRows = 1;
            let rowHeight = this.options.rowHeight;
            let viewportHeight = this.options.viewport.height;

            if (!rowHeight || rowHeight < 1) {
                return minimumVisibleRows;
            }

            if (this.options.scrollEnabled)
                return Math.min(Math.ceil(viewportHeight / rowHeight) + 1, this._totalRows) || minimumVisibleRows;

            return Math.min(Math.floor(viewportHeight / rowHeight), this._totalRows) || minimumVisibleRows;
        }

        private getRowHeight(): JQueryPromise<number> {
            let deferred = $.Deferred<number>();
            let listView = this;
            let options = listView.options;
            if (this.cancelMeasurePass)
                this.cancelMeasurePass();

            // if there is no data, resolve and return
            if (!(this._data && this._data.length && options)) {
                listView.rowHeight(TableView.defaultRowHeight);
                listView.columnWidth(TableView.defaultColumnWidth);
                return deferred.resolve(options.rowHeight, options.columnWidth).promise();
            }

            //render the first item to calculate the row height
            this.scrollToFrame(false /*loadMoreData*/);
            let requestAnimationFrameId = window.requestAnimationFrame(() => {
                //measure row height
                let firstRow = listView.visibleGroupContainer.select(".cell").node();
                let rowHeight: number = $(firstRow).outerHeight(true);
                let columnWidth: number = $(firstRow).outerWidth(true);
                listView.rowHeight(options.rowHeight !== 0 ? options.rowHeight : rowHeight);
                listView.columnWidth(options.columnWidth !== 0 ? options.columnWidth : columnWidth);
                deferred.resolve(rowHeight, columnWidth);
                listView.cancelMeasurePass = undefined;
                window.cancelAnimationFrame(requestAnimationFrameId);
            });

            this.cancelMeasurePass = () => {
                window.cancelAnimationFrame(requestAnimationFrameId);
                deferred.reject();
            };

            return deferred.promise();
        }
    }
}
