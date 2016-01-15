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
    type BoxPlotTrace = { y: number[], x: string[], name: string, type: string, boxmean: string };
    type PlotlyBoxPlotViewModel = Array<BoxPlotTrace>;

    interface CategoryMap {
        [category: string]: { series: string[], ys: number[] };
    }

    export class PlotlyBoxPlot implements IVisual {
        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: 'Category',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: data.createDisplayNameGetter('Role_DisplayName_Axis'),
                    description: data.createDisplayNameGetter('Role_DisplayName_AxisDescription')
                }, {
                    name: 'Series',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: data.createDisplayNameGetter('Role_DisplayName_Legend'),
                    description: data.createDisplayNameGetter('Role_DisplayName_LegendDescription')
                }, {
                    name: 'Y',
                    kind: VisualDataRoleKind.Measure,
                    displayName: data.createDisplayNameGetter('Role_DisplayName_Value'),
                }
            ],
            dataViewMappings: [{
                conditions: [
                    { 'Category': { max: 1 }, 'Series': { max: 1 }, 'Y': { max: 1 } }
                ],
                table: {
                    rows: {
                        select: [
                            { bind: { to: 'Category' } },
                            { bind: { to: 'Series' } },
                            { bind: { to: 'Y' } },
                        ]
                    },
                    rowCount: { preferred: { min: 1 } }
                },
            }],
        };

        private element: JQuery;
        private firstUpdate: boolean = true;

        public init(options: VisualInitOptions): void {
            this.element = options.element;
        }

        public update(options: VisualUpdateOptions) {
            const divElement = <HTMLDivElement>this.element[0];

            const dataViews = options.dataViews;
            if (!dataViews || dataViews.length === 0)
                return;

            if (!dataViews[0].table)
                return;

            const viewModel = PlotlyBoxPlot.converter(dataViews[0].table);

            if (!viewModel)
                return;

            // the div does not seem to resize when viewport changes
            this.element.height(options.viewport.height + 'px');
            this.element.width(options.viewport.width + 'px');

            // TODO: handle changes in all VisualUpdateOptions properties
            if (this.firstUpdate) {
                // first update
                const data = viewModel;
                const layout = {
                    margin: {
                        l: 10,
                        r: 10,
                        t: 10,
                        b: 30
                    },
                    autosize: true,
                    boxmode: 'group'
                };

                Plotly.plot(divElement, data, layout, { displayModeBar: false });
                Plotly.Plots.resize(divElement);

                this.firstUpdate = false;
            } else if (!_.isEqual(viewModel, divElement['data'])) {
                // data changed

                divElement['data'] = viewModel;

                Plotly.redraw(divElement);
            } else {
                // resize 

                Plotly.Plots.resize(divElement);
            }
        }

        public destroy() {
        }

        private static converter(table: DataViewTable): PlotlyBoxPlotViewModel {

            if (!table || !table.rows || table.rows.length === 0) {
                return null;
            }

            const categoryMap: CategoryMap = {};

            for (let i = 0; i < table.rows.length; i++) {
                // TODO: handle case when there is no series
                if (table.rows[i].length !== 3) {
                    return null;
                }

                const category = table.rows[i][0];
                const series = table.rows[i][1];
                const y = table.rows[i][2];

                let categoryMapValue = categoryMap[category];
                if (!categoryMapValue) {
                    categoryMap[category] = categoryMapValue = { series: [], ys:[] };
                }

                categoryMapValue.series.push(series);
                categoryMapValue.ys.push(y);
            }

            return Object.keys(categoryMap).map(category => {
                return {
                    y: categoryMap[category].ys,
                    x: categoryMap[category].series,
                    name: category,
                    type: 'box',
                    boxmean: 'sd'
                };
            });
        }
    }
}