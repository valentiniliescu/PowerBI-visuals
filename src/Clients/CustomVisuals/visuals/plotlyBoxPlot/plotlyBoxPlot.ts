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
    interface PlotlyBoxPlotViewModel extends Array<{ y: number[], x: string[], name: string, type: string, boxmean: string }>{
        
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
                    { 'Category': { max: 1 }, 'Series': { min: 1, max: 1 }, 'Y': { max: 1 } }
                ],
                categorical: {
                    categories: {
                        for: { in: 'Category' },
                        dataReductionAlgorithm: { top: {} }
                    },
                    values: {
                        group: {
                            by: 'Series',
                            select: [{ for: { in: 'Y' } }],
                            dataReductionAlgorithm: { top: {} }
                        }
                    },
                    rowCount: { preferred: { min: 2 }, supported: { min: 0 } }
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

            if (!dataViews[0].categorical)
                return;

            const viewModel = PlotlyBoxPlot.converter(dataViews[0].categorical);

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

        private static converter(categorical: DataViewCategorical): PlotlyBoxPlotViewModel {

            var x = ['day 1', 'day 1', 'day 1', 'day 1', 'day 1', 'day 1',
                'day 2', 'day 2', 'day 2', 'day 2', 'day 2', 'day 2'];

            var trace1 = {
                y: [0.2, 0.2, 0.6, 1.0, 0.5, 0.4, 0.2, 0.7, 0.9, 0.1, 0.5, 0.3],
                x: x,
                name: 'kale',
                type: 'box',
                boxmean: 'sd'
            };

            var trace2 = {
                y: [0.6, 0.7, 0.3, 0.6, 0.0, 0.5, 0.7, 0.9, 0.5, 0.8, 0.7, 0.2],
                x: x,
                name: 'radishes',
                type: 'box',
                boxmean: 'sd'
            };

            var trace3 = {
                y: [0.1, 0.3, 0.1, 0.9, 0.6, 0.6, 0.9, 1.0, 0.3, 0.6, 0.8, 0.5],
                x: x,
                name: 'carrots',
                type: 'box',
                boxmean: 'sd'
            };

            return [trace1, trace2, trace3];

        }
    }
}